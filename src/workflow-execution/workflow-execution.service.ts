import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { randomUUID } from 'crypto';
import { Queue } from 'bullmq';
import {
  sanitizeForLog,
  validateWorkflowInput,
} from '../common/utils/sanitize.util.js';
import { ExecutionStoreService } from '../execution-store/execution-store.service.js';
import {
  WORKFLOW_QUEUE,
  WORKFLOW_EXECUTE_JOB,
} from '../queue/queue.constants.js';

@Injectable()
export class WorkflowExecutionService {
  private readonly logger = new Logger(WorkflowExecutionService.name);

  constructor(
    @InjectQueue(WORKFLOW_QUEUE) private readonly workflowQueue: Queue,
    private readonly executionStore: ExecutionStoreService,
  ) {}

  async trigger(
    ownerId: string,
    workflowId: string,
    input: Record<string, unknown>,
    correlationId?: string,
  ) {
    validateWorkflowInput(input);
    const executionId = randomUUID();

    await this.executionStore.createQueued({
      executionId,
      ownerId,
      workflowId,
      input,
      correlationId,
    });
    this.logger.log(
      JSON.stringify({
        message: 'Workflow queued',
        executionId,
        ownerId,
        workflowId,
        correlationId,
        input: sanitizeForLog(input),
      }),
    );

    try {
      await this.workflowQueue.add(
        WORKFLOW_EXECUTE_JOB,
        { executionId, ownerId, workflowId, input, correlationId },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    } catch (error) {
      await this.executionStore.markFailed(
        executionId,
        `Failed to queue job: ${(error as Error).message}`,
      );
      this.logger.error(
        JSON.stringify({
          message: 'Failed to queue workflow',
          executionId,
          ownerId,
          workflowId,
          correlationId,
          error: (error as Error).message,
        }),
      );
      throw error;
    }

    return { executionId, status: 'queued' };
  }
}
