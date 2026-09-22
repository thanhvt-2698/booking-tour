import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingsTables2026091800006 implements MigrationInterface {
  name = 'CreateBookingsTables2026091800006';

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "booking_status_histories"');
    await queryRunner.query('DROP TABLE "bookings"');
    await queryRunner.query('DROP TYPE "booking_status_enum"');
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "booking_status_enum" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "booking_code" character varying(30) NOT NULL,
        "user_id" uuid NOT NULL,
        "departure_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unit_price" numeric(12,2) NOT NULL,
        "total_amount" numeric(12,2) NOT NULL,
        "currency" character(3) NOT NULL,
        "status" "booking_status_enum" NOT NULL DEFAULT 'PENDING',
        "cancel_reason" character varying(500),
        "idempotency_key" character varying(100),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bookings_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bookings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_bookings_departure" FOREIGN KEY ("departure_id") REFERENCES "tour_departures"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_bookings_quantity_positive" CHECK ("quantity" > 0),
        CONSTRAINT "CHK_bookings_prices_non_negative" CHECK ("unit_price" >= 0 AND "total_amount" >= 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "booking_status_histories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "booking_id" uuid NOT NULL,
        "actor_user_id" uuid,
        "from_status" "booking_status_enum",
        "to_status" "booking_status_enum" NOT NULL,
        "reason" character varying(500),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_booking_status_histories_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_booking_status_histories_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_booking_status_histories_actor" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_bookings_booking_code_unique" ON "bookings" ("booking_code")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_bookings_user_idempotency" ON "bookings" ("user_id", "idempotency_key")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_bookings_user_created" ON "bookings" ("user_id", "created_at", "id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_bookings_status_created" ON "bookings" ("status", "created_at", "id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_booking_status_histories_booking_created" ON "booking_status_histories" ("booking_id", "created_at")',
    );
  }
}
