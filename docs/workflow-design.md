# Workflow Design

A workflow is a versioned definition of ordered nodes executed sequentially by the runner. Each node has a `type`, a `config`, and an optional error policy.

---

## Definition Shape

```ts
interface WorkflowDefinition {
  id: string;
  ownerId: string;
  name: string;
  version: number;
  nodes: WorkflowNode[];
}

interface WorkflowNode {
  id: string;
  type: string;
  config: Record<string, unknown>;
  onError?: {
    policy: 'fail' | 'continue' | 'fallback';
    fallbackNode?: string;
  };
}
```

---

## Built-in Node Types

| Type | Purpose | Notable Config |
| --- | --- | --- |
| `http.webhook` | POST payload to a URL | `url`, `method` |

Add more executors by:

1. Implementing `NodeExecutor`.
2. Decorating the class with `@WorkflowNodeType('your.type')`.
3. Providing the class in `NodeRuntimeModule`.

Registered executors are discovered via `NodeRegistryService` at boot.

---

## Error Policies

- `fail` (default): emit `node.failed`, mark execution failed, stop.
- `continue`: emit `node.failed`, move to the next node.
- `fallback`: emit `node.failed`, jump to `fallbackNode`.

A guard prevents fallback loops by limiting steps to `nodes.length * 10`.

---

## Execution Event Types

- `execution.started`
- `node.started`
- `node.succeeded`
- `node.failed`
- `execution.finished`
- `execution.failed`

Events are:

- Streamed over SSE per execution.
- Persisted in `workflow_execution_events` for later inspection.

---

## Example Definition

```json
{
  "id": "wf-hello",
  "ownerId": "public",
  "name": "Hello Workflow",
  "version": 1,
  "nodes": [
    {
      "id": "node-webhook-1",
      "type": "http.webhook",
      "config": {
        "url": "https://httpbin.org/post",
        "method": "POST"
      }
    }
  ]
}
```

---

## Design Guidelines

- Keep nodes small and single-purpose.
- Use `continue` for non-critical steps (logging, notifications).
- Use `fallback` for recoverable branches (backup provider, compensating step).
- Version definitions instead of mutating in place when logic changes.
