import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ExecutionRecordEntity } from './execution-record.entity.js';

@Entity({ name: 'workflow_execution_events' })
export class ExecutionEventEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  executionId!: string;

  @Column({ type: 'varchar' })
  type!: string;

  @Column({ type: 'varchar', nullable: true })
  nodeId?: string;

  @Column({ type: 'datetime' })
  timestamp!: string;

  @Column({ type: 'simple-json', nullable: true })
  payload?: Record<string, unknown>;

  @ManyToOne(() => ExecutionRecordEntity, (execution) => execution.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'executionId', referencedColumnName: 'executionId' })
  execution!: ExecutionRecordEntity;
}
