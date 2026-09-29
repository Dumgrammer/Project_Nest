import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthAuditEvents1727673000000 implements MigrationInterface {
  name = 'AddAuthAuditEvents1727673000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflow_auth_audit_events" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "ownerId" varchar NOT NULL DEFAULT 'public',
        "action" varchar NOT NULL,
        "reason" varchar NOT NULL,
        "authType" varchar,
        "method" varchar,
        "endpoint" varchar,
        "timestamp" datetime NOT NULL,
        "metadata" text
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workflow_auth_audit_events_owner_timestamp"
      ON "workflow_auth_audit_events" ("ownerId", "timestamp")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_workflow_auth_audit_events_owner_timestamp"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_auth_audit_events"`);
  }
}
