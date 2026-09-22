import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategoriesTable2026091800002 implements MigrationInterface {
  name = 'CreateCategoriesTable2026091800002';

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "categories"');
    await queryRunner.query('DROP TYPE "category_status_enum"');
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "category_status_enum" AS ENUM ('ACTIVE', 'INACTIVE')`,
    );
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "slug" character varying(120) NOT NULL,
        "description" text,
        "status" "category_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_categories_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_categories_name_unique" ON "categories" ("name")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_categories_slug_unique" ON "categories" ("slug")',
    );
  }
}
