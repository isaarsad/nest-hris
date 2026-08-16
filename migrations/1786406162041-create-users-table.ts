import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1786406162041 implements MigrationInterface {
  name = 'CreateUsersTable1786406162041';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL,
        "username" citext NOT NULL,
        "email" citext NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "role" character varying(20) NOT NULL DEFAULT 'EMPLOYEE',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,

        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" 
          PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" 
      ON "users" ("role")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_USERS_EMAIL_ACTIVE" 
      ON "users" ("email") 
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_USERS_USERNAME_ACTIVE" 
      ON "users" ("username") 
      WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."UQ_USERS_USERNAME_ACTIVE"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."UQ_USERS_EMAIL_ACTIVE"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_ace513fa30d485cfd25c11a9e4"
    `);

    await queryRunner.query(`
      DROP TABLE "users"
    `);
  }
}
