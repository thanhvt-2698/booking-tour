import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1790050446359 implements MigrationInterface {
  name = 'InitialSchema1790050446359';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying(128) NOT NULL, "family_id" uuid NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_refresh_tokens_hash_unique" ON "refresh_tokens" ("token_hash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_family_id" ON "refresh_tokens" ("family_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "social_accounts" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider_account_id" character varying(255) NOT NULL, "provider" character varying(30) NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, CONSTRAINT "PK_e9e58d2d8e9fafa20af914d9750" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_social_accounts_user_id" ON "social_accounts" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_social_accounts_provider_account_unique" ON "social_accounts" ("provider", "provider_account_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."category_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "slug" character varying(120) NOT NULL, "description" text, "status" "public"."category_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_categories_name_unique" ON "categories" ("name") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_categories_slug_unique" ON "categories" ("slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE "tour_images" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "mime_type" character varying(100) NOT NULL, "original_name" character varying(255) NOT NULL, "size_bytes" integer NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "storage_key" character varying(255) NOT NULL, "url" character varying(2048) NOT NULL, "tour_id" uuid NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5162b01f186510c358c0f8be135" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_tour_images_storage_key_unique" ON "tour_images" ("storage_key") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tour_images_tour_id" ON "tour_images" ("tour_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tour_images_tour_sort" ON "tour_images" ("tour_id", "sort_order", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."review_status_enum" AS ENUM('DELETED', 'HIDDEN', 'PUBLISHED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reviews" ("booking_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "body" text NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "rating" smallint NOT NULL, "status" "public"."review_status_enum" NOT NULL DEFAULT 'PUBLISHED', "tour_id" uuid NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, CONSTRAINT "CHK_reviews_rating_valid" CHECK ("rating" >= 1 AND "rating" <= 5), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reviews_tour_status_created" ON "reviews" ("tour_id", "status", "created_at", "id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_reviews_user_tour_unique" ON "reviews" ("user_id", "tour_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tour_status_enum" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tours" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "category_id" uuid NOT NULL, "created_by" uuid NOT NULL, "code" character varying(50) NOT NULL, "slug" character varying(180) NOT NULL, "title" character varying(200) NOT NULL, "description" text NOT NULL, "base_price" numeric(12,2) NOT NULL, "currency" character(3) NOT NULL DEFAULT 'VND', "status" "public"."tour_status_enum" NOT NULL DEFAULT 'DRAFT', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2202ba445792c1ad0edf2de8de2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tours_category_id" ON "tours" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tours_created_by" ON "tours" ("created_by") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_tours_code_unique" ON "tours" ("code") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_tours_slug_unique" ON "tours" ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tours_created_at_id" ON "tours" ("created_at", "id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tours_status_category" ON "tours" ("status", "category_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."departure_status_enum" AS ENUM('OPEN', 'CLOSED', 'CANCELLED', 'COMPLETED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tour_departures" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "booking_deadline" TIMESTAMP WITH TIME ZONE, "capacity" integer NOT NULL, "booked_seats" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "end_at" TIMESTAMP WITH TIME ZONE NOT NULL, "tour_id" uuid NOT NULL, "status" "public"."departure_status_enum" NOT NULL DEFAULT 'OPEN', "start_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_tour_departures_dates_valid" CHECK ("end_at" > "start_at" AND ("booking_deadline" IS NULL OR "booking_deadline" <= "start_at")), CONSTRAINT "CHK_tour_departures_booked_seats_valid" CHECK ("booked_seats" >= 0 AND "booked_seats" <= "capacity"), CONSTRAINT "CHK_tour_departures_capacity_positive" CHECK ("capacity" > 0), CONSTRAINT "PK_5499d53430d54ba9b6a0d902ca2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tour_departures_tour_id" ON "tour_departures" ("tour_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tour_departures_tour_start" ON "tour_departures" ("tour_id", "start_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tour_departures_status_start_end" ON "tour_departures" ("status", "start_at", "end_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."booking_status_enum" AS ENUM('APPROVED', 'CANCELLED', 'PENDING', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "bookings" ("booking_code" character varying(30) NOT NULL, "currency" character(3) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "departure_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "idempotency_key" character varying(100), "cancel_reason" character varying(500), "total_amount" numeric(12,2) NOT NULL, "status" "public"."booking_status_enum" NOT NULL DEFAULT 'PENDING', "unit_price" numeric(12,2) NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "quantity" integer NOT NULL, CONSTRAINT "CHK_bookings_prices_non_negative" CHECK ("unit_price" >= 0 AND "total_amount" >= 0), CONSTRAINT "CHK_bookings_quantity_positive" CHECK ("quantity" > 0), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bookings_booking_code_unique" ON "bookings" ("booking_code") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bookings_user_idempotency" ON "bookings" ("user_id", "idempotency_key") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_status_created" ON "bookings" ("status", "created_at", "id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_user_created" ON "bookings" ("user_id", "created_at", "id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "booking_status_histories" ("actor_user_id" uuid, "booking_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "from_status" "public"."booking_status_enum", "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reason" character varying(500), "to_status" "public"."booking_status_enum" NOT NULL, CONSTRAINT "PK_cf024125193d381e989bfefa3de" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_booking_status_histories_booking_created" ON "booking_status_histories" ("booking_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('ADMIN', 'USER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_status_enum" AS ENUM('ACTIVE', 'BLOCKED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(254) NOT NULL, "password_hash" character varying(255), "role" "public"."user_role_enum" NOT NULL DEFAULT 'USER', "status" "public"."user_status_enum" NOT NULL DEFAULT 'ACTIVE', "bio" text, "avatar_url" character varying(2048), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_email_unique" ON "users" ("email") `,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_accounts" ADD CONSTRAINT "FK_social_accounts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tour_images" ADD CONSTRAINT "FK_tour_images_tour" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_tour" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tours" ADD CONSTRAINT "FK_tours_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tours" ADD CONSTRAINT "FK_tours_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tour_departures" ADD CONSTRAINT "FK_tour_departures_tour" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "FK_bookings_departure" FOREIGN KEY ("departure_id") REFERENCES "tour_departures"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "FK_bookings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_status_histories" ADD CONSTRAINT "FK_booking_status_histories_actor" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_status_histories" ADD CONSTRAINT "FK_booking_status_histories_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking_status_histories" DROP CONSTRAINT "FK_booking_status_histories_booking"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_status_histories" DROP CONSTRAINT "FK_booking_status_histories_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "FK_bookings_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "FK_bookings_departure"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tour_departures" DROP CONSTRAINT "FK_tour_departures_tour"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tours" DROP CONSTRAINT "FK_tours_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tours" DROP CONSTRAINT "FK_tours_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_tour"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_booking"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tour_images" DROP CONSTRAINT "FK_tour_images_tour"`,
    );
    await queryRunner.query(
      `ALTER TABLE "social_accounts" DROP CONSTRAINT "FK_social_accounts_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_user_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_users_email_unique"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."user_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_booking_status_histories_booking_created"`,
    );
    await queryRunner.query(`DROP TABLE "booking_status_histories"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bookings_user_created"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bookings_status_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bookings_user_idempotency"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bookings_booking_code_unique"`,
    );
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(`DROP TYPE "public"."booking_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tour_departures_status_start_end"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tour_departures_tour_start"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tour_departures_tour_id"`,
    );
    await queryRunner.query(`DROP TABLE "tour_departures"`);
    await queryRunner.query(`DROP TYPE "public"."departure_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tours_status_category"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tours_created_at_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tours_slug_unique"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tours_code_unique"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tours_created_by"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tours_category_id"`);
    await queryRunner.query(`DROP TABLE "tours"`);
    await queryRunner.query(`DROP TYPE "public"."tour_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_reviews_user_tour_unique"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_reviews_tour_status_created"`,
    );
    await queryRunner.query(`DROP TABLE "reviews"`);
    await queryRunner.query(`DROP TYPE "public"."review_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tour_images_tour_sort"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tour_images_tour_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tour_images_storage_key_unique"`,
    );
    await queryRunner.query(`DROP TABLE "tour_images"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_categories_slug_unique"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_categories_name_unique"`);
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TYPE "public"."category_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_social_accounts_provider_account_unique"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_social_accounts_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "social_accounts"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_refresh_tokens_user_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_refresh_tokens_family_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_refresh_tokens_hash_unique"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
