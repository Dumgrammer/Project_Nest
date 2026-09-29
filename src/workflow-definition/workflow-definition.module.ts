import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowDefinitionEntity } from './workflow-definition.entity.js';
import { WorkflowDefinitionService } from './workflow-definition.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowDefinitionEntity])],
  providers: [WorkflowDefinitionService],
  exports: [WorkflowDefinitionService],
})
export class WorkflowDefinitionModule {}