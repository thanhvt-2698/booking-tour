import { BadRequestException, ConflictException } from '@nestjs/common';
import { DepartureStatus } from '../tours/constants/departure.constants';
import { TourDepartureEntity } from '../tours/entities/tour-departure.entity';
import { TourEntity } from '../tours/entities/tour.entity';
import { UserEntity } from '../users/entities/user.entity';
import {
  AdminBookingsStore,
  AdminBookingsTransaction,
} from './admin-bookings.store';
import { AdminBookingsService } from './admin-bookings.service';
import { BookingEventsService } from './booking-events.service';
import { BookingStatus } from './constants/booking.constants';
import { BookingEntity } from './entities/booking.entity';

describe('AdminBookingsService', () => {
  let adminBookingsService: AdminBookingsService;
  let findByIdMock: jest.Mock;
  let findManyMock: jest.Mock;
  let publishStatusChangedMock: jest.Mock;
  let withinTransactionMock: jest.Mock;

  const actorUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const bookingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const departureId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const userId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const tourId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

  const fullBooking = {
    bookingCode: 'BT-45B5A857B0B047ABB0955F18',
    cancelReason: null,
    createdAt: new Date('2030-07-01T09:00:00.000Z'),
    currency: 'VND',
    departure: {
      bookedSeats: 2,
      capacity: 10,
      endAt: new Date('2030-07-05T17:00:00.000Z'),
      id: departureId,
      startAt: new Date('2030-07-02T08:00:00.000Z'),
      status: DepartureStatus.OPEN,
      tour: {
        code: 'HN-DN-001',
        id: tourId,
        title: 'Hanoi to Da Nang',
      } as TourEntity,
      tourId,
    } as TourDepartureEntity,
    departureId,
    id: bookingId,
    quantity: 2,
    status: BookingStatus.PENDING,
    totalAmount: '3000000.00',
    unitPrice: '1500000.00',
    updatedAt: new Date('2030-07-01T09:00:00.000Z'),
    user: {
      email: 'traveler@example.com',
      id: userId,
    } as UserEntity,
  } as BookingEntity;

  beforeEach(() => {
    findByIdMock = jest.fn();
    findManyMock = jest.fn();
    withinTransactionMock = jest.fn();
    publishStatusChangedMock = jest.fn();
    adminBookingsService = new AdminBookingsService(
      {
        findById: findByIdMock,
        findMany: findManyMock,
        withinTransaction: withinTransactionMock,
      } as unknown as AdminBookingsStore,
      {
        publishStatusChanged: publishStatusChangedMock,
      } as unknown as BookingEventsService,
    );
  });

  it('lists bookings using normalized filters and a minimal response', async () => {
    findManyMock.mockResolvedValue([[fullBooking], 1]);

    await expect(
      adminBookingsService.findMany({
        createdFrom: '2030-07-01',
        createdTo: '2030-07-31',
        limit: 20,
        offset: 0,
        page: 1,
        status: BookingStatus.PENDING,
        tourId,
        userId,
      }),
    ).resolves.toMatchObject({
      bookings: [
        {
          id: bookingId,
          user: { email: fullBooking.user.email },
        },
      ],
      meta: { totalItems: 1 },
    });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        createdFrom: new Date('2030-07-01T00:00:00.000Z'),
        createdTo: new Date('2030-08-01T00:00:00.000Z'),
        status: BookingStatus.PENDING,
        tourId,
        userId,
      }),
      0,
      20,
    );
  });

  it('rejects an invalid creation date range before querying bookings', async () => {
    await expect(
      adminBookingsService.findMany({
        createdFrom: '2030-07-31',
        createdTo: '2030-07-01',
        limit: 20,
        offset: 0,
        page: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('rejects a pending booking, releases seats, writes history and publishes after commit', async () => {
    const transitionBooking = {
      ...fullBooking,
      departure: undefined,
      status: BookingStatus.PENDING,
      user: undefined,
    } as unknown as BookingEntity;
    const departure = {
      bookedSeats: transitionBooking.quantity,
      id: departureId,
    } as TourDepartureEntity;
    let transactionCompleted = false;
    const saveBookingMock = jest
      .fn()
      .mockImplementation((booking: BookingEntity) => booking);
    const saveDepartureMock = jest
      .fn()
      .mockImplementation((item: TourDepartureEntity) => item);
    const saveStatusHistoryMock = jest.fn();
    const transaction = {
      findBookingForUpdate: jest.fn().mockResolvedValue(transitionBooking),
      findDepartureForUpdate: jest.fn().mockResolvedValue(departure),
      saveBooking: saveBookingMock,
      saveDeparture: saveDepartureMock,
      saveStatusHistory: saveStatusHistoryMock,
    } as unknown as jest.Mocked<AdminBookingsTransaction>;
    withinTransactionMock.mockImplementation(
      async (
        operation: (item: AdminBookingsTransaction) => Promise<unknown>,
      ) => {
        const result = await operation(transaction);
        transactionCompleted = true;

        return result;
      },
    );
    findByIdMock.mockResolvedValue({
      ...fullBooking,
      status: BookingStatus.REJECTED,
    });
    publishStatusChangedMock.mockImplementation(() => {
      expect(transactionCompleted).toBe(true);
    });

    await expect(
      adminBookingsService.reject(actorUserId, bookingId, {
        reason: ' Missing required information ',
      }),
    ).resolves.toMatchObject({ status: BookingStatus.REJECTED });

    expect(saveDepartureMock).toHaveBeenCalledWith(
      expect.objectContaining({ bookedSeats: 0 }),
    );
    expect(saveBookingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cancelReason: 'Missing required information',
        status: BookingStatus.REJECTED,
      }),
    );
    expect(saveStatusHistoryMock).toHaveBeenCalledWith({
      actorUserId,
      bookingId,
      fromStatus: BookingStatus.PENDING,
      reason: 'Missing required information',
      toStatus: BookingStatus.REJECTED,
    });
    expect(publishStatusChangedMock).toHaveBeenCalledWith({
      actorUserId,
      bookingId,
      fromStatus: BookingStatus.PENDING,
      reason: 'Missing required information',
      toStatus: BookingStatus.REJECTED,
    });
  });

  it('does not publish an event when a booking cannot transition', async () => {
    const transaction = {
      findBookingForUpdate: jest
        .fn()
        .mockResolvedValue({ ...fullBooking, status: BookingStatus.APPROVED }),
    } as unknown as AdminBookingsTransaction;
    withinTransactionMock.mockImplementation(
      (operation: (item: AdminBookingsTransaction) => Promise<unknown>) =>
        operation(transaction),
    );

    await expect(
      adminBookingsService.approve(actorUserId, bookingId, {}),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(publishStatusChangedMock).not.toHaveBeenCalled();
  });
});
