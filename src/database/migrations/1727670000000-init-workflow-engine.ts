import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitWorkflowEngine1727670000000 implements MigrationInterface {
  name = 'InitWorkflowEngine1727670000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflow_definitions" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar NOT NULL,
        "version" integer NOT NULL,
        "nodes" text NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflow_executions" (
        "executionId" varchar PRIMARY KEY NOT NULL,
        "workflowId" varchar NOT NULL,
        "status" varchar NOT NULL,
        "correlationId" varchar,
        "input" text,
        "startedAt" datetime,
        "finishedAt" datetime,
        "error" text
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflow_execution_events" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "executionId" varchar NOT NULL,
        "type" varchar NOT NULL,
        "nodeId" varchar,
        "timestamp" datetime NOT NULL,
        "payload" text,
        CONSTRAINT "FK_workflow_execution_events_executionId"
          FOREIGN KEY ("executionId")
          REFERENCES "workflow_executions" ("executionId")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workflow_execution_events_executionId"
      ON "workflow_execution_events" ("executionId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workflow_execution_events_executionId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_execution_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_executions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_definitions"`);
  }
}
