import { ConflictException } from '@nestjs/common';
import type { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { TourStatus } from './constants/tour.constants';
import { DepartureStatus } from './constants/departure.constants';
import { DepartureQueryDto } from './dto/departure-query.dto';
import { TourDepartureEntity } from './entities/tour-departure.entity';
import { TourEntity } from './entities/tour.entity';
import { DeparturesService } from './departures.service';

describe('DeparturesService', () => {
  let dataSource: jest.Mocked<DataSource>;
  let departuresRepository: jest.Mocked<Repository<TourDepartureEntity>>;
  let toursRepository: jest.Mocked<Repository<TourEntity>>;
  let service: DeparturesService;
  let departureQueryBuilder: jest.Mocked<
    SelectQueryBuilder<TourDepartureEntity>
  >;
  let selectMock: jest.Mock;
  let andWhereMock: jest.Mock;
  let saveMock: jest.Mock;

  beforeEach(() => {
    selectMock = jest.fn().mockReturnThis();
    andWhereMock = jest.fn().mockReturnThis();
    saveMock = jest.fn();
    departureQueryBuilder = {
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: andWhereMock,
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      orderBy: jest.fn().mockReturnThis(),
      select: selectMock,
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<TourDepartureEntity>>;
    dataSource = {} as jest.Mocked<DataSource>;
    departuresRepository = {
      create: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(departureQueryBuilder),
      save: saveMock,
    } as unknown as jest.Mocked<Repository<TourDepartureEntity>>;
    toursRepository = {
      existsBy: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<TourEntity>>;
    service = new DeparturesService(
      dataSource,
      departuresRepository,
      toursRepository,
    );
  });

  it('selects response fields and excludes closed, full, expired and started departures publicly', async () => {
    toursRepository.existsBy.mockResolvedValue(true);

    await service.findPublicByTour('tour-id', new DepartureQueryDto());

    expect(selectMock).toHaveBeenCalledWith([
      'departure.id',
      'departure.tourId',
      'departure.status',
      'departure.startAt',
      'departure.endAt',
      'departure.bookingDeadline',
      'departure.capacity',
      'departure.bookedSeats',
      'departure.createdAt',
      'departure.updatedAt',
    ]);
    expect(andWhereMock).toHaveBeenCalledWith('departure.status = :status', {
      status: DepartureStatus.OPEN,
    });
    expect(andWhereMock).toHaveBeenCalledWith(
      'departure.start_at > CURRENT_TIMESTAMP',
    );
    expect(andWhereMock).toHaveBeenCalledWith(
      '(departure.booking_deadline IS NULL OR departure.booking_deadline > CURRENT_TIMESTAMP)',
    );
  });

  it('does not create departures for archived tours', async () => {
    toursRepository.findOne.mockResolvedValue({
      id: 'tour-id',
      status: TourStatus.ARCHIVED,
    } as TourEntity);

    await expect(
      service.create('tour-id', {
        capacity: 10,
        endAt: '2035-07-05T17:00:00.000Z',
        startAt: '2035-07-01T08:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(saveMock).not.toHaveBeenCalled();
  });
});
