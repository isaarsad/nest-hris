import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokensTable1787574133299 implements MigrationInterface {
  name = 'CreateRefreshTokensTable1787574133299';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "token_hash" character varying(64) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "absolute_expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "replaced_by_token_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

        CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" 
          PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_refresh_tokens_user_id" 
      ON "refresh_tokens" ("user_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_refresh_tokens_token_hash" 
      ON "refresh_tokens" ("token_hash")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_refresh_tokens_expires_at" 
      ON "refresh_tokens" ("expires_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_refresh_tokens_absolute_expires_at" 
      ON "refresh_tokens" ("absolute_expires_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" 
      ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" 
        FOREIGN KEY ("user_id") 
        REFERENCES "users"("id") 
        ON DELETE CASCADE 
        ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" 
      DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."idx_refresh_tokens_absolute_expires_at"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."idx_refresh_tokens_expires_at"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."idx_refresh_tokens_token_hash"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."idx_refresh_tokens_user_id"
    `);

    await queryRunner.query(`
      DROP TABLE "refresh_tokens"
    `);
  }
}
