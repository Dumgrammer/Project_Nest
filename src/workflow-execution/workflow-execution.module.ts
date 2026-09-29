import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ExecutionStreamModule } from '../event-stream/execution-stream.module.js';
import { ExecutionStoreModule } from '../execution-store/execution-store.module.js';
import { NodeRuntimeModule } from '../node-runtime/node-runtime.module.js';
import { WORKFLOW_QUEUE } from '../queue/queue.constants.js';
import { WorkflowDefinitionModule } from '../workflow-definition/workflow-definition.module.js';
import { ExecutionQueryController } from './execution-query.controller.js';
import { WorkflowExecutionController } from './workflow-execution.controller.js';
import { WorkflowExecutionService } from './workflow-execution.service.js';
import { WorkflowRunnerService } from './workflow-runner.service.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: WORKFLOW_QUEUE }),
    WorkflowDefinitionModule,
    NodeRuntimeModule,
    ExecutionStreamModule,
    ExecutionStoreModule,
  ],
  controllers: [WorkflowExecutionController, ExecutionQueryController],
  providers: [WorkflowExecutionService, WorkflowRunnerService],
  exports: [WorkflowExecutionService, WorkflowRunnerService],
})
export class WorkflowExecutionModule {}
