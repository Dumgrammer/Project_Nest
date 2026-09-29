import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { WorkflowNode } from './workflow-definition.types.js';

@Entity({ name: 'workflow_definitions' })
export class WorkflowDefinitionEntity {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column({ type: 'varchar', default: 'public' })
  ownerId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'simple-json' })
  nodes!: WorkflowNode[];
}
