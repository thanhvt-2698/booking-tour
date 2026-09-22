import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSocialAccountsTable2026091800008 implements MigrationInterface {
  name = 'CreateSocialAccountsTable2026091800008';

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "social_accounts"');
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "social_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "provider" character varying(30) NOT NULL,
        "provider_account_id" character varying(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_social_accounts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_social_accounts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_social_accounts_provider_account_unique" ON "social_accounts" ("provider", "provider_account_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_social_accounts_user_id" ON "social_accounts" ("user_id")',
    );
  }
}
