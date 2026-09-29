import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { WorkflowExecutionModule } from '../workflow-execution/workflow-execution.module.js';
import { WORKFLOW_DEAD_LETTER_QUEUE, WORKFLOW_QUEUE } from './queue.constants.js';
import { WorkflowProcessor } from './workflow.processor.js';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: WORKFLOW_QUEUE },
      { name: WORKFLOW_DEAD_LETTER_QUEUE },
    ),
    WorkflowExecutionModule,
  ],
  providers: [WorkflowProcessor],
})
export class QueueModule {}
