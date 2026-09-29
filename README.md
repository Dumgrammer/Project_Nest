# Project Nest Workflow Engine

An event-driven automation backend built with NestJS, inspired by Zapier/Make patterns.

It supports queue-based workflow execution, dynamic node plugins, real-time streaming, GraphQL API, DB persistence, and owner-scoped multi-tenant behavior.

---

## Highlights

- Trigger workflows through REST or GraphQL.
- Execute workflow nodes asynchronously via BullMQ workers.
- Stream execution progress over SSE.
- Persist workflow definitions, executions, and events in SQL.js via TypeORM.
- Support per-node error policies: `fail`, `continue`, `fallback`.
- Resolve tenant ownership from JWT claims (with controlled header fallback).

---

## Current Architecture

```text
Client (REST / GraphQL)
    |
    v
API Layer (Guards, DTOs, Resolver/Controllers)
    |
    +--> WorkflowDefinitionService (TypeORM)
    |
    +--> WorkflowExecutionService --> BullMQ Queue --> WorkflowProcessor --> WorkflowRunnerService
                                                              |
                                                              +--> NodeRegistryService (dynamic executors)
                                                              +--> ExecutionStoreService (TypeORM)
                                                              +--> ExecutionEventsService (SSE stream)
```

---

## Tech Stack

- NestJS 12
- GraphQL (Apollo Federation driver)
- BullMQ + Redis
- TypeORM + SQL.js
- Vitest + Supertest

---

## Quick Start

### 1) Install

```bash
npm install
```

### 2) Run Redis (required for queue/worker)

```bash
docker run --name redis-dev -p 6379:6379 -d redis:7
```

### 3) Start app

```bash
npm run start:dev
```

### 4) Verify

- REST trigger: `POST /workflows/:id/trigger`
- GraphQL endpoint: `POST /graphql`
- SSE stream: `GET /executions/:executionId/stream`

---

## Authentication and Ownership

This project supports two auth paths:

1. **JWT mode (recommended)**  
   Send `Authorization: Bearer <token>`, verified using `JWT_SECRET`.

2. **API key fallback (dev friendly)**  
   Send `x-api-key`, default key is `dev-key` unless `WORKFLOW_API_KEY` is set.

Owner resolution order:

1. JWT claims (`ownerId`, `owner_id`, `tenantId`, `tenant_id`, `orgId`, `org_id`, `sub`)
2. `x-owner-id` header (if `ALLOW_OWNER_HEADER_FALLBACK` is not `false`)
3. default owner: `public`

---

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `REDIS_HOST` | `127.0.0.1` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `WORKFLOW_API_KEY` | `dev-key` | API key fallback auth |
| `JWT_SECRET` | _unset_ | JWT signature verification |
| `ALLOW_OWNER_HEADER_FALLBACK` | `true` | Allow `x-owner-id` fallback |

---

## API Examples

### REST: Trigger workflow

```bash
curl -X POST "http://localhost:3000/workflows/wf-hello/trigger" \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key" \
  -H "x-owner-id: tenant-a" \
  -d "{\"input\":{\"message\":\"hello workflow\"}}"
```

### REST: Read execution

```bash
curl "http://localhost:3000/executions/<executionId>" \
  -H "x-owner-id: tenant-a"
```

### GraphQL: List workflows

```bash
curl -X POST "http://localhost:3000/graphql" \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key" \
  -d "{\"query\":\"query { workflowDefinitions { id ownerId name version } }\"}"
```

### GraphQL: Trigger workflow

```bash
curl -X POST "http://localhost:3000/graphql" \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key" \
  -d "{\"query\":\"mutation($input: TriggerWorkflowInput!) { triggerWorkflow(input: $input) { executionId status } }\",\"variables\":{\"input\":{\"workflowId\":\"wf-hello\",\"input\":{\"message\":\"hello from graphql\"}}}}"
```

---

## Testing

```bash
# unit
npm test

# e2e
npm run test:e2e

# build
npm run build
```

---

## Day 3 Status

Completed:

- DB-backed persistence with entities + migrations
- GraphQL workflow definition CRUD
- Tenant/owner scoping across REST, GraphQL, queue runner, and DB access
- JWT-aware ownership resolution and API key fallback
- Unit and e2e test coverage for happy and failure paths

Next recommended step:

- Replace API key fallback with full JWT guard stack (`passport-jwt`) and role-based authorization policies.
