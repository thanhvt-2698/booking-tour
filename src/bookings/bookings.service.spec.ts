import { ConflictException, NotFoundException } from '@nestjs/common';
import type { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { DepartureStatus } from '../tours/constants/departure.constants';
import { TourStatus } from '../tours/constants/tour.constants';
import { TourDepartureEntity } from '../tours/entities/tour-departure.entity';
import { TourEntity } from '../tours/entities/tour.entity';
import {
  BOOKING_PUBLIC_FIELDS,
  BookingStatus,
} from './constants/booking.constants';
import { BookingsService } from './bookings.service';
import type { BookingQueryDto } from './dto/booking-query.dto';
import { BookingStatusHistoryEntity } from './entities/booking-status-history.entity';
import { BookingEntity } from './entities/booking.entity';

describe('BookingsService', () => {
  let bookingRepository: jest.Mocked<Repository<BookingEntity>>;
  let bookingsService: BookingsService;
  let createBookingMock: jest.Mock;
  let createHistoryMock: jest.Mock;
  let createQueryBuilderMock: jest.Mock;
  let findBookingMock: jest.Mock;
  let findTourMock: jest.Mock;
  let getRepositoryMock: jest.Mock;
  let saveBookingMock: jest.Mock;
  let saveDepartureMock: jest.Mock;
  let saveHistoryMock: jest.Mock;
  let transactionMock: jest.Mock;

  const futureDate = new Date('2099-07-01T00:00:00.000Z');
  const booking = {
    bookingCode: 'BT-45B5A857B0B047ABB0955F18',
    cancelReason: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    currency: 'VND',
    departureId: 'departure-id',
    id: 'booking-id',
    quantity: 2,
    status: BookingStatus.PENDING,
    totalAmount: '3000000.00',
    unitPrice: '1500000.00',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    userId: 'user-id',
  } as BookingEntity;
  const departure = {
    bookedSeats: 0,
    bookingDeadline: futureDate,
    capacity: 4,
    id: booking.departureId,
    startAt: futureDate,
    status: DepartureStatus.OPEN,
    tourId: 'tour-id',
  } as TourDepartureEntity;
  const tour = {
    basePrice: booking.unitPrice,
    currency: booking.currency,
    id: departure.tourId,
    status: TourStatus.PUBLISHED,
  } as TourEntity;

  beforeEach(() => {
    createBookingMock = jest.fn();
    createHistoryMock = jest.fn();
    createQueryBuilderMock = jest.fn();
    findBookingMock = jest.fn();
    findTourMock = jest.fn();
    saveBookingMock = jest.fn();
    saveDepartureMock = jest.fn();
    saveHistoryMock = jest.fn();
    getRepositoryMock = jest.fn((entity: unknown) => {
      if (entity === BookingEntity) {
        return {
          create: createBookingMock,
          createQueryBuilder: createQueryBuilderMock,
          findOne: findBookingMock,
          save: saveBookingMock,
        };
      }
      if (entity === TourDepartureEntity) {
        return {
          createQueryBuilder: createQueryBuilderMock,
          save: saveDepartureMock,
        };
      }
      if (entity === TourEntity) {
        return { findOne: findTourMock };
      }
      if (entity === BookingStatusHistoryEntity) {
        return { create: createHistoryMock, save: saveHistoryMock };
      }

      return undefined;
    });
    transactionMock = jest.fn(
      (callback: (manager: { getRepository: jest.Mock }) => unknown) =>
        callback({ getRepository: getRepositoryMock }),
    );
    bookingRepository = {
      createQueryBuilder: createQueryBuilderMock,
      findOne: findBookingMock,
    } as unknown as jest.Mocked<Repository<BookingEntity>>;
    bookingsService = new BookingsService(
      { transaction: transactionMock } as unknown as DataSource,
      bookingRepository,
    );
  });

  it('creates a pending booking with locked departure, exact price snapshot and history', async () => {
    const selectMock = jest.fn().mockReturnThis();
    const setLockMock = jest.fn().mockReturnThis();
    const departureQuery = {
      getOne: jest.fn().mockResolvedValue(departure),
      select: selectMock,
      setLock: setLockMock,
      where: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<TourDepartureEntity>>;
    createQueryBuilderMock.mockReturnValue(departureQuery);
    findBookingMock.mockResolvedValue(null);
    findTourMock.mockResolvedValue(tour);
    createBookingMock.mockImplementation((input: Partial<BookingEntity>) => ({
      ...booking,
      ...input,
    }));
    saveBookingMock.mockResolvedValue(booking);
    createHistoryMock.mockImplementation((input: unknown) => input);
    saveHistoryMock.mockResolvedValue(undefined);

    await expect(
      bookingsService.create(booking.userId, ' booking-request-001 ', {
        departureId: booking.departureId,
        quantity: booking.quantity,
      }),
    ).resolves.toMatchObject({
      status: BookingStatus.PENDING,
      totalAmount: booking.totalAmount,
      unitPrice: booking.unitPrice,
    });

    expect(setLockMock).toHaveBeenCalledWith('pessimistic_write');
    expect(selectMock).toHaveBeenCalled();
    expect(saveDepartureMock).toHaveBeenCalledWith(
      expect.objectContaining({ bookedSeats: booking.quantity }),
    );
    expect(createBookingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'booking-request-001',
        quantity: booking.quantity,
        totalAmount: booking.totalAmount,
      }),
    );
    expect(createHistoryMock).toHaveBeenCalledWith({
      actorUserId: booking.userId,
      bookingId: booking.id,
      fromStatus: null,
      reason: null,
      toStatus: BookingStatus.PENDING,
    });
  });

  it('returns the existing booking only when an idempotency retry has the same payload', async () => {
    findBookingMock.mockResolvedValue(booking);

    await expect(
      bookingsService.create(booking.userId, 'booking-request-001', {
        departureId: booking.departureId,
        quantity: booking.quantity,
      }),
    ).resolves.toMatchObject({ id: booking.id });

    await expect(
      bookingsService.create(booking.userId, 'booking-request-001', {
        departureId: booking.departureId,
        quantity: booking.quantity + 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(createQueryBuilderMock).not.toHaveBeenCalled();
  });

  it('rejects booking an unavailable departure before a seat is reserved', async () => {
    const departureQuery = {
      getOne: jest.fn().mockResolvedValue({
        ...departure,
        startAt: new Date('2019-07-01T00:00:00.000Z'),
      }),
      select: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<TourDepartureEntity>>;
    createQueryBuilderMock.mockReturnValue(departureQuery);
    findBookingMock.mockResolvedValue(null);

    await expect(
      bookingsService.create(booking.userId, 'booking-request-001', {
        departureId: booking.departureId,
        quantity: booking.quantity,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(saveDepartureMock).not.toHaveBeenCalled();
  });

  it('cancels a pending booking once, releases its seats and stores history', async () => {
    const pendingBooking = {
      ...booking,
      cancelReason: null,
      status: BookingStatus.PENDING,
    } as BookingEntity;
    const reservedDeparture = {
      ...departure,
      bookedSeats: pendingBooking.quantity,
    };
    const bookingLockQuery = {
      getOne: jest.fn().mockResolvedValue(pendingBooking),
      select: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<BookingEntity>>;
    const departureLockQuery = {
      getOne: jest.fn().mockResolvedValue(reservedDeparture),
      select: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<TourDepartureEntity>>;
    createQueryBuilderMock
      .mockReturnValueOnce(bookingLockQuery)
      .mockReturnValueOnce(departureLockQuery);
    saveBookingMock.mockImplementation((savedBooking: BookingEntity) =>
      Promise.resolve(savedBooking),
    );
    createHistoryMock.mockImplementation((input: unknown) => input);

    await expect(
      bookingsService.cancel(booking.userId, booking.id, {
        reason: ' Cannot join ',
      }),
    ).resolves.toMatchObject({
      cancelReason: 'Cannot join',
      status: BookingStatus.CANCELLED,
    });

    expect(saveDepartureMock).toHaveBeenCalledWith(
      expect.objectContaining({ bookedSeats: 0 }),
    );
    expect(createHistoryMock).toHaveBeenCalledWith({
      actorUserId: booking.userId,
      bookingId: booking.id,
      fromStatus: BookingStatus.PENDING,
      reason: 'Cannot join',
      toStatus: BookingStatus.CANCELLED,
    });
  });

  it('does not release seats again when a cancellation is retried', async () => {
    const cancelledBooking = {
      ...booking,
      status: BookingStatus.CANCELLED,
    } as BookingEntity;
    const bookingLockQuery = {
      getOne: jest.fn().mockResolvedValue(cancelledBooking),
      select: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<BookingEntity>>;
    createQueryBuilderMock.mockReturnValue(bookingLockQuery);

    await expect(
      bookingsService.cancel(booking.userId, booking.id, {}),
    ).resolves.toMatchObject({ status: BookingStatus.CANCELLED });
    expect(saveDepartureMock).not.toHaveBeenCalled();
    expect(saveBookingMock).not.toHaveBeenCalled();
  });

  it('rejects cancellation when a booking is no longer pending', async () => {
    const approvedBooking = {
      ...booking,
      status: BookingStatus.APPROVED,
    } as BookingEntity;
    const bookingLockQuery = {
      getOne: jest.fn().mockResolvedValue(approvedBooking),
      select: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<BookingEntity>>;
    createQueryBuilderMock.mockReturnValue(bookingLockQuery);

    await expect(
      bookingsService.cancel(booking.userId, booking.id, {}),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(saveDepartureMock).not.toHaveBeenCalled();
  });

  it('selects only response fields when listing and viewing the user bookings', async () => {
    const selectMock = jest.fn().mockReturnThis();
    const bookingQuery = {
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[booking], 1]),
      orderBy: jest.fn().mockReturnThis(),
      select: selectMock,
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<BookingEntity>>;
    createQueryBuilderMock.mockReturnValue(bookingQuery);
    const query = { limit: 20, offset: 0, page: 1 } as BookingQueryDto;

    await expect(
      bookingsService.findMine(booking.userId, query),
    ).resolves.toMatchObject({
      bookings: [{ id: booking.id }],
      meta: { totalItems: 1 },
    });
    expect(selectMock).toHaveBeenCalledWith(
      expect.arrayContaining(['booking.id', 'booking.bookingCode']),
    );

    findBookingMock.mockResolvedValue(booking);
    await expect(
      bookingsService.findMineById(booking.userId, booking.id),
    ).resolves.toMatchObject({ id: booking.id });
    expect(findBookingMock).toHaveBeenLastCalledWith({
      select: [...BOOKING_PUBLIC_FIELDS],
      where: { id: booking.id, userId: booking.userId },
    });
  });

  it('does not disclose a booking owned by another user', async () => {
    findBookingMock.mockResolvedValue(null);

    await expect(
      bookingsService.findMineById('another-user-id', booking.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
