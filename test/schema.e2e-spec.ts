import { randomUUID } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';
import { getDatabaseOptions } from '../src/config/database.config';
import { UserEntity } from '../src/users/entities/user.entity';
import { RefreshTokenEntity } from '../src/auth/entities/refresh-token.entity';
import { CategoryEntity } from '../src/categories/entities/category.entity';
import { TourEntity } from '../src/tours/entities/tour.entity';
import { TourDepartureEntity } from '../src/tours/entities/tour-departure.entity';
import { BookingEntity } from '../src/bookings/entities/booking.entity';
import { BookingStatusHistoryEntity } from '../src/bookings/entities/booking-status-history.entity';
import { BookingStatus } from '../src/bookings/constants/booking.constants';
import { POSTGRES_UNIQUE_VIOLATION_CODE } from '../src/database/constants/database.constants';

describe('Migrated schema integration', () => {
  let source: DataSource;
  let runner: QueryRunner;

  beforeAll(async () => {
    if (
      process.env.NODE_ENV !== 'test' ||
      !/^booking_tour_f00_[a-z0-9_]+_test$/.test(process.env.DB_TEST_NAME ?? '')
    ) {
      throw new Error(
        'Schema tests require a disposable booking_tour_f00_*_test database',
      );
    }
    source = await new DataSource(getDatabaseOptions()).initialize();
  });
  beforeEach(async () => {
    runner = source.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
  });
  afterEach(async () => {
    if (runner) {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });

  it('has exactly the expected domain tables and 13 foreign keys without duplicate columns', async () => {
    expect(source.entityMetadatas).toHaveLength(10);
    expect(source.entityMetadatas.flatMap((m) => m.foreignKeys)).toHaveLength(
      13,
    );
    const tables = await runner.getTables(
      source.entityMetadatas.map((m) => m.tableName),
    );
    expect(tables).toHaveLength(10);
    expect(tables.flatMap((t) => t.foreignKeys)).toHaveLength(13);
    for (const metadata of source.entityMetadatas) {
      const table = tables.find((t) => t.name === metadata.tableName)!;
      expect(table.columns.map((c) => c.name).sort()).toEqual(
        metadata.columns.map((c) => c.databaseName).sort(),
      );
      for (const fk of metadata.foreignKeys) {
        const actual = table.foreignKeys.find((f) => f.name === fk.name)!;
        expect(actual).toBeDefined();
        expect(actual.columnNames).toEqual(fk.columnNames);
        expect(actual.onDelete).toBe(fk.onDelete);
      }
    }
  });

  it('loads both directions of a relation and honors database cascade without exposing hashes', async () => {
    const suffix = randomUUID().slice(0, 8);
    const user = await runner.manager.save(UserEntity, {
      email: `${suffix}@example.com`,
      passwordHash: 'hidden',
    });
    await runner.manager.save(RefreshTokenEntity, {
      userId: user.id,
      tokenHash: randomUUID(),
      familyId: randomUUID(),
      expiresAt: new Date('2030-01-01'),
    });
    const loaded = await runner.manager.findOneOrFail(UserEntity, {
      where: { id: user.id },
      relations: { refreshTokens: true },
    });
    expect(loaded.refreshTokens).toHaveLength(1);
    expect(loaded.passwordHash).toBeUndefined();
    const token = await runner.manager.findOneOrFail(RefreshTokenEntity, {
      where: { userId: user.id },
      relations: { user: true },
    });
    expect(token.user.id).toBe(user.id);
    await runner.manager.delete(UserEntity, user.id);
    expect(
      await runner.manager.count(RefreshTokenEntity, {
        where: { userId: user.id },
      }),
    ).toBe(0);
  });

  it('rejects invalid foreign keys and unique conflicts', async () => {
    await runner.query('SAVEPOINT invalid_fk');
    await expect(
      runner.manager.save(RefreshTokenEntity, {
        userId: randomUUID(),
        tokenHash: randomUUID(),
        familyId: randomUUID(),
        expiresAt: new Date('2030-01-01'),
      }),
    ).rejects.toMatchObject({ code: '23503' });
    await runner.query('ROLLBACK TO SAVEPOINT invalid_fk');
    const suffix = randomUUID().slice(0, 8);
    await runner.manager.save(UserEntity, {
      email: `${suffix}@example.com`,
    });
    await expect(
      runner.manager.save(UserEntity, {
        email: `${suffix}@example.com`,
      }),
    ).rejects.toMatchObject({ code: POSTGRES_UNIQUE_VIOLATION_CODE });
  });

  it('preserves audit history with SET NULL and restricts deleting an owner', async () => {
    const suffix = randomUUID().slice(0, 8);
    const manager = runner.manager;
    const owner = await manager.save(UserEntity, {
      email: `${suffix}@example.com`,
    });
    const actor = await manager.save(UserEntity, {
      email: `${suffix}_actor@example.com`,
    });
    const category = await manager.save(CategoryEntity, {
      name: suffix,
      slug: suffix,
    });
    const tour = await manager.save(TourEntity, {
      categoryId: category.id,
      createdBy: owner.id,
      code: suffix,
      slug: suffix,
      title: suffix,
      description: 'Schema fixture',
      basePrice: '10.00',
    });
    const departure = await manager.save(TourDepartureEntity, {
      tourId: tour.id,
      startAt: new Date('2030-01-01'),
      endAt: new Date('2030-01-02'),
      capacity: 10,
    });
    const booking = await manager.save(BookingEntity, {
      bookingCode: suffix,
      userId: owner.id,
      departureId: departure.id,
      quantity: 1,
      unitPrice: '10.00',
      totalAmount: '10.00',
      currency: 'VND',
    });
    const history = await manager.save(BookingStatusHistoryEntity, {
      actorUserId: actor.id,
      bookingId: booking.id,
      toStatus: BookingStatus.PENDING,
    });
    await manager.delete(UserEntity, actor.id);
    expect(
      (
        await manager.findOneByOrFail(BookingStatusHistoryEntity, {
          id: history.id,
        })
      ).actorUserId,
    ).toBeNull();
    await runner.query('SAVEPOINT restrict_owner');
    await expect(manager.delete(UserEntity, owner.id)).rejects.toMatchObject({
      code: '23503',
    });
    await runner.query('ROLLBACK TO SAVEPOINT restrict_owner');
    await manager.delete(BookingEntity, booking.id);
    expect(
      await manager.count(BookingStatusHistoryEntity, {
        where: { id: history.id },
      }),
    ).toBe(0);
  });
});
