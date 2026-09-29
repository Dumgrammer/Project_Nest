const DEFAULT_OWNER_ID = 'public';

interface OwnerRequestLike {
  headers?: Record<string, unknown>;
  user?: Record<string, unknown>;
}

const OWNER_CLAIM_KEYS = ['ownerId', 'owner_id', 'tenantId', 'tenant_id', 'orgId', 'org_id', 'sub'];

export function resolveOwnerId(request: OwnerRequestLike | undefined): string {
  const fromJwt = resolveOwnerIdFromUserClaims(request?.user);
  if (fromJwt) {
    return fromJwt;
  }

  const allowHeaderFallback = process.env.ALLOW_OWNER_HEADER_FALLBACK !== 'false';
  if (allowHeaderFallback) {
    const fromHeader = resolveOwnerIdFromHeaders(request?.headers);
    if (fromHeader !== DEFAULT_OWNER_ID) {
      return fromHeader;
    }
  }

  return DEFAULT_OWNER_ID;
}

export function resolveOwnerIdFromHeaders(
  headers: Record<string, unknown> | undefined,
): string {
  const value = headers?.['x-owner-id'];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    const owner = value[0].trim();
    if (owner.length > 0) {
      return owner;
    }
  }

  return DEFAULT_OWNER_ID;
}

export function defaultOwnerId(): string {
  return DEFAULT_OWNER_ID;
}

function resolveOwnerIdFromUserClaims(
  user: Record<string, unknown> | undefined,
): string | null {
  if (!user) {
    return null;
  }

  for (const key of OWNER_CLAIM_KEYS) {
    const value = user[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}
