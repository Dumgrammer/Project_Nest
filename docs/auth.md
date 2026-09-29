# Authentication & Ownership

This service supports two authentication paths and a layered owner-resolution strategy for multi-tenant scoping.

---

## Auth Modes

### 1) JWT (recommended)

Send a bearer token in the `Authorization` header:

```
Authorization: Bearer <jwt>
```

The token is verified with `JWT_SECRET`. The verified payload is attached to `request.user` and used for owner resolution.

For RBAC-style authorization, include permission claims in JWT, for example:

- `scope` (space-separated string)
- `scopes` (string array)
- `permissions` (string array)
- `roles` (string array)

### 2) API Key (dev fallback)

If no JWT is present, the guard falls back to:

```
x-api-key: <key>
```

Default key is `dev-key` in development/testing unless `WORKFLOW_API_KEY` is set. In production, API-key mode is disabled unless `WORKFLOW_API_KEY` is explicitly set.

---

## Owner Resolution Order

1. JWT claim from `request.user`, checked in order:
   - `ownerId`
   - `owner_id`
   - `tenantId`
   - `tenant_id`
   - `orgId`
   - `org_id`
   - `sub`
2. `x-owner-id` header (enabled by default in development/testing, disabled by default in production unless `ALLOW_OWNER_HEADER_FALLBACK=true`)
3. Default owner: `public`

---

## Permission Checks (Day 4)

Guarded operations now require permissions:

- `workflow:trigger` for REST/GraphQL trigger operations
- `workflow:write` for GraphQL definition create/update/delete

In development/testing, API key fallback can bypass permission checks by default. In production, that bypass is disabled unless `ALLOW_API_KEY_AUTHZ_BYPASS=true`.

Denied auth and permission attempts are persisted for monitoring and incident response. Query them via:

- REST: `GET /security/audit-events?limit=50`
- GraphQL: `authAuditEvents(limit: Int)`

Optional filters:

- `from` (ISO timestamp)
- `to` (ISO timestamp)
- `reason` (exact reason code, e.g. `auth.permissions.missing`)
- `authType` (`jwt` or `api_key`)
- `cursor` (event id cursor; fetches events with `id < cursor`)

Export:

- REST CSV: `GET /security/audit-events.csv?...`
- GraphQL CSV: `authAuditEventsCsv(...)`

Cursor paging:

- REST page endpoint: `GET /security/audit-events/page?...`
- GraphQL page query: `authAuditEventsPage(...)` returning `{ items, nextCursor }`

---

## Sample JWT Payload

```json
{
  "sub": "user-123",
  "ownerId": "tenant-a",
  "iat": 1730000000,
  "exp": 1730003600
}
```

Generate a dev token in Node:

```js
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { sub: 'user-123', ownerId: 'tenant-a' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' },
);
```

---

## Examples

### JWT trigger

```bash
curl -X POST "http://localhost:3000/workflows/wf-hello/trigger" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d "{\"input\":{\"message\":\"hello\"}}"
```

### API key + explicit owner

```bash
curl -X POST "http://localhost:3000/workflows/wf-hello/trigger" \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key" \
  -H "x-owner-id: tenant-a" \
  -d "{\"input\":{\"message\":\"hello\"}}"
```

---

## Hardening Checklist

- Set a strong `JWT_SECRET` in production.
- Set `ALLOW_OWNER_HEADER_FALLBACK=false` to force JWT-only ownership.
- Rotate `WORKFLOW_API_KEY` or disable API key mode when JWT is enforced.
- Add role/permission claims and expand guards for RBAC.
