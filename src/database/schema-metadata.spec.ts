import { DataSource } from 'typeorm';
import type { EntityMetadata } from 'typeorm/metadata/EntityMetadata';
import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';
import { SocialAccountEntity } from '../auth/entities/social-account.entity';
import { BookingStatusHistoryEntity } from '../bookings/entities/booking-status-history.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { CategoryEntity } from '../categories/entities/category.entity';
import { TourImageEntity } from '../files/entities/tour-image.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { TourDepartureEntity } from '../tours/entities/tour-departure.entity';
import { TourEntity } from '../tours/entities/tour.entity';
import { UserEntity } from '../users/entities/user.entity';

type MetadataRelation = EntityMetadata['relations'][number];

class MetadataDataSource extends DataSource {
  async buildMetadataForTest(): Promise<void> {
    await this.buildMetadatas();
  }
}

const schemaEntities = [
  UserEntity,
  RefreshTokenEntity,
  SocialAccountEntity,
  CategoryEntity,
  TourEntity,
  TourDepartureEntity,
  TourImageEntity,
  BookingEntity,
  BookingStatusHistoryEntity,
  ReviewEntity,
];

const metadataFor = (
  dataSource: DataSource,
  tableName: string,
): EntityMetadata => {
  const metadata = dataSource.entityMetadatas.find(
    (candidate) => candidate.tableName === tableName,
  );

  if (!metadata) {
    throw new Error(`Missing metadata for ${tableName}`);
  }

  return metadata;
};

const relationFor = (
  dataSource: DataSource,
  tableName: string,
  propertyName: string,
): MetadataRelation => {
  const metadata = metadataFor(dataSource, tableName);
  const relation = metadata.relations.find(
    (candidate) => candidate.propertyName === propertyName,
  );

  if (!relation) {
    throw new Error(`Missing relation ${tableName}.${propertyName}`);
  }

  return relation;
};

