import { ExecutionEvent } from '../common/interfaces/execution-event.interface.js';

export type ExecutionStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface ExecutionRecord {
  executionId: string;
  ownerId: string;
  workflowId: string;
  status: ExecutionStatus;
  correlationId?: string;
  idempotencyKey?: string;
  input?: Record<string, unknown>;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  events: ExecutionEvent[];
}
