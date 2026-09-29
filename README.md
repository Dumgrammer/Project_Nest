# Project Nest Workflow Engine

An event-driven automation backend built with NestJS, inspired by Zapier/Make patterns.

It supports queue-based workflow execution, dynamic node plugins, real-time streaming, GraphQL API, DB persistence, and owner-scoped multi-tenant behavior.

---

## Highlights

- Trigger workflows through REST or GraphQL.
- Execute workflow nodes asynchronously via BullMQ workers.
- Stream execution progress over SSE.
- Expose liveness/readiness probes for orchestrators.
- Persist workflow definitions, executions, and events in SQL.js via TypeORM.
- Support per-node error policies: `fail`, `continue`, `fallback`.
- Resolve tenant ownership from JWT claims (with controlled header fallback).
- Enforce global request rate limiting with `@nestjs/throttler`.
- Support idempotent triggers and dead-letter queue capture for terminal failures.
- Add RBAC-ready permission checks for trigger and workflow-management mutations.
- Persist denied auth/permission attempts with owner-scoped audit queries.

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
- Health probes: `GET /health/live`, `GET /health/ready`
- Security audit feed: `GET /security/audit-events`

---

## Authentication and Ownership

This project supports two auth paths:

1. **JWT mode (recommended)**  
   Send `Authorization: Bearer <token>`, verified using `JWT_SECRET`.  
   Include claims such as `scope`, `scopes`, `permissions`, or `roles` for permission checks.

2. **API key fallback (dev friendly)**  
   Send `x-api-key`. In development/testing, default key is `dev-key` unless `WORKFLOW_API_KEY` is set. In production, you must explicitly set `WORKFLOW_API_KEY` to enable API-key mode.

Owner resolution order:

1. JWT claims (`ownerId`, `owner_id`, `tenantId`, `tenant_id`, `orgId`, `org_id`, `sub`)
2. `x-owner-id` header (enabled by default in development/testing, disabled by default in production unless `ALLOW_OWNER_HEADER_FALLBACK=true`)
3. default owner: `public`

---

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `REDIS_HOST` | `127.0.0.1` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `WORKFLOW_API_KEY` | _unset_ | API key fallback auth (required in production to enable API-key mode) |
| `JWT_SECRET` | _unset_ | JWT signature verification |
| `ALLOW_OWNER_HEADER_FALLBACK` | `true` in dev/test, `false` in prod | Allow `x-owner-id` fallback |
| `ALLOW_API_KEY_AUTHZ_BYPASS` | `true` in dev/test, `false` in prod | Allow API-key requests to bypass permission-claim checks |

---

## API Examples

### REST: Read security audit events

```bash
curl "http://localhost:3000/security/audit-events?limit=20" \
  -H "x-api-key: dev-key" \
  -H "x-owner-id: tenant-a"
```

### REST: Cursor page security audit events

```bash
curl "http://localhost:3000/security/audit-events/page?limit=20&cursor=1500" \
  -H "x-api-key: dev-key" \
  -H "x-owner-id: tenant-a"
```

### REST: Export security audit CSV

```bash
curl "http://localhost:3000/security/audit-events.csv?limit=100&authType=jwt&reason=auth.permissions.missing" \
  -H "x-api-key: dev-key" \
  -H "x-owner-id: tenant-a"
```

### GraphQL: Export security audit CSV

```bash
curl -X POST "http://localhost:3000/graphql" \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key" \
  -d "{\"query\":\"query { authAuditEventsCsv(limit: 50, authType: \\\"api_key\\\") }\"}"
```

### GraphQL: Cursor page security audit events

```bash
curl -X POST "http://localhost:3000/graphql" \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key" \
  -d "{\"query\":\"query { authAuditEventsPage(limit: 20, cursor: 1500) { nextCursor items { id reason timestamp } } }\"}"
```

### REST: Trigger workflow

```bash
curl -X POST "http://localhost:3000/workflows/wf-hello/trigger" \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key" \
  -H "Idempotency-Key: idem-123" \
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

### Security Audit Query Presets

Use a dynamic `from` timestamp for "last 24h" filters:

**PowerShell**

```powershell
$FROM=(Get-Date).ToUniversalTime().AddHours(-24).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
```

**CMD**

```cmd
for /f %i in ('powershell -NoProfile -Command "(Get-Date).ToUniversalTime().AddHours(-24).ToString(\"yyyy-MM-ddTHH:mm:ss.fffZ\")"') do set FROM=%i
```

**Last 24h JWT failures (REST)**

```bash
curl "http://localhost:3000/security/audit-events/page?limit=50&authType=jwt&reason=auth.jwt.invalid&from=%FROM%" \
  -H "x-api-key: dev-key" \
  -H "x-owner-id: tenant-a"
```

**API-key abuse signals (REST)**

```bash
curl "http://localhost:3000/security/audit-events/page?limit=50&authType=api_key&reason=auth.api_key.invalid" \
  -H "x-api-key: dev-key" \
  -H "x-owner-id: tenant-a"
```

**Last 24h JWT failures (GraphQL)**

```bash
curl -X POST "http://localhost:3000/graphql" \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key" \
  -d "{\"query\":\"query($from: String!) { authAuditEventsPage(limit: 50, authType: \\\"jwt\\\", reason: \\\"auth.jwt.invalid\\\", from: $from) { nextCursor items { id reason authType timestamp endpoint } } }\",\"variables\":{\"from\":\"%FROM%\"}}"
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

## Day 4 Status

Completed:

- DB-backed persistence with entities + migrations
- GraphQL workflow definition CRUD
- Tenant/owner scoping across REST, GraphQL, queue runner, and DB access
- JWT-aware ownership resolution and API key fallback
- Health probes + global throttling
- Idempotency keys + dead-letter queue handling
- RBAC-style permission checks
- Persisted auth/permission audit trail with REST/GraphQL query + CSV export
- Cursor-based pagination for audit feeds
- Unit and e2e test coverage for happy and failure paths

Next recommended step:

- Ship to production with a managed DB/Redis stack, observability dashboards, and operational SLOs.
