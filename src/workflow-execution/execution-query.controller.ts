import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { resolveOwnerId } from '../common/utils/owner.util.js';
import { ExecutionStoreService } from '../execution-store/execution-store.service.js';

@Controller('executions')
export class ExecutionQueryController {
  constructor(private readonly executionStore: ExecutionStoreService) {}

  @Get(':id')
  async getExecution(@Req() req: Request, @Param('id') executionId: string) {
    const ownerId = resolveOwnerId({
      headers: req.headers as Record<string, unknown>,
      user: (req as Request & { user?: Record<string, unknown> }).user,
    });
    return await this.executionStore.getRecord(executionId, ownerId);
  }

  @Get(':id/events')
  async getExecutionEvents(@Req() req: Request, @Param('id') executionId: string) {
    const ownerId = resolveOwnerId({
      headers: req.headers as Record<string, unknown>,
      user: (req as Request & { user?: Record<string, unknown> }).user,
    });
    return await this.executionStore.getEvents(executionId, ownerId);
  }
}
