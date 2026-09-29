import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard.js';

function buildHttpContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => class TestClass {},
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalBypass = process.env.ALLOW_API_KEY_AUTHZ_BYPASS;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalBypass === undefined) {
      delete process.env.ALLOW_API_KEY_AUTHZ_BYPASS;
    } else {
      process.env.ALLOW_API_KEY_AUTHZ_BYPASS = originalBypass;
    }
  });

  it('allows when route has no permissions metadata', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const securityAudit = {
      recordDeniedAttempt: vi.fn(),
    };
    const guard = new PermissionsGuard(reflector, securityAudit as any);
    return expect(guard.canActivate(buildHttpContext({}))).resolves.toBe(true);
  });

  it('allows API key fallback in non-production when user claims are absent', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.ALLOW_API_KEY_AUTHZ_BYPASS;

    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['workflow:trigger']),
    } as unknown as Reflector;
    const securityAudit = {
      recordDeniedAttempt: vi.fn(),
    };
    const guard = new PermissionsGuard(reflector, securityAudit as any);

    return expect(guard.canActivate(buildHttpContext({}))).resolves.toBe(true);
  });

  it('rejects in production when required permission is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_API_KEY_AUTHZ_BYPASS;

    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['workflow:trigger']),
    } as unknown as Reflector;
    const securityAudit = {
      recordDeniedAttempt: vi.fn().mockResolvedValue(undefined),
    };
    const guard = new PermissionsGuard(reflector, securityAudit as any);

    return expect(guard.canActivate(buildHttpContext({}))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows when jwt claims include required permission', () => {
    process.env.NODE_ENV = 'production';

    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['workflow:trigger']),
    } as unknown as Reflector;
    const securityAudit = {
      recordDeniedAttempt: vi.fn(),
    };
    const guard = new PermissionsGuard(reflector, securityAudit as any);

    return expect(
      guard.canActivate(
        buildHttpContext({ user: { scope: 'workflow:trigger workflow:read' } }),
      ),
    ).resolves.toBe(true);
  });
});
