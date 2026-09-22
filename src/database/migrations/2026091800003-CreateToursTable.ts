import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateToursTable2026091800003 implements MigrationInterface {
  name = 'CreateToursTable2026091800003';

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "tours"');
    await queryRunner.query('DROP TYPE "tour_status_enum"');
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "tour_status_enum" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "tours" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "category_id" uuid NOT NULL,
        "created_by" uuid NOT NULL,
        "code" character varying(50) NOT NULL,
        "slug" character varying(180) NOT NULL,
        "title" character varying(200) NOT NULL,
        "description" text NOT NULL,
        "base_price" numeric(12,2) NOT NULL,
        "currency" character(3) NOT NULL DEFAULT 'VND',
        "status" "tour_status_enum" NOT NULL DEFAULT 'DRAFT',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tours_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tours_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_tours_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_tours_code_unique" ON "tours" ("code")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_tours_slug_unique" ON "tours" ("slug")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_tours_category_id" ON "tours" ("category_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_tours_created_by" ON "tours" ("created_by")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_tours_status_category" ON "tours" ("status", "category_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_tours_created_at_id" ON "tours" ("created_at", "id")',
    );
  }
}
