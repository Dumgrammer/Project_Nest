import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { WorkflowRunnerService } from '../workflow-execution/workflow-runner.service.js';
import {
  WORKFLOW_DEAD_LETTER_JOB,
  WORKFLOW_DEAD_LETTER_QUEUE,
  WORKFLOW_QUEUE,
} from './queue.constants.js';

interface WorkflowExecuteJobData {
  executionId: string;
  ownerId: string;
  workflowId: string;
  input: Record<string, unknown>;
  correlationId?: string;
  idempotencyKey?: string;
}

interface WorkflowDeadLetterJobData extends WorkflowExecuteJobData {
  failedAt: string;
  attemptsMade: number;
  errorMessage: string;
}

@Processor(WORKFLOW_QUEUE)
export class WorkflowProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowProcessor.name);

  constructor(
    private readonly runner: WorkflowRunnerService,
    @InjectQueue(WORKFLOW_DEAD_LETTER_QUEUE)
    private readonly deadLetterQueue: Queue<WorkflowDeadLetterJobData>,
  ) {
    super();
  }

  async process(job: Job<WorkflowExecuteJobData>): Promise<void> {
    const { executionId, ownerId, workflowId, input } = job.data;

    try {
      await this.runner.run(executionId, ownerId, workflowId, input);
    } catch (error) {
      const attempts = Number(job.opts.attempts ?? 1);
      const attemptsMade = job.attemptsMade + 1;
      const isFinalAttempt = attemptsMade >= attempts;
      const message = (error as Error).message;

      if (isFinalAttempt) {
        await this.deadLetterQueue.add(
          WORKFLOW_DEAD_LETTER_JOB,
          {
            ...job.data,
            failedAt: new Date().toISOString(),
            attemptsMade,
            errorMessage: message,
          },
          {
            removeOnComplete: false,
            removeOnFail: false,
          },
        );

        this.logger.error(
          JSON.stringify({
            message: 'Workflow moved to dead-letter queue',
            executionId,
            ownerId,
            workflowId,
            attemptsMade,
            error: message,
          }),
        );
      }

      throw error;
    }
  }
}
