import { WorkflowRunnerService } from '../workflow-execution/workflow-runner.service.js';
import { WORKFLOW_DEAD_LETTER_JOB } from './queue.constants.js';
import { WorkflowProcessor } from './workflow.processor.js';

describe('WorkflowProcessor', () => {
  it('pushes to dead-letter queue on final failed attempt', async () => {
    const runner = {
      run: vi.fn().mockRejectedValue(new Error('boom')),
    };
    const deadLetterQueue = {
      add: vi.fn().mockResolvedValue(undefined),
    };
    const processor = new WorkflowProcessor(
      runner as unknown as WorkflowRunnerService,
      deadLetterQueue as any,
    );

    const job = {
      data: {
        executionId: 'exec-1',
        ownerId: 'owner-1',
        workflowId: 'wf-1',
        input: { hello: 'world' },
        idempotencyKey: 'idem-1',
      },
      attemptsMade: 2,
      opts: { attempts: 3 },
    };

    await expect(processor.process(job as any)).rejects.toThrow('boom');
    expect(deadLetterQueue.add).toHaveBeenCalledWith(
      WORKFLOW_DEAD_LETTER_JOB,
      expect.objectContaining({
        executionId: 'exec-1',
        attemptsMade: 3,
        errorMessage: 'boom',
      }),
      expect.objectContaining({
        removeOnComplete: false,
        removeOnFail: false,
      }),
    );
  });

  it('does not push to dead-letter queue before final attempt', async () => {
    const runner = {
      run: vi.fn().mockRejectedValue(new Error('boom')),
    };
    const deadLetterQueue = {
      add: vi.fn().mockResolvedValue(undefined),
    };
    const processor = new WorkflowProcessor(
      runner as unknown as WorkflowRunnerService,
      deadLetterQueue as any,
    );

    const job = {
      data: {
        executionId: 'exec-1',
        ownerId: 'owner-1',
        workflowId: 'wf-1',
        input: { hello: 'world' },
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
    };

    await expect(processor.process(job as any)).rejects.toThrow('boom');
    expect(deadLetterQueue.add).not.toHaveBeenCalled();
  });
});
