import { Module } from '@nestjs/common';
import { ExecutionStoreModule } from '../execution-store/execution-store.module.js';
import { WorkflowDefinitionModule } from '../workflow-definition/workflow-definition.module.js';
import { WorkflowExecutionModule } from '../workflow-execution/workflow-execution.module.js';
import { WorkflowGraphqlResolver } from './workflow-graphql.resolver.js';

@Module({
  imports: [
    WorkflowExecutionModule,
    ExecutionStoreModule,
    WorkflowDefinitionModule,
  ],
  providers: [WorkflowGraphqlResolver],
})
export class WorkflowGraphqlModule {}
