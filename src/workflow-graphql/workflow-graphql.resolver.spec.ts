import { WorkflowGraphqlResolver } from './workflow-graphql.resolver.js';

describe('WorkflowGraphqlResolver', () => {
  const workflowExecutionService = {
    trigger: vi.fn(),
  };
  const executionStoreService = {
    getRecord: vi.fn(),
    getEvents: vi.fn(),
  };
  const workflowDefinitionService = {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  const securityAuditService = {
    listByOwner: vi.fn(),
    listPageByOwner: vi.fn(),
    exportCsvByOwner: vi.fn(),
  };

  const resolver = new WorkflowGraphqlResolver(
    workflowExecutionService as any,
    executionStoreService as any,
    workflowDefinitionService as any,
    securityAuditService as any,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns workflow definitions', async () => {
    workflowDefinitionService.list.mockReturnValue([{ id: 'wf-hello' }]);
    const ctx = { req: { headers: { 'x-owner-id': 'owner-1' } } };

    const result = await resolver.workflowDefinitions(ctx as any);

    expect(result).toEqual([{ id: 'wf-hello' }]);
    expect(workflowDefinitionService.list).toHaveBeenCalledWith('owner-1');
  });

  it('delegates execution query to store', async () => {
    executionStoreService.getRecord.mockReturnValue({ executionId: 'exec-1' });

    const ctx = { req: { headers: { 'x-owner-id': 'owner-1' } } };
    const result = await resolver.execution(ctx as any, 'exec-1');

    expect(result).toEqual({ executionId: 'exec-1' });
    expect(executionStoreService.getRecord).toHaveBeenCalledWith('exec-1', 'owner-1');
  });

  it('delegates execution events query to store', async () => {
    executionStoreService.getEvents.mockReturnValue([{ type: 'execution.started' }]);

    const ctx = { req: { headers: { 'x-owner-id': 'owner-1' } } };
    const result = await resolver.executionEvents(ctx as any, 'exec-1');

    expect(result).toEqual([{ type: 'execution.started' }]);
    expect(executionStoreService.getEvents).toHaveBeenCalledWith('exec-1', 'owner-1');
  });

  it('delegates auth audit query to audit service', async () => {
    securityAuditService.listByOwner.mockResolvedValue([{ id: 1 }]);

    const ctx = { req: { headers: { 'x-owner-id': 'owner-1' } } };
    const result = await resolver.authAuditEvents(
      ctx as any,
      25,
      300,
      '2026-09-01T00:00:00.000Z',
      '2026-09-30T23:59:59.999Z',
      'auth.permissions.missing',
      'jwt',
    );

    expect(result).toEqual([{ id: 1 }]);
    expect(securityAuditService.listByOwner).toHaveBeenCalledWith('owner-1', {
      limit: 25,
      cursor: 300,
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.999Z',
      reason: 'auth.permissions.missing',
      authType: 'jwt',
    });
  });

  it('delegates auth audit paged query to audit service', async () => {
    securityAuditService.listPageByOwner.mockResolvedValue({
      items: [{ id: 2 }],
      nextCursor: 2,
    });
    const ctx = { req: { headers: { 'x-owner-id': 'owner-1' } } };
    const result = await resolver.authAuditEventsPage(ctx as any, 10, 100);

    expect(result).toEqual({ items: [{ id: 2 }], nextCursor: 2 });
    expect(securityAuditService.listPageByOwner).toHaveBeenCalledWith('owner-1', {
      limit: 10,
      cursor: 100,
      from: undefined,
      to: undefined,
      reason: undefined,
      authType: undefined,
    });
  });

  it('delegates audit CSV export to audit service', async () => {
    securityAuditService.exportCsvByOwner.mockResolvedValue('id,ownerId');

    const ctx = { req: { headers: { 'x-owner-id': 'owner-1' } } };
    const result = await resolver.authAuditEventsCsv(
      ctx as any,
      10,
      50,
      undefined,
      undefined,
      'auth.api_key.invalid',
      'api_key',
    );

    expect(result).toBe('id,ownerId');
    expect(securityAuditService.exportCsvByOwner).toHaveBeenCalledWith('owner-1', {
      limit: 10,
      cursor: 50,
      from: undefined,
      to: undefined,
      reason: 'auth.api_key.invalid',
      authType: 'api_key',
    });
  });

  it('triggers workflow mutation through service', async () => {
    workflowExecutionService.trigger.mockResolvedValue({
      executionId: 'exec-2',
      status: 'queued',
    });

    const ctx = { req: { headers: { 'x-owner-id': 'owner-1' } } };
    const result = await resolver.triggerWorkflow(ctx as any, {
      workflowId: 'wf-hello',
      input: { message: 'hello' },
      correlationId: 'corr-123',
      idempotencyKey: 'idem-123',
    });

    expect(result).toEqual({
      executionId: 'exec-2',
      status: 'queued',
    });
    expect(workflowExecutionService.trigger).toHaveBeenCalledWith(
      'owner-1',
      'wf-hello',
      { message: 'hello' },
      'corr-123',
      'idem-123',
    );
  });

  it('creates workflow definition through service', async () => {
    workflowDefinitionService.create.mockResolvedValue({ id: 'wf-new' });

    const ctx = { req: { headers: { 'x-owner-id': 'owner-1' } } };
    const result = await resolver.createWorkflowDefinition(ctx as any, {
      id: 'wf-new',
      name: 'Workflow New',
      version: 1,
      nodes: [{ id: 'n1', type: 'http.webhook', config: {} }],
    });

    expect(result).toEqual({ id: 'wf-new' });
    expect(workflowDefinitionService.create).toHaveBeenCalledWith(
      {
        id: 'wf-new',
        name: 'Workflow New',
        version: 1,
        nodes: [{ id: 'n1', type: 'http.webhook', config: {} }],
      },
      'owner-1',
    );
  });

  it('updates workflow definition through service', async () => {
    workflowDefinitionService.update.mockResolvedValue({ id: 'wf-new', name: 'Updated' });

    const ctx = { req: { headers: { 'x-owner-id': 'owner-1' } } };
    const result = await resolver.updateWorkflowDefinition(ctx as any, 'wf-new', {
      name: 'Updated',
    });

    expect(result).toEqual({ id: 'wf-new', name: 'Updated' });
    expect(workflowDefinitionService.update).toHaveBeenCalledWith(
      'wf-new',
      {
        name: 'Updated',
        nodes: undefined,
      },
      'owner-1',
    );
  });

  it('deletes workflow definition through service', async () => {
    workflowDefinitionService.remove.mockResolvedValue(true);

    const ctx = { req: { headers: { 'x-owner-id': 'owner-1' } } };
    const result = await resolver.deleteWorkflowDefinition(ctx as any, 'wf-new');

    expect(result).toBe(true);
    expect(workflowDefinitionService.remove).toHaveBeenCalledWith('wf-new', 'owner-1');
  });
});
