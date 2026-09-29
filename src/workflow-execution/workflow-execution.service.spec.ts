import { ExecutionStoreService } from '../execution-store/execution-store.service.js';
import { WORKFLOW_EXECUTE_JOB } from '../queue/queue.constants.js';
import { WorkflowExecutionService } from './workflow-execution.service.js';

describe('WorkflowExecutionService', () => {
  it('returns existing execution for repeated idempotency key', async () => {
    const workflowQueue = {
      add: vi.fn(),
    };
    const executionStore = {
      findByIdempotencyKey: vi
        .fn()
        .mockResolvedValueOnce({
          executionId: 'exec-existing',
          status: 'queued',
        }),
      createQueued: vi.fn(),
    };

    const service = new WorkflowExecutionService(
      workflowQueue as any,
      executionStore as unknown as ExecutionStoreService,
    );

    const result = await service.trigger(
      'owner-1',
      'wf-1',
      { message: 'hello' },
      undefined,
      'idem-1',
    );

    expect(result).toEqual({ executionId: 'exec-existing', status: 'queued' });
    expect(executionStore.createQueued).not.toHaveBeenCalled();
    expect(workflowQueue.add).not.toHaveBeenCalled();
  });

  it('queues new execution and keeps failed jobs for dead-letter handling', async () => {
    const workflowQueue = {
      add: vi.fn().mockResolvedValue(undefined),
    };
    const executionStore = {
      findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      createQueued: vi.fn().mockResolvedValue(undefined),
    };

    const service = new WorkflowExecutionService(
      workflowQueue as any,
      executionStore as unknown as ExecutionStoreService,
    );

    const result = await service.trigger(
      'owner-1',
      'wf-1',
      { message: 'hello' },
      'corr-1',
      'idem-1',
    );

    expect(result.status).toBe('queued');
    expect(workflowQueue.add).toHaveBeenCalledWith(
      WORKFLOW_EXECUTE_JOB,
      expect.objectContaining({
        ownerId: 'owner-1',
        workflowId: 'wf-1',
        correlationId: 'corr-1',
        idempotencyKey: 'idem-1',
      }),
      expect.objectContaining({
        removeOnFail: false,
      }),
    );
  });
});
