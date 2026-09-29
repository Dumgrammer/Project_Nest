import { resolveOwnerId } from './owner.util.js';

describe('owner util', () => {
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
});
