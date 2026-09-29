import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Header } from '@nestjs/common';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { resolveOwnerId } from '../common/utils/owner.util.js';
import {
  AuthAuditEventFilters,
  SecurityAuditService,
} from './security-audit.service.js';

@Controller('security')
export class SecurityAuditController {
  constructor(private readonly securityAudit: SecurityAuditService) {}

  @UseGuards(ApiKeyGuard, PermissionsGuard)
  @RequirePermissions('security:audit:read')
  @Get('audit-events')
  async getAuditEvents(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('reason') reason?: string,
    @Query('authType') authType?: string,
  ) {
    const ownerId = resolveOwnerId({
      headers: req.headers as Record<string, unknown>,
      user: (req as Request & { user?: Record<string, unknown> }).user,
    });

    const filters = this.buildFilters({ limit, from, to, reason, authType });
    return this.securityAudit.listByOwner(ownerId, filters);
  }

  @UseGuards(ApiKeyGuard, PermissionsGuard)
  @RequirePermissions('security:audit:read')
  @Get('audit-events/page')
  async getAuditEventsPage(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('reason') reason?: string,
    @Query('authType') authType?: string,
  ) {
    const ownerId = resolveOwnerId({
      headers: req.headers as Record<string, unknown>,
      user: (req as Request & { user?: Record<string, unknown> }).user,
    });

    const filters = this.buildFilters({ limit, cursor, from, to, reason, authType });
    return this.securityAudit.listPageByOwner(ownerId, filters);
  }

  @UseGuards(ApiKeyGuard, PermissionsGuard)
  @RequirePermissions('security:audit:read')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="auth-audit-events.csv"')
  @Get('audit-events.csv')
  async exportAuditEventsCsv(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('reason') reason?: string,
    @Query('authType') authType?: string,
  ): Promise<string> {
    const ownerId = resolveOwnerId({
      headers: req.headers as Record<string, unknown>,
      user: (req as Request & { user?: Record<string, unknown> }).user,
    });

    const filters = this.buildFilters({ limit, cursor, from, to, reason, authType });
    return this.securityAudit.exportCsvByOwner(ownerId, filters);
  }

  private buildFilters(params: {
    limit?: string;
    cursor?: string;
    from?: string;
    to?: string;
    reason?: string;
    authType?: string;
  }): AuthAuditEventFilters {
    const parsedLimit = Number(params.limit ?? 50);
    const parsedCursor = this.parseCursor(params.cursor);
    const from = this.parseIsoTimestamp(params.from, 'from');
    const to = this.parseIsoTimestamp(params.to, 'to');
    if (from && to && from > to) {
      throw new BadRequestException('"from" must be earlier than or equal to "to"');
    }
    const authType = this.parseAuthType(params.authType);

    return {
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 50,
      cursor: parsedCursor,
      from: from?.toISOString(),
      to: to?.toISOString(),
      reason: params.reason?.trim() || undefined,
      authType,
    };
  }

  private parseCursor(cursor: string | undefined): number | undefined {
    if (!cursor || cursor.trim().length === 0) {
      return undefined;
    }
    const parsedCursor = Number(cursor);
    if (!Number.isInteger(parsedCursor) || parsedCursor <= 0) {
      throw new BadRequestException('"cursor" must be a positive integer');
    }
    return parsedCursor;
  }

  private parseIsoTimestamp(
    value: string | undefined,
    fieldName: 'from' | 'to',
  ): Date | undefined {
    if (!value || value.trim().length === 0) {
      return undefined;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`"${fieldName}" must be a valid ISO timestamp`);
    }
    return parsed;
  }

  private parseAuthType(value: string | undefined): string | undefined {
    if (!value || value.trim().length === 0) {
      return undefined;
    }
    const normalized = value.trim();
    if (normalized !== 'jwt' && normalized !== 'api_key') {
      throw new BadRequestException('"authType" must be one of: jwt, api_key');
    }
    return normalized;
  }
}
