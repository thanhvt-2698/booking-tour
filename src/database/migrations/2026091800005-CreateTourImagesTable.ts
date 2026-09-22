import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTourImagesTable2026091800005 implements MigrationInterface {
  name = 'CreateTourImagesTable2026091800005';

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "tour_images"');
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tour_images" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tour_id" uuid NOT NULL,
        "storage_key" character varying(255) NOT NULL,
        "url" character varying(2048) NOT NULL,
        "original_name" character varying(255) NOT NULL,
        "mime_type" character varying(100) NOT NULL,
        "size_bytes" integer NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tour_images_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tour_images_tour" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_tour_images_storage_key_unique" ON "tour_images" ("storage_key")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_tour_images_tour_id" ON "tour_images" ("tour_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_tour_images_tour_sort" ON "tour_images" ("tour_id", "sort_order", "created_at")',
    );
  }
}
