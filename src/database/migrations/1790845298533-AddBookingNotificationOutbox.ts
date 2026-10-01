import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingNotificationOutbox1790845298533 implements MigrationInterface {
  name = 'AddBookingNotificationOutbox1790845298533';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."booking_notification_delivery_status_enum" AS ENUM('sent', 'skipped')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."booking_notification_outbox_kind_enum" AS ENUM('reminder', 'status')`,
    );
    await queryRunner.query(
      `CREATE TABLE "booking_notification_outbox" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "delivery_status" "public"."booking_notification_delivery_status_enum", "deduplication_key" character varying(255) NOT NULL, "dispatched_at" TIMESTAMP WITH TIME ZONE, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "last_checked_at" TIMESTAMP WITH TIME ZONE, "booking_id" uuid NOT NULL, "processed_at" TIMESTAMP WITH TIME ZONE, "reason" character varying(500), "recipient_user_id" uuid NOT NULL, "start_at" TIMESTAMP WITH TIME ZONE, "kind" "public"."booking_notification_outbox_kind_enum" NOT NULL, "status" "public"."booking_status_enum", CONSTRAINT "PK_f201e97a94f2b0ae1db841c2a15" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_booking_notification_outbox_pending" ON "booking_notification_outbox" ("processed_at", "last_checked_at", "created_at", "id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_booking_notification_outbox_deduplication_key" ON "booking_notification_outbox" ("deduplication_key") `,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_notification_outbox" ADD CONSTRAINT "FK_booking_notification_outbox_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking_notification_outbox" DROP CONSTRAINT "FK_booking_notification_outbox_booking"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_booking_notification_outbox_deduplication_key"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_booking_notification_outbox_pending"`,
    );
    await queryRunner.query(`DROP TABLE "booking_notification_outbox"`);
    await queryRunner.query(
      `DROP TYPE "public"."booking_notification_outbox_kind_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."booking_notification_delivery_status_enum"`,
    );
  }
}
