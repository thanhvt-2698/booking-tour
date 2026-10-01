import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BookingStatus } from '../bookings/constants/booking.constants';
import { BookingStatusHistoryEntity } from '../bookings/entities/booking-status-history.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { DepartureStatus } from '../tours/constants/departure.constants';
import { TourDepartureEntity } from '../tours/entities/tour-departure.entity';
import {
  BOOKING_REMINDER_LEAD_HOURS,
  BOOKING_PENDING_EXPIRY_REASON,
  BOOKING_PENDING_TTL_HOURS_CONFIG_KEY,
  DEFAULT_BOOKING_PENDING_TTL_HOURS,
  DEFAULT_SCHEDULER_BATCH_SIZE,
  MILLISECONDS_PER_HOUR,
  SCHEDULER_BATCH_LOG_EVENT,
  SCHEDULER_BATCH_SIZE_CONFIG_KEY,
  SCHEDULER_BOOKING_EXPIRY_FAILURE_LOG_EVENT,
  SCHEDULER_BOOKING_LOCK_QUERY_FIELDS,
  SCHEDULER_COMPLETABLE_DEPARTURE_QUERY_FIELDS,
  SCHEDULER_DEPARTURE_LOCK_QUERY_FIELDS,
  SCHEDULER_OPEN_DEPARTURE_QUERY_FIELDS,
  SCHEDULER_PENDING_BOOKING_QUERY_FIELDS,
  SCHEDULER_REMINDER_ELIGIBLE_DEPARTURE_STATUSES,
  SCHEDULER_REMINDER_QUERY_FIELDS,
} from './constants/scheduler.constants';
import type { SchedulerRunSummary } from './interfaces/scheduler-run-summary.interface';

