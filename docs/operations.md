# Operations Runbook

Operational guide for running the workflow engine locally and in production.

---

## 1. Prerequisites

- Node.js 20+
- Redis 7+ (Docker recommended)
- SQL.js (bundled; no external DB needed for dev)

---

## 2. Redis

The BullMQ queue requires Redis. Local dev container:

```bash
docker run --name redis-dev -p 6379:6379 -d redis:7
```

Verify:

```bash
docker exec -it redis-dev redis-cli PING
# PONG
```

Common issues:

- `ECONNREFUSED 127.0.0.1:6379` — Redis is not running. Start the container.
- Job stuck as `waiting` — worker (`WorkflowProcessor`) failed to boot; check app logs.

---

## 3. Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `REDIS_HOST` | `127.0.0.1` | BullMQ Redis host |
| `REDIS_PORT` | `6379` | BullMQ Redis port |
| `WORKFLOW_DB_PATH` | `./data/workflow.sqlite` | SQL.js file path |
| `WORKFLOW_API_KEY` | `dev-key` in dev/test, _(required in prod to enable API-key mode)_ | Legacy API key fallback |
| `JWT_SECRET` | _(unset)_ | HS256 secret for auth |
| `ALLOW_OWNER_HEADER_FALLBACK` | `true` in dev/test, `false` in prod by default | Set `false` in prod |
| `ALLOW_API_KEY_AUTHZ_BYPASS` | `true` in dev/test, `false` in prod by default | Allow API key path to bypass permission-claim checks |

See [`docs/auth.md`](./auth.md) for auth setup.

---

## 4. Database & Migrations

TypeORM runs migrations automatically at boot (`migrationsRun: true`, `synchronize: false`).

Migration files live in `src/database/migrations/`.

Reset local DB:

```bash
rm -f data/workflow.sqlite
npm run start:dev
```

Migrations executed:

- `1727670000000-init-workflow-engine` — core tables
- `1727671000000-add-owner-id` — multi-tenant columns

---

## 5. Queue & Retries

`WorkflowExecutionService` enqueues jobs with:

- `attempts: 3`
- `backoff: { type: 'exponential', delay: 1000 }`
- `removeOnComplete: true`, `removeOnFail: false`

Dead-letter behavior:

- Final-attempt failures are copied to `workflow-dead-letter` queue.
- Dead-letter payload includes `executionId`, `ownerId`, `workflowId`, `idempotencyKey`, `attemptsMade`, and `errorMessage`.

Inspect queue with any BullMQ dashboard (e.g. Bull Board) pointed at the same Redis.

---

## 6. Observability

- Every log line is sanitized via `sanitizeForLog` (redacts `authorization`, `password`, `secret`, `token`, `apiKey`).
- Correlation id is generated per trigger and stamped on all log entries and events.
- Structured logs use Nest's built-in `Logger`.

---

## 7. Health Checks & Rate Limiting

- Liveness: `GET /health/live`
- Readiness: `GET /health/ready` (DB + Redis checks)
- Global throttle: `120` requests per `60` seconds per client key
- Health endpoints are excluded from throttling to avoid false negatives during probes

---

## 8. Idempotency

- Clients can send `Idempotency-Key` header (REST) or `idempotencyKey` in GraphQL trigger input.
- Reusing the same key for the same `ownerId + workflowId` returns the existing execution instead of creating a duplicate.
- Idempotency keys are persisted in `workflow_executions.idempotencyKey` with unique index:
  `ownerId + workflowId + idempotencyKey`

---

## 9. Security Audit Trail

- Denied auth/authorization attempts are persisted in `workflow_auth_audit_events`.
- Includes owner, action, reason, auth type, endpoint, method, timestamp, and sanitized metadata.
- Access feeds:
  - REST: `GET /security/audit-events?limit=50&from=<iso>&to=<iso>&reason=<code>&authType=<jwt|api_key>`
  - GraphQL: `authAuditEvents(limit: Int, from: String, to: String, reason: String, authType: String)`
- Cursor paging:
  - REST: `GET /security/audit-events/page?limit=50&cursor=<eventId>&...`
  - GraphQL: `authAuditEventsPage(limit: Int, cursor: Int, from: String, to: String, reason: String, authType: String)`
- CSV exports:
  - REST: `GET /security/audit-events.csv?...`
  - GraphQL: `authAuditEventsCsv(...)`

---

## 10. Troubleshooting

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| `404 Cannot GET /executions/:id/stream` | Wrong controller prefix | Ensure `@Controller('executions')` |
| SSE hangs forever | Late subscriber, no replay | Confirm `ReplaySubject(50)` is used |
| `Unauthorized` on GraphQL mutation | Missing header | Send `Authorization: Bearer <jwt>` or `x-api-key` |
| `payload` field null in GraphQL | JSON scalar missing | Ensure `{ GraphQLJSON }` named import + `resolvers: { JSON: GraphQLJSON }` |
| `The "@as-integrations/express5" package is missing` | Apollo adapter absent | `npm i @as-integrations/express5 --legacy-peer-deps` |
| `ECONNREFUSED` on port 6379 | Redis down | `docker start redis-dev` |

---

## 11. Testing

```bash
npm test           # unit + service tests
npm run test:e2e   # GraphQL/REST end-to-end
```

Suite covers happy path, failure path, error policies (`fail` / `continue` / `fallback`), and auth guard behavior.

---

## 12. Production Checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Set `ALLOW_OWNER_HEADER_FALLBACK=false`
- [ ] Rotate or remove `WORKFLOW_API_KEY`
- [ ] Point TypeORM at Postgres/MySQL (swap `sqljs` driver)
- [ ] Managed Redis (Elasticache / Upstash / Redis Cloud)
- [ ] Add process manager (PM2 / systemd) or container orchestrator
- [ ] Wire logs to central sink (Datadog / Loki / CloudWatch)
