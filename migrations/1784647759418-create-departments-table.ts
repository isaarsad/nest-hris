import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDepartmentsTable1784647759418 implements MigrationInterface {
  name = 'CreateDepartmentsTable1784647759418';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "departments" (
        "id" uuid NOT NULL,
        "name" citext NOT NULL,
        "code" citext NOT NULL,
        "head_employee_id" uuid,
        "parent_department_id" uuid,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,

        CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" 
          PRIMARY KEY ("id"),

        CONSTRAINT "UQ_DEPARTMENTS_NAME" 
          UNIQUE ("name"),

        CONSTRAINT "UQ_DEPARTMENTS_CODE" 
          UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_f4a832f1cb3b714ba6ae7c9287" 
      ON "departments" ("head_employee_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_2d6673ae91cee09bef47d2a5de" 
      ON "departments" ("parent_department_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "departments"
      ADD CONSTRAINT "FK_2d6673ae91cee09bef47d2a5de2"
      FOREIGN KEY ("parent_department_id")
      REFERENCES "departments" ("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "departments"
      DROP CONSTRAINT "FK_2d6673ae91cee09bef47d2a5de2"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_2d6673ae91cee09bef47d2a5de"
    `);

    await queryRunner.query(`
      DROP INDEX "public"."IDX_f4a832f1cb3b714ba6ae7c9287"
    `);

    await queryRunner.query(`
      DROP TABLE "departments"
    `);
  }
}