@Injectable()
export class SchedulerService {
  // The cursor gives one scheduler replica fair keyset paging; it is not a distributed lock.
  private reminderCursorBookingId: string | undefined;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(BookingEntity)
    private readonly bookingsRepository: Repository<BookingEntity>,
    @InjectRepository(TourDepartureEntity)
    private readonly departuresRepository: Repository<TourDepartureEntity>,
  ) {}

  async runDueJobs(now: Date = new Date()): Promise<SchedulerRunSummary> {
    const batchSize = this.getBatchSize();
    const pendingCutoff = new Date(
      now.getTime() - this.getPendingTtlHours() * MILLISECONDS_PER_HOUR,
    );
    const reminderWindowEnd = new Date(
      now.getTime() + BOOKING_REMINDER_LEAD_HOURS * MILLISECONDS_PER_HOUR,
    );

    const departuresClosed = await this.closeDueDepartures(now, batchSize);
    const departuresCompleted = await this.completeDepartedTrips(
      now,
      batchSize,
    );
    const bookingsExpired = await this.expirePendingBookings(
      pendingCutoff,
      batchSize,
    );
    const reminders = await this.submitUpcomingReminders(
      now,
      reminderWindowEnd,
      batchSize,
    );
    const notificationsDispatched =
      await this.notificationsService.dispatchPending(now);

    const summary: SchedulerRunSummary = {
      bookingsExpired: bookingsExpired.updated,
      bookingsFailedExpiry: bookingsExpired.failed,
      bookingsScannedForExpiry: bookingsExpired.scanned,
      departuresClosed: departuresClosed.updated,
      departuresScannedForClosure: departuresClosed.scanned,
      departuresCompleted: departuresCompleted.updated,
      departuresScannedForCompletion: departuresCompleted.scanned,
      notificationsDispatched,
      remindersScanned: reminders.scanned,
      remindersSubmitted: reminders.submitted,
    };

    Logger.log(
      {
        event: SCHEDULER_BATCH_LOG_EVENT,
        now: now.toISOString(),
        ...summary,
      },
      SchedulerService.name,
    );

    return summary;
  }

  private async closeDueDepartures(
    now: Date,
    batchSize: number,
  ): Promise<{ scanned: number; updated: number }> {
    const departures = await this.departuresRepository
      .createQueryBuilder('departure')
      .select(SCHEDULER_OPEN_DEPARTURE_QUERY_FIELDS)
      .where('departure.status = :openStatus', {
        openStatus: DepartureStatus.OPEN,
      })
      .andWhere(
        '(departure.bookingDeadline IS NOT NULL AND departure.bookingDeadline <= :now OR departure.startAt <= :now)',
        { now },
      )
      .orderBy('departure.id', 'ASC')
      .take(batchSize)
      .getMany();
    if (departures.length === 0) {
      return { scanned: 0, updated: 0 };
    }

    const departureIds = departures.map((departure) => departure.id);
    const result = await this.departuresRepository
      .createQueryBuilder()
      .update(TourDepartureEntity)
      .set({ status: DepartureStatus.CLOSED })
      .where('id IN (:...departureIds)', { departureIds })
      .andWhere('status = :openStatus', {
        openStatus: DepartureStatus.OPEN,
      })
      .andWhere(
        '(booking_deadline IS NOT NULL AND booking_deadline <= :now OR start_at <= :now)',
        { now },
      )
      .execute();

    return { scanned: departures.length, updated: result.affected ?? 0 };
  }

  private async completeDepartedTrips(
    now: Date,
    batchSize: number,
  ): Promise<{ scanned: number; updated: number }> {
    const eligibleStatuses = [DepartureStatus.OPEN, DepartureStatus.CLOSED];
    const departures = await this.departuresRepository
      .createQueryBuilder('departure')
      .select(SCHEDULER_COMPLETABLE_DEPARTURE_QUERY_FIELDS)
      .where('departure.status IN (:...eligibleStatuses)', {
        eligibleStatuses,
      })
      .andWhere('departure.endAt <= :now', { now })
      .orderBy('departure.id', 'ASC')
      .take(batchSize)
      .getMany();
    if (departures.length === 0) {
      return { scanned: 0, updated: 0 };
    }

    const departureIds = departures.map((departure) => departure.id);
    const result = await this.departuresRepository
      .createQueryBuilder()
      .update(TourDepartureEntity)
      .set({ status: DepartureStatus.COMPLETED })
      .where('id IN (:...departureIds)', { departureIds })
      .andWhere('status IN (:...eligibleStatuses)', { eligibleStatuses })
      .andWhere('end_at <= :now', { now })
      .execute();

    return { scanned: departures.length, updated: result.affected ?? 0 };
  }

  private async expirePendingBookings(
    cutoff: Date,
    batchSize: number,
  ): Promise<{ failed: number; scanned: number; updated: number }> {
    const bookings = await this.bookingsRepository
      .createQueryBuilder('booking')
      .select(SCHEDULER_PENDING_BOOKING_QUERY_FIELDS)
      .where('booking.status = :pendingStatus', {
        pendingStatus: BookingStatus.PENDING,
      })
      .andWhere('booking.createdAt <= :cutoff', { cutoff })
      .orderBy('booking.createdAt', 'ASC')
      .addOrderBy('booking.id', 'ASC')
      .take(batchSize)
      .getMany();

    let updated = 0;
    let failed = 0;
    for (const booking of bookings) {
      try {
        if (await this.expirePendingBooking(booking.id, cutoff)) {
          updated += 1;
        }
      } catch (error: unknown) {
        failed += 1;
        Logger.error(
          {
            bookingId: booking.id,
            errorName: error instanceof Error ? error.name : 'UnknownError',
            event: SCHEDULER_BOOKING_EXPIRY_FAILURE_LOG_EVENT,
          },
          undefined,
          SchedulerService.name,
        );
      }
    }

    return { failed, scanned: bookings.length, updated };
  }

  private async expirePendingBooking(
    bookingId: string,
    cutoff: Date,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const booking = await manager
        .getRepository(BookingEntity)
        .createQueryBuilder('booking')
        .setLock('pessimistic_write')
        .select(SCHEDULER_BOOKING_LOCK_QUERY_FIELDS)
        .where('booking.id = :bookingId', { bookingId })
        .getOne();

      if (
        !booking ||
        booking.status !== BookingStatus.PENDING ||
        booking.createdAt.getTime() > cutoff.getTime()
      ) {
        return false;
      }

      const departure = await manager
        .getRepository(TourDepartureEntity)
        .createQueryBuilder('departure')
        .setLock('pessimistic_write')
        .select(SCHEDULER_DEPARTURE_LOCK_QUERY_FIELDS)
        .where('departure.id = :departureId', {
          departureId: booking.departureId,
        })
        .getOne();

      if (!departure) {
        throw new NotFoundException('errors.departureNotFound');
      }
      if (departure.bookedSeats < booking.quantity) {
        throw new ConflictException('errors.bookingDepartureSeatInconsistent');
      }

      departure.bookedSeats -= booking.quantity;
      await manager.getRepository(TourDepartureEntity).save(departure);

      booking.cancelReason = BOOKING_PENDING_EXPIRY_REASON;
      booking.status = BookingStatus.CANCELLED;
      await manager.getRepository(BookingEntity).save(booking);
      await manager.getRepository(BookingStatusHistoryEntity).save(
        manager.getRepository(BookingStatusHistoryEntity).create({
          actorUserId: null,
          bookingId: booking.id,
          fromStatus: BookingStatus.PENDING,
          reason: BOOKING_PENDING_EXPIRY_REASON,
          toStatus: BookingStatus.CANCELLED,
        }),
      );

      return true;
    });
  }

  private async submitUpcomingReminders(
    now: Date,
    windowEnd: Date,
    batchSize: number,
  ): Promise<{ scanned: number; submitted: number }> {
    let bookings = await this.findUpcomingReminderBookings(
      now,
      windowEnd,
      batchSize,
      this.reminderCursorBookingId,
    );

    if (bookings.length === 0 && this.reminderCursorBookingId) {
      this.reminderCursorBookingId = undefined;
      bookings = await this.findUpcomingReminderBookings(
        now,
        windowEnd,
        batchSize,
      );
    }

    for (const booking of bookings) {
      await this.notificationsService.scheduleReminder(
        booking.id,
        booking.departure.startAt,
        now,
      );
    }

    if (bookings.length > 0) {
      this.reminderCursorBookingId = bookings[bookings.length - 1].id;
    }

    return { scanned: bookings.length, submitted: bookings.length };
  }

  private findUpcomingReminderBookings(
    now: Date,
    windowEnd: Date,
    batchSize: number,
    afterBookingId?: string,
  ): Promise<BookingEntity[]> {
    const query = this.bookingsRepository
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.departure', 'departure')
      .select(SCHEDULER_REMINDER_QUERY_FIELDS)
      .where('booking.status = :approvedStatus', {
        approvedStatus: BookingStatus.APPROVED,
      })
      .andWhere('departure.status IN (:...eligibleDepartureStatuses)', {
        eligibleDepartureStatuses:
          SCHEDULER_REMINDER_ELIGIBLE_DEPARTURE_STATUSES,
      })
      .andWhere('departure.startAt > :now', { now })
      .andWhere('departure.startAt <= :windowEnd', { windowEnd })
      .orderBy('booking.id', 'ASC')
      .take(batchSize);

    if (afterBookingId) {
      query.andWhere('booking.id > :afterBookingId', { afterBookingId });
    }

    return query.getMany();
  }

  private getBatchSize(): number {
    return (
      this.configService.get<number>(SCHEDULER_BATCH_SIZE_CONFIG_KEY) ??
      DEFAULT_SCHEDULER_BATCH_SIZE
    );
  }

  private getPendingTtlHours(): number {
    return (
      this.configService.get<number>(BOOKING_PENDING_TTL_HOURS_CONFIG_KEY) ??
      DEFAULT_BOOKING_PENDING_TTL_HOURS
    );
  }
}
