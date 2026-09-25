import type {
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { TourDepartureEntity } from '../tours/entities/tour-departure.entity';
import {
  ADMIN_BOOKING_ACTION_QUERY_FIELDS,
  ADMIN_BOOKING_DEPARTURE_ACTION_QUERY_FIELDS,
  ADMIN_BOOKING_DEPARTURE_QUERY_FIELDS,
  ADMIN_BOOKING_QUERY_FIELDS,
  ADMIN_BOOKING_TOUR_QUERY_FIELDS,
  ADMIN_BOOKING_USER_QUERY_FIELDS,
} from './constants/admin-booking.constants';
import { BookingStatus } from './constants/booking.constants';
import { BookingEntity } from './entities/booking.entity';
import {
  AdminBookingsStore,
  AdminBookingsTransaction,
} from './admin-bookings.store';

describe('AdminBookingsStore', () => {
  const bookingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const departureId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const tourId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const userId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

  it('selects only the fields required by administrative booking list', async () => {
    const andWhereMock = jest.fn().mockReturnThis();
    const orderByMock = jest.fn().mockReturnThis();
    const selectMock = jest.fn().mockReturnThis();
    const query = {
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: andWhereMock,
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: orderByMock,
      select: selectMock,
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<BookingEntity>>;
    const bookingsRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(query),
    } as unknown as Repository<BookingEntity>;
    const store = new AdminBookingsStore({} as DataSource, bookingsRepository);

    await store.findMany(
      {
        createdFrom: new Date('2030-07-01T00:00:00.000Z'),
        createdTo: new Date('2030-08-01T00:00:00.000Z'),
        departureId,
        status: BookingStatus.PENDING,
        tourId,
        userId,
      },
      0,
      20,
    );

    expect(selectMock).toHaveBeenCalledWith([
      ...ADMIN_BOOKING_QUERY_FIELDS,
      ...ADMIN_BOOKING_USER_QUERY_FIELDS,
      ...ADMIN_BOOKING_DEPARTURE_QUERY_FIELDS,
      ...ADMIN_BOOKING_TOUR_QUERY_FIELDS,
    ]);
    expect(orderByMock).toHaveBeenCalledWith('booking.createdAt', 'DESC');
    expect(andWhereMock).toHaveBeenCalledWith(
      'booking.departure_id = :departureId',
      { departureId },
    );
    expect(andWhereMock).toHaveBeenCalledWith('booking.status = :status', {
      status: BookingStatus.PENDING,
    });
    expect(andWhereMock).toHaveBeenCalledWith('departure.tour_id = :tourId', {
      tourId,
    });
    expect(andWhereMock).toHaveBeenCalledWith('booking.user_id = :userId', {
      userId,
    });
  });

  it('locks and selects only transition fields', async () => {
    const selectMock = jest.fn().mockReturnThis();
    const bookingSetLockMock = jest.fn().mockReturnThis();
    const departureSetLockMock = jest.fn().mockReturnThis();
    const bookingQuery = {
      getOne: jest.fn().mockResolvedValue(null),
      select: selectMock,
      setLock: bookingSetLockMock,
      where: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<BookingEntity>>;
    const departureQuery = {
      getOne: jest.fn().mockResolvedValue(null),
      select: selectMock,
      setLock: departureSetLockMock,
      where: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<TourDepartureEntity>>;
    const manager = {
      getRepository: jest
        .fn()
        .mockReturnValueOnce({
          createQueryBuilder: jest.fn().mockReturnValue(bookingQuery),
        })
        .mockReturnValueOnce({
          createQueryBuilder: jest.fn().mockReturnValue(departureQuery),
        }),
    } as unknown as EntityManager;
    const transaction = new AdminBookingsTransaction(manager);

    await transaction.findBookingForUpdate(bookingId);
    await transaction.findDepartureForUpdate(departureId);

    expect(bookingSetLockMock).toHaveBeenCalledWith('pessimistic_write');
    expect(selectMock).toHaveBeenCalledWith(ADMIN_BOOKING_ACTION_QUERY_FIELDS);
    expect(departureSetLockMock).toHaveBeenCalledWith('pessimistic_write');
    expect(selectMock).toHaveBeenCalledWith(
      ADMIN_BOOKING_DEPARTURE_ACTION_QUERY_FIELDS,
    );
  });
});
