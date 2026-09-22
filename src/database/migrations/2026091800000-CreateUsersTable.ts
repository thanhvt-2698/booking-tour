import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable2026091800000 implements MigrationInterface {
  name = 'CreateUsersTable2026091800000';

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "users"');
    await queryRunner.query('DROP TYPE "user_status_enum"');
    await queryRunner.query('DROP TYPE "user_role_enum"');
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(
      `CREATE TYPE "user_role_enum" AS ENUM ('ADMIN', 'USER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "user_status_enum" AS ENUM ('ACTIVE', 'BLOCKED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(254) NOT NULL,
        "username" character varying(30) NOT NULL,
        "password_hash" character varying(255),
        "role" "user_role_enum" NOT NULL DEFAULT 'USER',
        "status" "user_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "bio" text,
        "avatar_url" character varying(2048),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_users_email_unique" ON "users" ("email")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_users_username_unique" ON "users" ("username")',
    );
  }
}
