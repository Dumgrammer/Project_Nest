import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sanitizeForLog } from '../common/utils/sanitize.util.js';
import { AuthAuditEventEntity } from './auth-audit-event.entity.js';

export interface AuthAuditEventRecord {
  id: number;
  ownerId: string;
  action: string;
  reason: string;
  authType?: string;
  method?: string;
  endpoint?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AuthAuditEventFilters {
  limit?: number;
  cursor?: number;
  from?: string;
  to?: string;
  reason?: string;
  authType?: string;
}

export interface AuthAuditEventPage {
  items: AuthAuditEventRecord[];
  nextCursor?: number;
}

@Injectable()
export class SecurityAuditService {
  constructor(
    @InjectRepository(AuthAuditEventEntity)
    private readonly auditRepo: Repository<AuthAuditEventEntity>,
  ) {}

  async recordDeniedAttempt(params: {
    ownerId?: string;
    action: string;
    reason: string;
    authType?: string;
    method?: string;
    endpoint?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const event = this.auditRepo.create({
      ownerId: params.ownerId ?? 'public',
      action: params.action,
      reason: params.reason,
      authType: params.authType,
      method: params.method,
      endpoint: params.endpoint,
      timestamp: new Date().toISOString(),
      metadata: params.metadata
        ? (sanitizeForLog(params.metadata) as Record<string, unknown>)
        : undefined,
    });
    await this.auditRepo.save(event);
  }

  async listByOwner(
    ownerId: string,
    filters: AuthAuditEventFilters = {},
  ): Promise<AuthAuditEventRecord[]> {
    const page = await this.listPageByOwner(ownerId, filters);
    return page.items;
  }

  async listPageByOwner(
    ownerId: string,
    filters: AuthAuditEventFilters = {},
  ): Promise<AuthAuditEventPage> {
    const max = Math.min(Math.max(filters.limit ?? 50, 1), 200);
    const query = this.auditRepo
      .createQueryBuilder('event')
      .where('event.ownerId = :ownerId', { ownerId })
      .orderBy('event.id', 'DESC')
      .take(max);

    if (filters.cursor && Number.isFinite(filters.cursor)) {
      query.andWhere('event.id < :cursor', { cursor: filters.cursor });
    }
    if (filters.from) {
      query.andWhere('event.timestamp >= :from', { from: filters.from });
    }
    if (filters.to) {
      query.andWhere('event.timestamp <= :to', { to: filters.to });
    }
    if (filters.reason) {
      query.andWhere('event.reason = :reason', { reason: filters.reason });
    }
    if (filters.authType) {
      query.andWhere('event.authType = :authType', { authType: filters.authType });
    }

    const events = await query.getMany();
    const items = events.map((event) => ({
      id: event.id,
      ownerId: event.ownerId,
      action: event.action,
      reason: event.reason,
      authType: event.authType,
      method: event.method,
      endpoint: event.endpoint,
      timestamp: event.timestamp,
      metadata: event.metadata,
    }));
    const nextCursor = items.length === max ? items[items.length - 1]?.id : undefined;
    return { items, nextCursor };
  }

  async exportCsvByOwner(
    ownerId: string,
    filters: AuthAuditEventFilters = {},
  ): Promise<string> {
    const events = await this.listByOwner(ownerId, filters);
    const header = [
      'id',
      'ownerId',
      'action',
      'reason',
      'authType',
      'method',
      'endpoint',
      'timestamp',
      'metadata',
    ];
    const rows = events.map((event) => [
      String(event.id),
      event.ownerId,
      event.action,
      event.reason,
      event.authType ?? '',
      event.method ?? '',
      event.endpoint ?? '',
      event.timestamp,
      event.metadata ? JSON.stringify(event.metadata) : '',
    ]);

    return [header, ...rows]
      .map((row) => row.map((value) => this.escapeCsv(value)).join(','))
      .join('\n');
  }

  private escapeCsv(value: string): string {
    if (value.includes('"') || value.includes(',') || value.includes('\n')) {
      return `"${value.replaceAll('"', '""')}"`;
    }
    return value;
  }
}
