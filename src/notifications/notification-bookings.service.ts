import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { IsNull } from 'typeorm';
import { BookingStatus } from '../bookings/constants/booking.constants';
import { BookingEntity } from '../bookings/entities/booking.entity';
import {
  BOOKING_NOTIFICATION_ELIGIBLE_DEPARTURE_STATUSES,
  BOOKING_NOTIFICATION_OUTBOX_PENDING_QUERY_FIELDS,
  BOOKING_NOTIFICATION_OUTBOX_PROCESSOR_QUERY_FIELDS,
  BOOKING_NOTIFICATION_PROCESSOR_QUERY_FIELDS,
  BOOKING_NOTIFICATION_REMINDER_QUERY_FIELDS,
  BOOKING_NOTIFICATION_REMINDER_PROCESSOR_QUERY_FIELDS,
  BookingNotificationDeliveryStatus,
  BookingNotificationOutboxKind,
} from './constants/notification.constants';
import type { BookingNotificationDelivery } from './interfaces/booking-notification-delivery.interface';
import type { BookingNotificationRecipient } from './interfaces/booking-notification-recipient.interface';
import type { LegacyBookingStatusNotificationJob } from './interfaces/legacy-booking-status-notification-job.interface';
import type { CreateNotificationOutbox } from './interfaces/create-notification-outbox.interface';
import { BookingNotificationOutboxEntity } from './entities/booking-notification-outbox.entity';
import {
  createReminderNotificationOutboxDeduplicationKey,
  createStatusNotificationOutboxDeduplicationKey,
} from './notification-outbox.helpers';

