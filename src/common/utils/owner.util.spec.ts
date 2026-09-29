import { resolveOwnerId } from './owner.util.js';

describe('owner util', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalOwnerFallback = process.env.ALLOW_OWNER_HEADER_FALLBACK;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalOwnerFallback === undefined) {
      delete process.env.ALLOW_OWNER_HEADER_FALLBACK;
    } else {
      process.env.ALLOW_OWNER_HEADER_FALLBACK = originalOwnerFallback;
    }
  });

  it('prefers owner from JWT claims', () => {
    const ownerId = resolveOwnerId({
      user: { ownerId: 'tenant-jwt' },
      headers: { 'x-owner-id': 'tenant-header' },
    });

    expect(ownerId).toBe('tenant-jwt');
  });

  it('falls back to x-owner-id header', () => {
    const ownerId = resolveOwnerId({
      headers: { 'x-owner-id': 'tenant-header' },
    });

    expect(ownerId).toBe('tenant-header');
  });

  it('defaults to public owner when no context is provided', () => {
    const ownerId = resolveOwnerId(undefined);

    expect(ownerId).toBe('public');
  });

  it('disables x-owner-id fallback by default in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_OWNER_HEADER_FALLBACK;

    const ownerId = resolveOwnerId({
      headers: { 'x-owner-id': 'tenant-header' },
    });

    expect(ownerId).toBe('public');
  });

  it('allows x-owner-id fallback in production when explicitly enabled', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_OWNER_HEADER_FALLBACK = 'true';

    const ownerId = resolveOwnerId({
      headers: { 'x-owner-id': 'tenant-header' },
    });

    expect(ownerId).toBe('tenant-header');
  });
});
