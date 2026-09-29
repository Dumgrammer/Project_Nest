import { UseGuards } from '@nestjs/common';
import { Args, Context, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { resolveOwnerId } from '../common/utils/owner.util.js';
import { ExecutionStoreService } from '../execution-store/execution-store.service.js';
import { SecurityAuditService } from '../security-audit/security-audit.service.js';
import { WorkflowDefinitionService } from '../workflow-definition/workflow-definition.service.js';
import { WorkflowExecutionService } from '../workflow-execution/workflow-execution.service.js';
import {
  CreateWorkflowDefinitionInput,
  WorkflowNodeInput,
  UpdateWorkflowDefinitionInput,
} from './dto/workflow-definition.input.js';
import { TriggerWorkflowInput } from './dto/trigger-workflow.input.js';
import {
  ExecutionRecordModel,
  TriggerWorkflowResultModel,
} from './models/execution-record.model.js';
import { AuthAuditEventModel } from './models/auth-audit-event.model.js';
import { AuthAuditEventPageModel } from './models/auth-audit-event-page.model.js';
import { ExecutionEventModel } from './models/execution-event.model.js';
import { WorkflowDefinitionModel } from './models/workflow-definition.model.js';

@Resolver()
export class WorkflowGraphqlResolver {
  constructor(
    private readonly workflowExecutionService: WorkflowExecutionService,
    private readonly executionStoreService: ExecutionStoreService,
    private readonly workflowDefinitionService: WorkflowDefinitionService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  @Query(() => [WorkflowDefinitionModel], { name: 'workflowDefinitions' })
  async workflowDefinitions(@Context() ctx: { req?: { headers?: Record<string, unknown> } }) {
    const ownerId = this.resolveOwnerId(ctx);
    return await this.workflowDefinitionService.list(ownerId);
  }

  @Query(() => ExecutionRecordModel, { name: 'execution' })
  async execution(
    @Context() ctx: { req?: { headers?: Record<string, unknown> } },
    @Args('executionId') executionId: string,
  ) {
    const ownerId = this.resolveOwnerId(ctx);
    return await this.executionStoreService.getRecord(executionId, ownerId);
  }

  @Query(() => [ExecutionEventModel], { name: 'executionEvents' })
  async executionEvents(
    @Context() ctx: { req?: { headers?: Record<string, unknown> } },
    @Args('executionId') executionId: string,
  ) {
    const ownerId = this.resolveOwnerId(ctx);
    return await this.executionStoreService.getEvents(executionId, ownerId);
  }

  @UseGuards(ApiKeyGuard, PermissionsGuard)
  @RequirePermissions('security:audit:read')
  @Query(() => [AuthAuditEventModel], { name: 'authAuditEvents' })
  async authAuditEvents(
    @Context() ctx: { req?: { headers?: Record<string, unknown>; user?: Record<string, unknown> } },
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('cursor', { type: () => Int, nullable: true }) cursor?: number,
    @Args('from', { type: () => String, nullable: true }) from?: string,
    @Args('to', { type: () => String, nullable: true }) to?: string,
    @Args('reason', { type: () => String, nullable: true }) reason?: string,
    @Args('authType', { type: () => String, nullable: true }) authType?: string,
  ) {
    const ownerId = this.resolveOwnerId(ctx);
    return await this.securityAuditService.listByOwner(ownerId, {
      limit: limit ?? 50,
      cursor,
      from,
      to,
      reason,
      authType,
    });
  }

  @UseGuards(ApiKeyGuard, PermissionsGuard)
  @RequirePermissions('security:audit:read')
  @Query(() => AuthAuditEventPageModel, { name: 'authAuditEventsPage' })
  async authAuditEventsPage(
    @Context() ctx: { req?: { headers?: Record<string, unknown>; user?: Record<string, unknown> } },
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('cursor', { type: () => Int, nullable: true }) cursor?: number,
    @Args('from', { type: () => String, nullable: true }) from?: string,
    @Args('to', { type: () => String, nullable: true }) to?: string,
    @Args('reason', { type: () => String, nullable: true }) reason?: string,
    @Args('authType', { type: () => String, nullable: true }) authType?: string,
  ) {
    const ownerId = this.resolveOwnerId(ctx);
    return await this.securityAuditService.listPageByOwner(ownerId, {
      limit: limit ?? 50,
      cursor,
      from,
      to,
      reason,
      authType,
    });
  }

  @UseGuards(ApiKeyGuard, PermissionsGuard)
  @RequirePermissions('security:audit:read')
  @Query(() => String, { name: 'authAuditEventsCsv' })
  async authAuditEventsCsv(
    @Context() ctx: { req?: { headers?: Record<string, unknown>; user?: Record<string, unknown> } },
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('cursor', { type: () => Int, nullable: true }) cursor?: number,
    @Args('from', { type: () => String, nullable: true }) from?: string,
    @Args('to', { type: () => String, nullable: true }) to?: string,
    @Args('reason', { type: () => String, nullable: true }) reason?: string,
    @Args('authType', { type: () => String, nullable: true }) authType?: string,
  ) {
    const ownerId = this.resolveOwnerId(ctx);
    return await this.securityAuditService.exportCsvByOwner(ownerId, {
      limit: limit ?? 50,
      cursor,
      from,
      to,
      reason,
      authType,
    });
  }

  @UseGuards(ApiKeyGuard, PermissionsGuard)
  @RequirePermissions('workflow:trigger')
  @Mutation(() => TriggerWorkflowResultModel, { name: 'triggerWorkflow' })
  async triggerWorkflow(
    @Context() ctx: { req?: { headers?: Record<string, unknown> } },
    @Args('input') input: TriggerWorkflowInput,
  ) {
    const ownerId = this.resolveOwnerId(ctx);
    return this.workflowExecutionService.trigger(
      ownerId,
      input.workflowId,
      input.input,
      input.correlationId,
      input.idempotencyKey,
    );
  }

  @UseGuards(ApiKeyGuard, PermissionsGuard)
  @RequirePermissions('workflow:write')
  @Mutation(() => WorkflowDefinitionModel, { name: 'createWorkflowDefinition' })
  async createWorkflowDefinition(
    @Context() ctx: { req?: { headers?: Record<string, unknown> } },
    @Args('input') input: CreateWorkflowDefinitionInput,
  ) {
    const ownerId = this.resolveOwnerId(ctx);
    return await this.workflowDefinitionService.create({
      id: input.id,
      name: input.name,
      version: input.version,
      nodes: input.nodes.map((node) => this.toWorkflowNode(node)),
    }, ownerId);
  }

  @UseGuards(ApiKeyGuard, PermissionsGuard)
  @RequirePermissions('workflow:write')
  @Mutation(() => WorkflowDefinitionModel, { name: 'updateWorkflowDefinition' })
  async updateWorkflowDefinition(
    @Context() ctx: { req?: { headers?: Record<string, unknown> } },
    @Args('id') id: string,
    @Args('input') input: UpdateWorkflowDefinitionInput,
  ) {
    const ownerId = this.resolveOwnerId(ctx);
    return await this.workflowDefinitionService.update(id, {
      ...input,
      nodes: input.nodes?.map((node) => this.toWorkflowNode(node)),
    }, ownerId);
  }

  @UseGuards(ApiKeyGuard, PermissionsGuard)
  @RequirePermissions('workflow:write')
  @Mutation(() => Boolean, { name: 'deleteWorkflowDefinition' })
  async deleteWorkflowDefinition(
    @Context() ctx: { req?: { headers?: Record<string, unknown> } },
    @Args('id') id: string,
  ) {
    const ownerId = this.resolveOwnerId(ctx);
    return await this.workflowDefinitionService.remove(id, ownerId);
  }

  private toWorkflowNode(node: WorkflowNodeInput) {
    return {
      id: node.id,
      type: node.type,
      config: node.config,
      onError: node.onError
        ? {
            policy: node.onError.policy as 'fail' | 'continue' | 'fallback',
            fallbackNode: node.onError.fallbackNode,
          }
        : undefined,
    };
  }

  private resolveOwnerId(
    ctx: { req?: { headers?: Record<string, unknown>; user?: Record<string, unknown> } },
  ): string {
    return resolveOwnerId({
      headers: ctx.req?.headers,
      user: ctx.req?.user,
    });
  }
}
