import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExecutionEventEntity } from './execution-event.entity.js';
import { ExecutionRecordEntity } from './execution-record.entity.js';
import { ExecutionStoreService } from './execution-store.service.js';

describe('ExecutionStoreService', () => {
  let service: ExecutionStoreService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqljs',
          autoSave: false,
          synchronize: true,
          entities: [ExecutionRecordEntity, ExecutionEventEntity],
        }),
        TypeOrmModule.forFeature([ExecutionRecordEntity, ExecutionEventEntity]),
      ],
      providers: [ExecutionStoreService],
    }).compile();

    service = moduleRef.get(ExecutionStoreService);
  });

  it('creates and updates execution lifecycle', async () => {
    await service.createQueued({
      executionId: 'exec-1',
      ownerId: 'public',
      workflowId: 'wf-hello',
      input: { foo: 'bar' },
      correlationId: 'corr-1',
    });

    await service.markRunning('exec-1');
    await service.appendEvent('exec-1', {
      type: 'execution.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString(),
      payload: { workflowId: 'wf-hello' },
    });
    await service.markSucceeded('exec-1');

    const record = await service.getRecord('exec-1');
    expect(record.ownerId).toBe('public');
    expect(record.status).toBe('succeeded');
    expect(record.startedAt).toBeDefined();
    expect(record.finishedAt).toBeDefined();
    expect(record.events).toHaveLength(1);
  });

  it('marks execution failed with error', async () => {
    await service.createQueued({
      executionId: 'exec-2',
      ownerId: 'public',
      workflowId: 'wf-hello',
      input: { foo: 'bar' },
    });

    await service.markFailed('exec-2', 'boom');
    const record = await service.getRecord('exec-2');
    expect(record.status).toBe('failed');
    expect(record.error).toBe('boom');
    expect(record.finishedAt).toBeDefined();
  });

  it('finds execution by idempotency key', async () => {
    await service.createQueued({
      executionId: 'exec-3',
      ownerId: 'tenant-a',
      workflowId: 'wf-hello',
      input: { foo: 'bar' },
      idempotencyKey: 'idem-1',
    });

    const record = await service.findByIdempotencyKey('tenant-a', 'wf-hello', 'idem-1');
    expect(record).not.toBeNull();
    expect(record?.executionId).toBe('exec-3');
  });

  it('throws NotFoundException for unknown execution id', async () => {
    await expect(service.getRecord('missing')).rejects.toThrow(NotFoundException);
    await expect(service.getEvents('missing')).rejects.toThrow(NotFoundException);
  });
});
