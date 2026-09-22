import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReviewsTable2026091800007 implements MigrationInterface {
  name = 'CreateReviewsTable2026091800007';

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "reviews"');
    await queryRunner.query('DROP TYPE "review_status_enum"');
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "review_status_enum" AS ENUM ('PUBLISHED', 'HIDDEN', 'DELETED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "tour_id" uuid NOT NULL,
        "booking_id" uuid NOT NULL,
        "rating" smallint NOT NULL,
        "body" text NOT NULL,
        "status" "review_status_enum" NOT NULL DEFAULT 'PUBLISHED',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reviews_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_reviews_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_reviews_tour" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_reviews_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_reviews_rating_valid" CHECK ("rating" >= 1 AND "rating" <= 5)
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_reviews_user_tour_unique" ON "reviews" ("user_id", "tour_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_reviews_tour_status_created" ON "reviews" ("tour_id", "status", "created_at", "id")',
    );
  }
}
