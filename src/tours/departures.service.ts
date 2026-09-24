import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { BookingStatus } from '../bookings/constants/booking.constants';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { createPaginationMeta } from '../common/dto/pagination-response.dto';
import { TourStatus } from './constants/tour.constants';
import {
  DEPARTURE_PUBLIC_FIELDS,
  DEPARTURE_QUERY_FIELDS,
  DepartureStatus,
  DepartureUpdateStatus,
} from './constants/departure.constants';
import type { CreateDepartureDto } from './dto/create-departure.dto';
import type {
  AdminDepartureQueryDto,
  DepartureQueryDto,
} from './dto/departure-query.dto';
import type { DepartureResponseDto } from './dto/departure-response.dto';
import type { UpdateDepartureDto } from './dto/update-departure.dto';
import { TourDepartureEntity } from './entities/tour-departure.entity';
import { TourEntity } from './entities/tour.entity';
import type { DepartureList } from './interfaces/departure-list.interface';
import type { DepartureScheduleInput } from './interfaces/departure-schedule-input.interface';
import type { ValidatedDepartureSchedule } from './interfaces/validated-departure-schedule.interface';

@Injectable()
export class DeparturesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TourDepartureEntity)
    private readonly departuresRepository: Repository<TourDepartureEntity>,
    @InjectRepository(TourEntity)
    private readonly toursRepository: Repository<TourEntity>,
  ) {}

  async findPublicByTour(
    tourId: string,
    query: DepartureQueryDto,
  ): Promise<DepartureList> {
    const isPublishedTour = await this.toursRepository.existsBy({
      id: tourId,
      status: TourStatus.PUBLISHED,
    });

    if (!isPublishedTour) {
      throw new NotFoundException('errors.tourNotFound');
    }

    const departuresQuery = this.departuresRepository
      .createQueryBuilder('departure')
      .select(DEPARTURE_QUERY_FIELDS)
      .where('departure.tour_id = :tourId', { tourId })
      .andWhere('departure.status = :status', { status: DepartureStatus.OPEN })
      .andWhere('departure.booked_seats < departure.capacity')
      .andWhere('departure.start_at > CURRENT_TIMESTAMP')
      .andWhere(
        '(departure.booking_deadline IS NULL OR departure.booking_deadline > CURRENT_TIMESTAMP)',
      )
      .orderBy('departure.start_at', 'ASC')
      .addOrderBy('departure.id', 'ASC')
      .skip(query.offset)
      .take(query.limit);
    const [departures, totalItems] = await departuresQuery.getManyAndCount();

    return {
      departures: departures.map((departure) => this.toResponse(departure)),
      meta: createPaginationMeta(query.page, query.limit, totalItems),
    };
  }

  async findForAdminByTour(
    tourId: string,
    query: AdminDepartureQueryDto,
  ): Promise<DepartureList> {
    const doesTourExist = await this.toursRepository.existsBy({ id: tourId });

    if (!doesTourExist) {
      throw new NotFoundException('errors.tourNotFound');
    }

    const departuresQuery = this.departuresRepository
      .createQueryBuilder('departure')
      .select(DEPARTURE_QUERY_FIELDS)
      .where('departure.tour_id = :tourId', { tourId })
      .orderBy('departure.start_at', 'ASC')
      .addOrderBy('departure.id', 'ASC')
      .skip(query.offset)
      .take(query.limit);

    if (query.status) {
      departuresQuery.andWhere('departure.status = :status', {
        status: query.status,
      });
    }

    const [departures, totalItems] = await departuresQuery.getManyAndCount();

    return {
      departures: departures.map((departure) => this.toResponse(departure)),
      meta: createPaginationMeta(query.page, query.limit, totalItems),
    };
  }

  async create(
    tourId: string,
    input: CreateDepartureDto,
  ): Promise<DepartureResponseDto> {
    const tour = await this.toursRepository.findOne({
      select: ['id', 'status'],
      where: { id: tourId },
    });

    if (!tour) {
      throw new NotFoundException('errors.tourNotFound');
    }
    if (tour.status === TourStatus.ARCHIVED) {
      throw new ConflictException('errors.departureTourArchived');
    }

    const schedule = this.validateSchedule(input, true);
    const departure = this.departuresRepository.create({
      bookingDeadline: schedule.bookingDeadline,
      capacity: input.capacity,
      endAt: schedule.endAt,
      startAt: schedule.startAt,
      status: DepartureStatus.OPEN,
      tourId,
    });

    return this.toResponse(await this.departuresRepository.save(departure));
  }

  async update(
    id: string,
    input: UpdateDepartureDto,
  ): Promise<DepartureResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const departure = await this.findRequiredForUpdate(manager, id);
      this.ensureDepartureCanBeManaged(departure);

      const doesScheduleChange =
        input.startAt !== undefined ||
        input.endAt !== undefined ||
        input.bookingDeadline !== undefined;
      const schedule = doesScheduleChange
        ? this.validateSchedule(
            {
              bookingDeadline:
                input.bookingDeadline === undefined
                  ? (departure.bookingDeadline?.toISOString() ?? null)
                  : input.bookingDeadline,
              endAt: input.endAt ?? departure.endAt.toISOString(),
              startAt: input.startAt ?? departure.startAt.toISOString(),
            },
            true,
          )
        : null;

      if (
        doesScheduleChange &&
        (await this.hasReservations(manager, id, departure.bookedSeats))
      ) {
        throw new ConflictException('errors.departureHasReservations');
      }

      const nextCapacity = input.capacity ?? departure.capacity;
      if (nextCapacity < departure.bookedSeats) {
        throw new ConflictException('errors.departureCapacityBelowBooked');
      }

      if (schedule) {
        departure.bookingDeadline = schedule.bookingDeadline;
        departure.endAt = schedule.endAt;
        departure.startAt = schedule.startAt;
      }
      departure.capacity = nextCapacity;

      if (input.status === DepartureUpdateStatus.OPEN) {
        this.ensureScheduleCanOpen(departure);
        departure.status = DepartureStatus.OPEN;
      } else if (input.status === DepartureUpdateStatus.CLOSED) {
        departure.status = DepartureStatus.CLOSED;
      }

      return this.toResponse(
        await manager.getRepository(TourDepartureEntity).save(departure),
      );
    });
  }

  async cancel(id: string): Promise<DepartureResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const departure = await this.findRequiredForUpdate(manager, id);

      if (departure.status === DepartureStatus.CANCELLED) {
        return this.toResponse(departure);
      }
      if (departure.status === DepartureStatus.COMPLETED) {
        throw new ConflictException('errors.departureAlreadyCompleted');
      }
      if (departure.startAt.getTime() <= Date.now()) {
        throw new ConflictException('errors.departureAlreadyStarted');
      }
      if (await this.hasReservations(manager, id, departure.bookedSeats)) {
        throw new ConflictException('errors.departureHasReservations');
      }

      departure.status = DepartureStatus.CANCELLED;

      return this.toResponse(
        await manager.getRepository(TourDepartureEntity).save(departure),
      );
    });
  }

  private async findRequiredForUpdate(
    manager: EntityManager,
    id: string,
  ): Promise<TourDepartureEntity> {
    const departure = await manager.getRepository(TourDepartureEntity).findOne({
      lock: { mode: 'pessimistic_write' },
      select: [...DEPARTURE_PUBLIC_FIELDS],
      where: { id },
    });

    if (!departure) {
      throw new NotFoundException('errors.departureNotFound');
    }

    return departure;
  }

  private async hasReservations(
    manager: EntityManager,
    departureId: string,
    bookedSeats: number,
  ): Promise<boolean> {
    if (bookedSeats > 0) {
      return true;
    }

    return manager.getRepository(BookingEntity).existsBy({
      departureId,
      status: In([BookingStatus.PENDING, BookingStatus.APPROVED]),
    });
  }

  private ensureDepartureCanBeManaged(departure: TourDepartureEntity): void {
    if (
      departure.status === DepartureStatus.CANCELLED ||
      departure.status === DepartureStatus.COMPLETED
    ) {
      throw new ConflictException('errors.departureNotEditable');
    }
    if (departure.startAt.getTime() <= Date.now()) {
      throw new ConflictException('errors.departureAlreadyStarted');
    }
  }

  private ensureScheduleCanOpen(departure: TourDepartureEntity): void {
    if (departure.startAt.getTime() <= Date.now()) {
      throw new ConflictException('errors.departureStartMustBeFuture');
    }
    if (
      departure.bookingDeadline &&
      departure.bookingDeadline.getTime() <= Date.now()
    ) {
      throw new ConflictException('errors.departureDeadlineExpired');
    }
    if (departure.bookedSeats >= departure.capacity) {
      throw new ConflictException('errors.departureFull');
    }
  }

  private validateSchedule(
    input: DepartureScheduleInput,
    requireFutureStart: boolean,
  ): ValidatedDepartureSchedule {
    const startAt = this.parseDate(input.startAt);
    const endAt = this.parseDate(input.endAt);
    const bookingDeadline = input.bookingDeadline
      ? this.parseDate(input.bookingDeadline)
      : null;

    if (endAt.getTime() <= startAt.getTime()) {
      throw new BadRequestException('errors.departureEndMustFollowStart');
    }
    if (bookingDeadline && bookingDeadline.getTime() > startAt.getTime()) {
      throw new BadRequestException('errors.departureDeadlineAfterStart');
    }
    if (
      requireFutureStart &&
      bookingDeadline &&
      bookingDeadline.getTime() <= Date.now()
    ) {
      throw new BadRequestException('errors.departureDeadlineMustBeFuture');
    }
    if (requireFutureStart && startAt.getTime() <= Date.now()) {
      throw new BadRequestException('errors.departureStartMustBeFuture');
    }

    return { bookingDeadline, endAt, startAt };
  }

  private parseDate(value: string): Date {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('errors.validation');
    }

    return date;
  }

  private toResponse(departure: TourDepartureEntity): DepartureResponseDto {
    return {
      bookingDeadline: departure.bookingDeadline,
      capacity: departure.capacity,
      bookedSeats: departure.bookedSeats,
      createdAt: departure.createdAt,
      endAt: departure.endAt,
      id: departure.id,
      startAt: departure.startAt,
      status: departure.status,
      tourId: departure.tourId,
      updatedAt: departure.updatedAt,
    };
  }
}
