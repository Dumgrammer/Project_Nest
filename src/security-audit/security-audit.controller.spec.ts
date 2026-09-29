import type { Request } from 'express';
import { BadRequestException } from '@nestjs/common';
import { SecurityAuditController } from './security-audit.controller.js';

describe('SecurityAuditController', () => {
  const securityAudit = {
    listByOwner: vi.fn(),
    listPageByOwner: vi.fn(),
    exportCsvByOwner: vi.fn(),
  };

  const controller = new SecurityAuditController(securityAudit as any);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes filters to list endpoint', async () => {
    securityAudit.listByOwner.mockResolvedValue([]);
    const req = {
      headers: { 'x-owner-id': 'owner-1' },
    } as unknown as Request;

    await controller.getAuditEvents(
      req,
      '10',
      '2026-09-01T00:00:00.000Z',
      '2026-09-30T23:59:59.999Z',
      'auth.permissions.missing',
      'jwt',
    );

    expect(securityAudit.listByOwner).toHaveBeenCalledWith('owner-1', {
      limit: 10,
      cursor: undefined,
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.999Z',
      reason: 'auth.permissions.missing',
      authType: 'jwt',
    });
  });

  it('passes filters to paged endpoint', async () => {
    securityAudit.listPageByOwner.mockResolvedValue({ items: [], nextCursor: 10 });
    const req = {
      headers: { 'x-owner-id': 'owner-1' },
    } as unknown as Request;

    await controller.getAuditEventsPage(
      req,
      '10',
      '120',
      undefined,
      undefined,
      'auth.jwt.invalid',
      'jwt',
    );

    expect(securityAudit.listPageByOwner).toHaveBeenCalledWith('owner-1', {
      limit: 10,
      cursor: 120,
      from: undefined,
      to: undefined,
      reason: 'auth.jwt.invalid',
      authType: 'jwt',
    });
  });

  it('passes filters to csv export endpoint', async () => {
    securityAudit.exportCsvByOwner.mockResolvedValue('id,ownerId');
    const req = {
      headers: { 'x-owner-id': 'owner-1' },
    } as unknown as Request;

    await controller.exportAuditEventsCsv(
      req,
      '5',
      '99',
      undefined,
      undefined,
      undefined,
      'api_key',
    );

    expect(securityAudit.exportCsvByOwner).toHaveBeenCalledWith('owner-1', {
      limit: 5,
      cursor: 99,
      from: undefined,
      to: undefined,
      reason: undefined,
      authType: 'api_key',
    });
  });

  it('rejects invalid cursor', async () => {
    const req = {
      headers: { 'x-owner-id': 'owner-1' },
    } as unknown as Request;

    await expect(controller.getAuditEventsPage(req, '10', '-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects invalid timestamp range', async () => {
    const req = {
      headers: { 'x-owner-id': 'owner-1' },
    } as unknown as Request;

    await expect(
      controller.getAuditEvents(
        req,
        '10',
        '2026-10-01T00:00:00.000Z',
        '2026-09-01T00:00:00.000Z',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects unsupported authType', async () => {
    const req = {
      headers: { 'x-owner-id': 'owner-1' },
    } as unknown as Request;

    await expect(
      controller.getAuditEvents(req, '10', undefined, undefined, undefined, 'basic'),
    ).rejects.toThrow(BadRequestException);
  });
});
