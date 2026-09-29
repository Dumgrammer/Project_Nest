import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { resolveOwnerId } from '../common/utils/owner.util.js';
import { TriggerWorkflowDto } from './dto/trigger-workflow.dto.js';
import { WorkflowExecutionService } from './workflow-execution.service.js';

@Controller('workflows')
export class WorkflowExecutionController {
  constructor(
    private readonly workflowExecutionService: WorkflowExecutionService,
  ) {}

  @UseGuards(ApiKeyGuard)
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
    return this.workflowExecutionService.trigger(
      ownerId,
      workflowId,
      dto.input,
      dto.correlationId,
    );
  }
}
