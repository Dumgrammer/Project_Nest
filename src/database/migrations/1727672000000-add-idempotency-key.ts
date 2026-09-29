import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdempotencyKey1727672000000 implements MigrationInterface {
  name = 'AddIdempotencyKey1727672000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workflow_executions"
      ADD COLUMN "idempotencyKey" varchar
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_workflow_executions_owner_workflow_idempotency"
      ON "workflow_executions" ("ownerId", "workflowId", "idempotencyKey")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_workflow_executions_owner_workflow_idempotency"`,
    );
    await queryRunner.query(`ALTER TABLE "workflow_executions" DROP COLUMN "idempotencyKey"`);
  }
}
