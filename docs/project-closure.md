# Project Closure Checklist

Use this checklist to close the project in a production-ready state.

---

## 1) Scope Freeze

- [ ] Feature scope is frozen (no new major capabilities in this release).
- [ ] Outstanding issues are triaged into: must-fix now vs post-launch backlog.
- [ ] API contracts (REST + GraphQL) are considered stable for release.
- [ ] README and `docs/` reflect final behavior (auth, idempotency, audit, paging).

Exit criteria:

- [ ] Stakeholders agree this release is "MVP complete + hardening complete".

---

## 2) Security Readiness

- [ ] `JWT_SECRET` is set to a strong production secret.
- [ ] `ALLOW_OWNER_HEADER_FALLBACK=false` in production.
- [ ] `ALLOW_API_KEY_AUTHZ_BYPASS=false` in production.
- [ ] `WORKFLOW_API_KEY` is rotated (or API-key mode disabled in prod if JWT-only).
- [ ] Permission claims are present in JWT (`scope`/`permissions`/`roles`) for protected routes.
- [ ] Security audit feed is tested:
  - [ ] REST: `/security/audit-events`
  - [ ] GraphQL: `authAuditEvents`, `authAuditEventsPage`, `authAuditEventsCsv`

Exit criteria:

- [ ] Unauthorized/forbidden attempts are denied and recorded with expected reason codes.

---

## 3) Data & Migrations

- [ ] Migrations run cleanly in a fresh environment.
- [ ] Existing environments can upgrade with zero manual SQL steps.
- [ ] New tables/columns verified:
  - [ ] `workflow_executions.idempotencyKey`
  - [ ] `workflow_auth_audit_events`
- [ ] Backup/restore strategy for DB is documented and tested.

Exit criteria:

- [ ] Roll-forward migration process is reliable and repeatable.

---

## 4) Queue & Workflow Runtime

- [ ] Redis is managed/reliable in target environment.
- [ ] BullMQ workers start successfully and process jobs.
- [ ] Retry behavior validated (`attempts`, exponential backoff).
- [ ] DLQ flow validated (`workflow-dead-letter` receives terminal failures).
- [ ] Idempotency behavior validated under repeated trigger requests.
- [ ] Max-step/fallback-loop guard behavior validated.

Exit criteria:

- [ ] Failed executions are observable and recoverable via runbook.

---

## 5) Observability & Ops

- [ ] Health probes connected:
  - [ ] `/health/live`
  - [ ] `/health/ready`
- [ ] Logs are centralized (or a documented local strategy exists).
- [ ] Alerts configured for critical conditions:
  - [ ] worker crash/no consumers
  - [ ] Redis unavailable
  - [ ] high failed execution rate
  - [ ] high auth-denied rate
- [ ] Correlation IDs are searchable end-to-end.

Exit criteria:

- [ ] On-call can detect and diagnose core failures quickly.

---

## 6) Performance & Reliability Validation

- [ ] Basic load test on trigger endpoint completed.
- [ ] Concurrent duplicate-trigger test confirms idempotency.
- [ ] Pagination and CSV exports tested on large audit datasets.
- [ ] No memory/performance regressions observed in long-running worker.

Exit criteria:

- [ ] System meets agreed baseline throughput and error-rate targets.

---

## 7) Test & Quality Gates

- [ ] Unit tests pass (`npm test`).
- [ ] E2E tests pass (`npm run test:e2e`).
- [ ] Build passes (`npm run build`).
- [ ] Lint/diagnostics show no release-blocking issues.
- [ ] Release candidate tested on clean environment.

Exit criteria:

- [ ] CI/CD gates are green for release branch/commit.

---

## 8) Deployment & Rollback

- [ ] Deployment steps are documented and rehearsed.
- [ ] Rollback strategy is documented:
  - [ ] app rollback
  - [ ] migration rollback policy
  - [ ] queue recovery policy
- [ ] Smoke test script prepared (trigger, stream/query, audit check).

Exit criteria:

- [ ] Team can deploy and rollback safely within acceptable time.

---

## 9) Documentation & Handoff

- [ ] `README.md` and all docs are current:
  - [ ] `docs/auth.md`
  - [ ] `docs/workflow-design.md`
  - [ ] `docs/operations.md`
- [ ] Runbooks include common incident scenarios.
- [ ] Ownership defined (who owns runtime, schema, infra, on-call).
- [ ] Backlog created for post-release enhancements.

Exit criteria:

- [ ] Another engineer can operate and extend the system without tribal knowledge.

---

## 10) Go-Live Sign-Off

- [ ] Product/engineering sign-off complete.
- [ ] Security sign-off complete (or explicit risk acceptance documented).
- [ ] Operations/on-call sign-off complete.
- [ ] Release date/time and monitoring window scheduled.

Final release decision:

- [ ] **GO**
- [ ] **NO-GO** (blocking reasons documented)

---

## Optional Post-Launch (Week 1)

- [ ] Daily audit of failed auth trends.
- [ ] Daily audit of DLQ volume and top failure reasons.
- [ ] Verify idempotency usage by clients.
- [ ] Tune throttle/retry thresholds using real traffic.
- [ ] Create follow-up PRs for any hotfixes or tuning changes.