describe('schema metadata', () => {
  let dataSource: MetadataDataSource;

  beforeAll(async () => {
    dataSource = new MetadataDataSource({
      entities: schemaEntities,
      type: 'postgres',
    });
    await dataSource.buildMetadataForTest();
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('registers exactly the ten F00 tables', () => {
    expect(
      dataSource.entityMetadatas.map(({ tableName }) => tableName).sort(),
    ).toEqual([
      'booking_status_histories',
      'bookings',
      'categories',
      'refresh_tokens',
      'reviews',
      'social_accounts',
      'tour_departures',
      'tour_images',
      'tours',
      'users',
    ]);
  });

  it('maps every FK to a scalar id column with the migration constraint name and action', () => {
    const expectedRelations = [
      [
        'refresh_tokens',
        'user',
        'user_id',
        'CASCADE',
        'FK_refresh_tokens_user_id',
        'refreshTokens',
      ],
      [
        'social_accounts',
        'user',
        'user_id',
        'CASCADE',
        'FK_social_accounts_user',
        'socialAccounts',
      ],
      [
        'tours',
        'category',
        'category_id',
        'RESTRICT',
        'FK_tours_category',
        'tours',
      ],
      [
        'tours',
        'createdByUser',
        'created_by',
        'RESTRICT',
        'FK_tours_created_by',
        'createdTours',
      ],
      [
        'tour_departures',
        'tour',
        'tour_id',
        'RESTRICT',
        'FK_tour_departures_tour',
        'departures',
      ],
      [
        'tour_images',
        'tour',
        'tour_id',
        'CASCADE',
        'FK_tour_images_tour',
        'images',
      ],
      [
        'bookings',
        'user',
        'user_id',
        'RESTRICT',
        'FK_bookings_user',
        'bookings',
      ],
      [
        'bookings',
        'departure',
        'departure_id',
        'RESTRICT',
        'FK_bookings_departure',
        'bookings',
      ],
      [
        'booking_status_histories',
        'booking',
        'booking_id',
        'CASCADE',
        'FK_booking_status_histories_booking',
        'statusHistories',
      ],
      [
        'booking_status_histories',
        'actorUser',
        'actor_user_id',
        'SET NULL',
        'FK_booking_status_histories_actor',
        'bookingStatusHistories',
      ],
      ['reviews', 'user', 'user_id', 'RESTRICT', 'FK_reviews_user', 'reviews'],
      ['reviews', 'tour', 'tour_id', 'RESTRICT', 'FK_reviews_tour', 'reviews'],
      [
        'reviews',
        'booking',
        'booking_id',
        'RESTRICT',
        'FK_reviews_booking',
        'reviews',
      ],
    ] as const;

    for (const [
      tableName,
      propertyName,
      columnName,
      onDelete,
      foreignKeyName,
      inverse,
    ] of expectedRelations) {
      const relation = relationFor(dataSource, tableName, propertyName);
      expect(relation.relationType).toBe('many-to-one');
      expect(relation.isNullable).toBe(
        tableName === 'booking_status_histories' &&
          propertyName === 'actorUser',
      );
      expect(relation.onDelete).toBe(onDelete);
      expect(relation.joinColumns).toHaveLength(1);
      expect(relation.joinColumns[0].databaseName).toBe(columnName);
      expect(relation.foreignKeys.map(({ name }) => name)).toContain(
        foreignKeyName,
      );
      expect(relation.inverseRelation?.relationType).toBe('one-to-many');
      expect(relation.inverseRelation?.propertyName).toBe(inverse);

      const scalarColumns = metadataFor(dataSource, tableName).columns.filter(
        (column) => column.databaseName === columnName,
      );
      expect(scalarColumns).toHaveLength(1);
    }
  });

  it('keeps enum types, defaults, checks, and indexes aligned with migrations', () => {
    const enumColumns = [
      ['users', 'role', 'user_role_enum', 'USER'],
      ['users', 'status', 'user_status_enum', 'ACTIVE'],
      ['categories', 'status', 'category_status_enum', 'ACTIVE'],
      ['tours', 'status', 'tour_status_enum', 'DRAFT'],
      ['tour_departures', 'status', 'departure_status_enum', 'OPEN'],
      ['bookings', 'status', 'booking_status_enum', 'PENDING'],
      [
        'booking_status_histories',
        'fromStatus',
        'booking_status_enum',
        undefined,
      ],
      [
        'booking_status_histories',
        'toStatus',
        'booking_status_enum',
        undefined,
      ],
      ['reviews', 'status', 'review_status_enum', 'PUBLISHED'],
    ] as const;

    for (const [
      tableName,
      propertyName,
      enumName,
      defaultValue,
    ] of enumColumns) {
      const column = metadataFor(dataSource, tableName).columns.find(
        (candidate) => candidate.propertyName === propertyName,
      );
      expect(column?.enumName).toBe(enumName);
      expect(column?.default).toBe(defaultValue);
    }

    const expectedChecks = new Map([
      [
        'tour_departures',
        [
          'CHK_tour_departures_capacity_positive',
          'CHK_tour_departures_booked_seats_valid',
          'CHK_tour_departures_dates_valid',
        ],
      ],
      [
        'bookings',
        ['CHK_bookings_quantity_positive', 'CHK_bookings_prices_non_negative'],
      ],
      ['reviews', ['CHK_reviews_rating_valid']],
    ]);

    for (const [tableName, checkNames] of expectedChecks) {
      expect(
        metadataFor(dataSource, tableName)
          .checks.map(({ name }) => name)
          .sort(),
      ).toEqual([...checkNames].sort());
    }

    const expectedIndexes = new Map([
      ['users', ['IDX_users_email_unique']],
      [
        'refresh_tokens',
        [
          'IDX_refresh_tokens_user_id',
          'IDX_refresh_tokens_hash_unique',
          'IDX_refresh_tokens_family_id',
        ],
      ],
      [
        'categories',
        ['IDX_categories_name_unique', 'IDX_categories_slug_unique'],
      ],
      [
        'tours',
        [
          'IDX_tours_status_category',
          'IDX_tours_created_at_id',
          'IDX_tours_category_id',
          'IDX_tours_created_by',
          'IDX_tours_code_unique',
          'IDX_tours_slug_unique',
        ],
      ],
      [
        'tour_departures',
        [
          'IDX_tour_departures_status_start_end',
          'IDX_tour_departures_tour_start',
          'IDX_tour_departures_tour_id',
        ],
      ],
      [
        'tour_images',
        [
          'IDX_tour_images_tour_sort',
          'IDX_tour_images_storage_key_unique',
          'IDX_tour_images_tour_id',
        ],
      ],
      [
        'bookings',
        [
          'IDX_bookings_user_created',
          'IDX_bookings_status_created',
          'IDX_bookings_user_idempotency',
          'IDX_bookings_booking_code_unique',
        ],
      ],
      [
        'booking_status_histories',
        ['IDX_booking_status_histories_booking_created'],
      ],
      [
        'reviews',
        ['IDX_reviews_user_tour_unique', 'IDX_reviews_tour_status_created'],
      ],
      [
        'social_accounts',
        [
          'IDX_social_accounts_provider_account_unique',
          'IDX_social_accounts_user_id',
        ],
      ],
    ]);

    for (const [tableName, indexNames] of expectedIndexes) {
      expect(
        metadataFor(dataSource, tableName)
          .indices.map(({ name }) => name)
          .sort(),
      ).toEqual([...indexNames].sort());
    }
  });
});
