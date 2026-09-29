import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { ExecutionEventEntity } from './execution-event.entity.js';

@Entity({ name: 'workflow_executions' })
export class ExecutionRecordEntity {
  @PrimaryColumn({ type: 'varchar' })
  executionId!: string;

  @Column({ type: 'varchar', default: 'public' })
  ownerId!: string;

  @Column({ type: 'varchar' })
  workflowId!: string;

  @Column({ type: 'varchar' })
  status!: string;

  @Column({ type: 'varchar', nullable: true })
  correlationId?: string;

  @Column({ type: 'varchar', nullable: true })
  idempotencyKey?: string;

  @Column({ type: 'simple-json', nullable: true })
  input?: Record<string, unknown>;

  @Column({ type: 'datetime', nullable: true })
  startedAt?: string;

  @Column({ type: 'datetime', nullable: true })
  finishedAt?: string;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @OneToMany(() => ExecutionEventEntity, (event) => event.execution, {
    cascade: false,
  })
  events?: ExecutionEventEntity[];
}
