import { SecurityAuditService } from './security-audit.service.js';

describe('SecurityAuditService', () => {
  it('exports CSV with escaping and selected fields', async () => {
    const service = new SecurityAuditService({} as any);
    vi.spyOn(service, 'listByOwner').mockResolvedValue([
      {
        id: 1,
        ownerId: 'owner-1',
        action: 'WorkflowGraphqlResolver.authAuditEvents',
        reason: 'auth.permissions.missing',
        authType: 'jwt',
        method: 'POST',
        endpoint: '/graphql',
        timestamp: '2026-09-29T00:00:00.000Z',
        metadata: { message: 'needs "escaping", yes' },
      },
    ]);

    const csv = await service.exportCsvByOwner('owner-1', { limit: 10 });
    const lines = csv.split('\n');

    expect(lines[0]).toContain('id,ownerId,action,reason');
    expect(lines[1]).toContain('owner-1');
    expect(lines[1]).toContain('auth.permissions.missing');
    expect(lines[1]).toContain('"{""message""');
  });
});
