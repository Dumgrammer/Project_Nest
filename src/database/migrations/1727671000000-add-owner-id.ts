import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOwnerId1727671000000 implements MigrationInterface {
  name = 'AddOwnerId1727671000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workflow_definitions"
      ADD COLUMN "ownerId" varchar NOT NULL DEFAULT 'public'
    `);

    await queryRunner.query(`
      ALTER TABLE "workflow_executions"
      ADD COLUMN "ownerId" varchar NOT NULL DEFAULT 'public'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workflow_definitions_ownerId"
      ON "workflow_definitions" ("ownerId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workflow_executions_ownerId"
      ON "workflow_executions" ("ownerId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workflow_executions_ownerId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workflow_definitions_ownerId"`);
    await queryRunner.query(`ALTER TABLE "workflow_executions" DROP COLUMN "ownerId"`);
    await queryRunner.query(`ALTER TABLE "workflow_definitions" DROP COLUMN "ownerId"`);
  }
}
