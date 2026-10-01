import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewImages1790752417609 implements MigrationInterface {
  name = 'AddReviewImages1790752417609';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "review_images" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "review_id" uuid NOT NULL, "sort_order" integer NOT NULL, "storage_key" character varying(255) NOT NULL, "url" character varying(2048) NOT NULL, "mime_type" character varying(100) NOT NULL, "original_name" character varying(255) NOT NULL, "size_bytes" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_dfb8fbc1b0534f20de489a64358" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_review_images_storage_key_unique" ON "review_images" ("storage_key") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_review_images_review_sort" ON "review_images" ("review_id", "sort_order", "id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "review_images" ADD CONSTRAINT "FK_review_images_review" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "review_images" DROP CONSTRAINT "FK_review_images_review"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_review_images_review_sort"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_review_images_storage_key_unique"`,
    );
    await queryRunner.query(`DROP TABLE "review_images"`);
  }
}
