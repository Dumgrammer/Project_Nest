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
    idempotencyKey?: string,
  ) {
    validateWorkflowInput(input);
    const normalizedIdempotencyKey = idempotencyKey?.trim() || undefined;
    if (normalizedIdempotencyKey) {
      const existing = await this.executionStore.findByIdempotencyKey(
        ownerId,
        workflowId,
        normalizedIdempotencyKey,
      );
      if (existing) {
        this.logger.log(
          JSON.stringify({
            message: 'Idempotent trigger replayed existing execution',
            ownerId,
            workflowId,
            executionId: existing.executionId,
            idempotencyKey: normalizedIdempotencyKey,
          }),
        );
        return { executionId: existing.executionId, status: existing.status };
      }
    }

    const executionId = randomUUID();

    try {
      await this.executionStore.createQueued({
        executionId,
        ownerId,
        workflowId,
        input,
        correlationId,
        idempotencyKey: normalizedIdempotencyKey,
      });
    } catch (error) {
      // Handles concurrent requests with the same idempotency key.
      if (normalizedIdempotencyKey) {
        const existing = await this.executionStore.findByIdempotencyKey(
          ownerId,
          workflowId,
          normalizedIdempotencyKey,
        );
        if (existing) {
          return { executionId: existing.executionId, status: existing.status };
        }
      }
      throw error;
    }
    this.logger.log(
      JSON.stringify({
        message: 'Workflow queued',
        executionId,
        ownerId,
        workflowId,
        correlationId,
        idempotencyKey: normalizedIdempotencyKey,
        input: sanitizeForLog(input),
      }),
    );

    try {
      await this.workflowQueue.add(
        WORKFLOW_EXECUTE_JOB,
        {
          executionId,
          ownerId,
          workflowId,
          input,
          correlationId,
          idempotencyKey: normalizedIdempotencyKey,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
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
