import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { resolveOwnerId } from '../common/utils/owner.util.js';
import { TriggerWorkflowDto } from './dto/trigger-workflow.dto.js';
import { WorkflowExecutionService } from './workflow-execution.service.js';

@Controller('workflows')
export class WorkflowExecutionController {
  constructor(
    private readonly workflowExecutionService: WorkflowExecutionService,
  ) {}

  @UseGuards(ApiKeyGuard, PermissionsGuard)
  @RequirePermissions('workflow:trigger')
  @Post(':id/trigger')
  trigger(
    @Req() req: Request,
    @Param('id') workflowId: string,
    @Body() dto: TriggerWorkflowDto,
  ) {
    const ownerId = resolveOwnerId({
      headers: req.headers as Record<string, unknown>,
      user: (req as Request & { user?: Record<string, unknown> }).user,
    });
    const idempotencyKeyFromHeader = req.headers['idempotency-key'];
    const idempotencyKey =
      typeof idempotencyKeyFromHeader === 'string' && idempotencyKeyFromHeader.trim().length > 0
        ? idempotencyKeyFromHeader.trim()
        : dto.idempotencyKey;

    return this.workflowExecutionService.trigger(
      ownerId,
      workflowId,
      dto.input,
      dto.correlationId,
      idempotencyKey,
    );
  }
}
