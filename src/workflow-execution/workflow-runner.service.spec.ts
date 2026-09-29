import { ExecutionStoreService } from '../execution-store/execution-store.service.js';
import { ExecutionEventsService } from '../event-stream/execution-events.service.js';
import { NodeExecutor } from '../node-runtime/node-executor.interface.js';
import { NodeRegistryService } from '../node-runtime/node-registry.service.js';
import { WorkflowDefinitionService } from '../workflow-definition/workflow-definition.service.js';
import {
  NodeErrorConfig,
  WorkflowDefinition,
} from '../workflow-definition/workflow-definition.types.js';
import { WorkflowRunnerService } from './workflow-runner.service.js';

type NodeConfig = {
  id: string;
  type?: string;
  config?: Record<string, unknown>;
  onError?: NodeErrorConfig;
};

describe('WorkflowRunnerService', () => {
  function buildDefinition(nodes: NodeConfig[]): WorkflowDefinition {
    return {
      id: 'wf-test',
      ownerId: 'owner-test',
      name: 'Test Workflow',
      version: 1,
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type ?? 'test.node',
        config: node.config ?? {},
        onError: node.onError,
      })),
    };
  }

  function buildRunner(definition: WorkflowDefinition, executor: NodeExecutor) {
    const definitions = {
      findById: vi.fn().mockReturnValue(definition),
    } as unknown as WorkflowDefinitionService;

    const nodeRegistry = {
      getExecutor: vi.fn().mockReturnValue(executor),
    } as unknown as NodeRegistryService;

    const events = {
      emit: vi.fn(),
      complete: vi.fn(),
    } as unknown as ExecutionEventsService;

    const executionStore = {
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
      appendEvent: vi.fn(),
    } as unknown as ExecutionStoreService;

    const runner = new WorkflowRunnerService(
      definitions,
      nodeRegistry,
      events,
      executionStore,
    );

    return { runner, nodeRegistry, events, executionStore };
  }

  it('fails execution by default when a node throws', async () => {
    const definition = buildDefinition([{ id: 'n1' }]);
    const executor: NodeExecutor = {
      execute: vi.fn().mockRejectedValue(new Error('boom')),
    };

    const { runner, events, executionStore } = buildRunner(definition, executor);

    await expect(runner.run('exec-1', 'owner-test', 'wf-test', { a: 1 })).rejects.toThrow('boom');

    expect((executionStore.markFailed as any).mock.calls[0]).toEqual(['exec-1', 'boom']);
    expect((executionStore.markSucceeded as any).mock.calls.length).toBe(0);
    expect((events.complete as any).mock.calls.length).toBe(1);
  });

  it('continues to next node when onError policy is continue', async () => {
    const definition = buildDefinition([
      { id: 'n1', onError: { policy: 'continue' } },
      { id: 'n2' },
    ]);

    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error('first failed'))
      .mockResolvedValueOnce({ ok: true });
    const executor: NodeExecutor = { execute };

    const { runner, executionStore } = buildRunner(definition, executor);

    await expect(
      runner.run('exec-2', 'owner-test', 'wf-test', { a: 1 }),
    ).resolves.toBeUndefined();

    expect(execute).toHaveBeenCalledTimes(2);
    const startedNodes = (executionStore.appendEvent as any).mock.calls
      .map((call: any[]) => call[1])
      .filter((event: { type: string }) => event.type === 'node.started')
      .map((event: { nodeId?: string }) => event.nodeId);
    expect(startedNodes).toEqual(['n1', 'n2']);
    expect((executionStore.markFailed as any).mock.calls.length).toBe(0);
    expect((executionStore.markSucceeded as any).mock.calls.length).toBe(1);
  });

  it('jumps to fallback node when onError policy is fallback', async () => {
    const definition = buildDefinition([
      { id: 'n1', onError: { policy: 'fallback', fallbackNode: 'n3' } },
      { id: 'n2' },
      { id: 'n3' },
    ]);

    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error('go fallback'))
      .mockResolvedValueOnce({ fallback: true });
    const executor: NodeExecutor = { execute };

    const { runner, executionStore } = buildRunner(definition, executor);

    await expect(
      runner.run('exec-3', 'owner-test', 'wf-test', { a: 1 }),
    ).resolves.toBeUndefined();

    // First call: n1 fails, second call should run fallback node n3 (not n2).
    expect(execute).toHaveBeenCalledTimes(2);
    const startedNodes = (executionStore.appendEvent as any).mock.calls
      .map((call: any[]) => call[1])
      .filter((event: { type: string }) => event.type === 'node.started')
      .map((event: { nodeId?: string }) => event.nodeId);
    expect(startedNodes).toEqual(['n1', 'n3']);
    expect((executionStore.markFailed as any).mock.calls.length).toBe(0);
    expect((executionStore.markSucceeded as any).mock.calls.length).toBe(1);
  });
});
