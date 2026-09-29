export interface ExecutionEvent {
  type: string;
  executionId: string;
  nodeId?: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}
