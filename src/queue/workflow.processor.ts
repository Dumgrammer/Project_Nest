import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WorkflowRunnerService } from '../workflow-execution/workflow-runner.service.js';
import { WORKFLOW_QUEUE } from './queue.constants.js';

interface WorkflowExecuteJobData {
  executionId: string;
  ownerId: string;
  workflowId: string;
  input: Record<string, unknown>;
}

@Processor(WORKFLOW_QUEUE)
export class WorkflowProcessor extends WorkerHost {
  constructor(private readonly runner: WorkflowRunnerService) {
    super();
  }

  async process(job: Job<WorkflowExecuteJobData>): Promise<void> {
    const { executionId, ownerId, workflowId, input } = job.data;
    await this.runner.run(executionId, ownerId, workflowId, input);
  }
}