@Injectable()
export class NotificationBookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingsRepository: Repository<BookingEntity>,
    @InjectRepository(BookingNotificationOutboxEntity)
    private readonly notificationOutboxRepository: Repository<BookingNotificationOutboxEntity>,
  ) {}

  async findDelivery(
    job: BookingNotificationRecipient,
  ): Promise<BookingNotificationDelivery | null> {
    const booking = await this.bookingsRepository
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.user', 'user')
      .select(BOOKING_NOTIFICATION_PROCESSOR_QUERY_FIELDS)
      .where('booking.id = :bookingId', { bookingId: job.bookingId })
      .andWhere('booking.user_id = :recipientUserId', {
        recipientUserId: job.recipientUserId,
      })
      .getOne();

    return booking
      ? {
          bookingCode: booking.bookingCode,
          recipientEmail: booking.user.email,
        }
      : null;
  }

  async findReminderRecipient(
    bookingId: string,
    startAt: Date,
    now: Date,
  ): Promise<BookingNotificationRecipient | null> {
    const booking = await this.bookingsRepository
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.departure', 'departure')
      .select(BOOKING_NOTIFICATION_REMINDER_QUERY_FIELDS)
      .where('booking.id = :bookingId', { bookingId })
      .andWhere('booking.status = :status', { status: BookingStatus.APPROVED })
      .andWhere('departure.start_at = :startAt', { startAt })
      .andWhere('departure.start_at > :now', { now })
      .andWhere('departure.status IN (:...statuses)', {
        statuses: BOOKING_NOTIFICATION_ELIGIBLE_DEPARTURE_STATUSES,
      })
      .getOne();

    return booking
      ? { bookingId: booking.id, recipientUserId: booking.userId }
      : null;
  }

  async findReminderDelivery(
    job: BookingNotificationRecipient,
    startAt: Date,
    now: Date,
  ): Promise<BookingNotificationDelivery | null> {
    const booking = await this.bookingsRepository
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.user', 'user')
      .innerJoinAndSelect('booking.departure', 'departure')
      .select(BOOKING_NOTIFICATION_REMINDER_PROCESSOR_QUERY_FIELDS)
      .where('booking.id = :bookingId', { bookingId: job.bookingId })
      .andWhere('booking.user_id = :recipientUserId', {
        recipientUserId: job.recipientUserId,
      })
      .andWhere('booking.status = :bookingStatus', {
        bookingStatus: BookingStatus.APPROVED,
      })
      .andWhere('departure.start_at = :startAt', { startAt })
      .andWhere('departure.start_at > :now', { now })
      .andWhere('departure.status IN (:...statuses)', {
        statuses: BOOKING_NOTIFICATION_ELIGIBLE_DEPARTURE_STATUSES,
      })
      .getOne();

    return booking
      ? {
          bookingCode: booking.bookingCode,
          recipientEmail: booking.user.email,
        }
      : null;
  }

  async createReminderOutbox(
    recipient: BookingNotificationRecipient,
    startAt: Date,
  ): Promise<void> {
    const input: CreateNotificationOutbox = {
      bookingId: recipient.bookingId,
      deduplicationKey: createReminderNotificationOutboxDeduplicationKey(
        recipient.bookingId,
        startAt,
      ),
      kind: BookingNotificationOutboxKind.REMINDER,
      recipientUserId: recipient.recipientUserId,
      reason: null,
      startAt,
      status: BookingStatus.APPROVED,
    };

    await this.notificationOutboxRepository
      .createQueryBuilder()
      .insert()
      .values(input)
      .orIgnore()
      .execute();
  }

  async ensureLegacyStatusOutbox(
    job: LegacyBookingStatusNotificationJob,
  ): Promise<BookingNotificationOutboxEntity | null> {
    const deduplicationKey = createStatusNotificationOutboxDeduplicationKey(
      job.bookingId,
      job.status,
    );

    const input: CreateNotificationOutbox = {
      bookingId: job.bookingId,
      deduplicationKey,
      kind: BookingNotificationOutboxKind.STATUS,
      recipientUserId: job.recipientUserId,
      reason: job.reason,
      startAt: null,
      status: job.status,
    };

    await this.notificationOutboxRepository
      .createQueryBuilder()
      .insert()
      .values(input)
      .orIgnore()
      .execute();

    return this.notificationOutboxRepository
      .createQueryBuilder('outbox')
      .select(BOOKING_NOTIFICATION_OUTBOX_PROCESSOR_QUERY_FIELDS)
      .where('outbox.deduplication_key = :deduplicationKey', {
        deduplicationKey,
      })
      .getOne();
  }

  async findPendingOutbox(
    limit: number,
  ): Promise<BookingNotificationOutboxEntity[]> {
    return this.notificationOutboxRepository
      .createQueryBuilder('outbox')
      .select(BOOKING_NOTIFICATION_OUTBOX_PENDING_QUERY_FIELDS)
      .where('outbox.processed_at IS NULL')
      .orderBy('outbox.last_checked_at', 'ASC', 'NULLS FIRST')
      .addOrderBy('outbox.created_at', 'ASC')
      .addOrderBy('outbox.id', 'ASC')
      .take(limit)
      .getMany();
  }

  async findOutboxById(
    outboxId: string,
  ): Promise<BookingNotificationOutboxEntity | null> {
    return this.notificationOutboxRepository
      .createQueryBuilder('outbox')
      .select(BOOKING_NOTIFICATION_OUTBOX_PROCESSOR_QUERY_FIELDS)
      .where('outbox.id = :outboxId', { outboxId })
      .getOne();
  }

  async markOutboxDispatched(
    outboxId: string,
    dispatchedAt: Date,
  ): Promise<void> {
    await this.notificationOutboxRepository.update(
      { id: outboxId },
      { dispatchedAt },
    );
  }

  async markOutboxChecked(outboxId: string, checkedAt: Date): Promise<void> {
    await this.notificationOutboxRepository.update(
      { id: outboxId, processedAt: IsNull() },
      { lastCheckedAt: checkedAt },
    );
  }

  async markOutboxProcessed(
    outboxId: string,
    processedAt: Date,
    deliveryStatus: BookingNotificationDeliveryStatus,
  ): Promise<void> {
    await this.notificationOutboxRepository.update(
      { id: outboxId, processedAt: IsNull() },
      { deliveryStatus, processedAt },
    );
  }
}
