import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTourDeparturesTable2026091800004 implements MigrationInterface {
  name = 'CreateTourDeparturesTable2026091800004';

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "tour_departures"');
    await queryRunner.query('DROP TYPE "departure_status_enum"');
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "departure_status_enum" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED', 'COMPLETED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "tour_departures" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tour_id" uuid NOT NULL,
        "start_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "booking_deadline" TIMESTAMP WITH TIME ZONE,
        "capacity" integer NOT NULL,
        "booked_seats" integer NOT NULL DEFAULT 0,
        "status" "departure_status_enum" NOT NULL DEFAULT 'OPEN',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tour_departures_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tour_departures_tour" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_tour_departures_capacity_positive" CHECK ("capacity" > 0),
        CONSTRAINT "CHK_tour_departures_booked_seats_valid" CHECK ("booked_seats" >= 0 AND "booked_seats" <= "capacity"),
        CONSTRAINT "CHK_tour_departures_dates_valid" CHECK ("end_at" > "start_at" AND ("booking_deadline" IS NULL OR "booking_deadline" <= "start_at"))
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_tour_departures_tour_id" ON "tour_departures" ("tour_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_tour_departures_status_start_end" ON "tour_departures" ("status", "start_at", "end_at")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_tour_departures_tour_start" ON "tour_departures" ("tour_id", "start_at")',
    );
  }
}
