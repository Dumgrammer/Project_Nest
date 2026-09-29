import { Injectable, Logger } from '@nestjs/common';
import { sanitizeForLog } from '../common/utils/sanitize.util.js';
import { ExecutionEvent } from '../common/interfaces/execution-event.interface.js';
import { ExecutionStoreService } from '../execution-store/execution-store.service.js';
import { ExecutionEventsService } from '../event-stream/execution-events.service.js';
import { NodeRegistryService } from '../node-runtime/node-registry.service.js';
import { WorkflowDefinitionService } from '../workflow-definition/workflow-definition.service.js';

@Injectable()
export class WorkflowRunnerService {
  private readonly logger = new Logger(WorkflowRunnerService.name);

  constructor(
    private readonly definitions: WorkflowDefinitionService,
    private readonly nodeRegistry: NodeRegistryService,
    private readonly events: ExecutionEventsService,
    private readonly executionStore: ExecutionStoreService,
  ) {}

  async run(
    executionId: string,
    ownerId: string,
    workflowId: string,
    input: Record<string, unknown>,
  ): Promise<void> {
    const definition = await this.definitions.findById(workflowId, ownerId);

    await this.executionStore.markRunning(executionId);
    this.logger.log(
      JSON.stringify({
        message: 'Execution started',
        executionId,
        ownerId,
        workflowId,
        input: sanitizeForLog(input),
      }),
    );

    await this.emitAndStore(executionId, {
      type: 'execution.started',
      executionId,
      timestamp: new Date().toISOString(),
      payload: { workflowId },
    });

    let current = input;
    const nodes = definition.nodes;
    const nodeIndex = new Map(nodes.map((node, index) => [node.id, index]));
    let pointer = 0;
    let steps = 0;
    const maxSteps = nodes.length * 10;

    while (pointer < nodes.length) {
      // Safety net against fallback loops in malformed definitions.
      if (steps++ > maxSteps) {
        throw new Error('Workflow execution exceeded max steps, possible fallback loop.');
      }
      const node = nodes[pointer];

      await this.emitAndStore(executionId, {
        type: 'node.started',
        executionId,
        nodeId: node.id,
        timestamp: new Date().toISOString(),
      });

      try {
        const executor = this.nodeRegistry.getExecutor(node.type);
        const result = await executor.execute(node.config, current);
        this.logger.log(
          JSON.stringify({
            message: 'Node succeeded',
            executionId,
            ownerId,
            workflowId,
            nodeId: node.id,
            output: sanitizeForLog(result),
          }),
        );

        await this.emitAndStore(executionId, {
          type: 'node.succeeded',
          executionId,
          nodeId: node.id,
          timestamp: new Date().toISOString(),
          payload: result,
        });

        current = result;
        pointer += 1;
      } catch (error) {
        const message = (error as Error).message;
        this.logger.warn(
          JSON.stringify({
            message: 'Node failed',
            executionId,
            ownerId,
            workflowId,
            nodeId: node.id,
            policy: node.onError?.policy ?? 'fail',
            error: message,
          }),
        );

        await this.emitAndStore(executionId, {
          type: 'node.failed',
          executionId,
          nodeId: node.id,
          timestamp: new Date().toISOString(),
          payload: { message },
        });

        const policy = node.onError?.policy ?? 'fail';

        if (policy === 'continue') {
          pointer += 1;
          continue;
        }

        if (policy === 'fallback') {
          const fallbackNode = node.onError?.fallbackNode;
          if (!fallbackNode) {
            throw new Error(
              `Node "${node.id}" uses fallback policy but does not define fallbackNode.`,
            );
          }

          const fallbackIndex = nodeIndex.get(fallbackNode);
          if (fallbackIndex === undefined) {
            throw new Error(
              `Node "${node.id}" fallback target "${fallbackNode}" was not found in workflow.`,
            );
          }

          pointer = fallbackIndex;
          continue;
        }

        await this.emitAndStore(executionId, {
          type: 'execution.failed',
          executionId,
          timestamp: new Date().toISOString(),
          payload: { message },
        });
        await this.executionStore.markFailed(executionId, message);
        this.logger.error(
          JSON.stringify({
            message: 'Execution failed',
            executionId,
            ownerId,
            workflowId,
            nodeId: node.id,
            error: message,
          }),
        );
        this.events.complete(executionId);
        throw error;
      }
    }

    await this.emitAndStore(executionId, {
      type: 'execution.finished',
      executionId,
      timestamp: new Date().toISOString(),
      payload: current,
    });
    await this.executionStore.markSucceeded(executionId);
    this.logger.log(
      JSON.stringify({
        message: 'Execution finished',
        executionId,
        ownerId,
        workflowId,
        output: sanitizeForLog(current),
      }),
    );
    this.events.complete(executionId);
  }

  private async emitAndStore(executionId: string, event: ExecutionEvent): Promise<void> {
    this.events.emit(event);
    await this.executionStore.appendEvent(executionId, event);
  }
}
