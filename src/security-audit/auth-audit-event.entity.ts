import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'workflow_auth_audit_events' })
export class AuthAuditEventEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', default: 'public' })
  ownerId!: string;

  @Column({ type: 'varchar' })
  action!: string;

  @Column({ type: 'varchar' })
  reason!: string;

  @Column({ type: 'varchar', nullable: true })
  authType?: string;

  @Column({ type: 'varchar', nullable: true })
  method?: string;

  @Column({ type: 'varchar', nullable: true })
  endpoint?: string;

  @Column({ type: 'datetime' })
  timestamp!: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown>;
}
