import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExecutionEvent } from '../common/interfaces/execution-event.interface.js';
import { ExecutionEventEntity } from './execution-event.entity.js';
import { ExecutionRecordEntity } from './execution-record.entity.js';
import { ExecutionRecord } from './execution-record.types.js';
import type { ExecutionStatus } from './execution-record.types.js';

@Injectable()
export class ExecutionStoreService {
  constructor(
    @InjectRepository(ExecutionRecordEntity)
    private readonly executionRepo: Repository<ExecutionRecordEntity>,
    @InjectRepository(ExecutionEventEntity)
    private readonly eventRepo: Repository<ExecutionEventEntity>,
  ) {}

  async createQueued(params: {
    executionId: string;
    ownerId: string;
    workflowId: string;
    input: Record<string, unknown>;
    correlationId?: string;
  }): Promise<ExecutionRecord> {
    const record = this.executionRepo.create({
      executionId: params.executionId,
      ownerId: params.ownerId,
      workflowId: params.workflowId,
      status: 'queued',
      correlationId: params.correlationId,
      input: params.input,
    });
    await this.executionRepo.save(record);
    return this.toRecord(record, []);
  }

  async markRunning(executionId: string): Promise<void> {
    const record = await this.getEntity(executionId);
    record.status = 'running';
    record.startedAt = record.startedAt ?? new Date().toISOString();
    await this.executionRepo.save(record);
  }

  async markSucceeded(executionId: string): Promise<void> {
    const record = await this.getEntity(executionId);
    record.status = 'succeeded';
    record.finishedAt = new Date().toISOString();
    await this.executionRepo.save(record);
  }

  async markFailed(executionId: string, error: string): Promise<void> {
    const record = await this.getEntity(executionId);
    record.status = 'failed';
    record.error = error;
    record.finishedAt = new Date().toISOString();
    await this.executionRepo.save(record);
  }

  async appendEvent(executionId: string, event: ExecutionEvent): Promise<void> {
    await this.getEntity(executionId);
    const newEvent = this.eventRepo.create({
      executionId,
      type: event.type,
      nodeId: event.nodeId,
      timestamp: event.timestamp,
      payload: event.payload,
    });
    await this.eventRepo.save(newEvent);
  }

  async getRecord(executionId: string, ownerId = 'public'): Promise<ExecutionRecord> {
    const record = await this.getEntity(executionId, ownerId);
    const events = await this.eventRepo.find({
      where: { executionId },
      order: { id: 'ASC' },
    });
    return this.toRecord(record, events);
  }

  async getEvents(executionId: string, ownerId = 'public'): Promise<ExecutionEvent[]> {
    await this.getEntity(executionId, ownerId);
    const events = await this.eventRepo.find({
      where: { executionId },
      order: { id: 'ASC' },
    });
    return events.map((event) => ({
      type: event.type,
      executionId: event.executionId,
      nodeId: event.nodeId,
      timestamp: event.timestamp,
      payload: event.payload,
    }));
  }

  private async getEntity(
    executionId: string,
    ownerId = 'public',
  ): Promise<ExecutionRecordEntity> {
    const record = await this.executionRepo.findOne({
      where: { executionId, ownerId },
    });
    if (!record) {
      throw new NotFoundException(`Execution ${executionId} not found`);
    }
    return record;
  }

  private toRecord(
    record: ExecutionRecordEntity,
    events: ExecutionEventEntity[],
  ): ExecutionRecord {
    return {
      executionId: record.executionId,
      ownerId: record.ownerId,
      workflowId: record.workflowId,
      status: record.status as ExecutionStatus,
      correlationId: record.correlationId,
      input: record.input,
      startedAt: record.startedAt,
      finishedAt: record.finishedAt,
      error: record.error,
      events: events.map((event) => ({
        type: event.type,
        executionId: event.executionId,
        nodeId: event.nodeId,
        timestamp: event.timestamp,
        payload: event.payload,
      })),
    };
  }
}
