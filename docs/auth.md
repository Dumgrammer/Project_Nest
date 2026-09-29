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

### 2) API Key (dev fallback)

If no JWT is present, the guard falls back to:

```
x-api-key: <key>
```

Default key is `dev-key` unless `WORKFLOW_API_KEY` is set.

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
2. `x-owner-id` header (unless `ALLOW_OWNER_HEADER_FALLBACK=false`)
3. Default owner: `public`

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
