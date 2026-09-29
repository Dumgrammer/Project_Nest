import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  REQUIRED_PERMISSIONS_KEY,
} from '../decorators/permissions.decorator.js';
import { resolveOwnerId } from '../utils/owner.util.js';
import { SecurityAuditService } from '../../security-audit/security-audit.service.js';

interface AuthzRequestLike {
  user?: unknown;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly securityAudit: SecurityAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = this.getRequest(context);
    const userPermissions = this.resolvePermissions(request?.user);

    if (userPermissions.length === 0 && this.isApiKeyBypassAllowed()) {
      return true;
    }

    const granted = new Set(userPermissions);
    const hasAllRequired = requiredPermissions.every((permission) =>
      granted.has(permission),
    );
    if (!hasAllRequired) {
      await this.recordDenied(context, request, requiredPermissions, userPermissions);
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  private getRequest(context: ExecutionContext): AuthzRequestLike | undefined {
    const contextType = context.getType<string>();
    if (contextType === 'http') {
      return context.switchToHttp().getRequest();
    }
    if (contextType === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      return gqlContext.getContext()?.req;
    }
    return undefined;
  }

  private resolvePermissions(user: unknown): string[] {
    if (!user || typeof user !== 'object') {
      return [];
    }

    const claims = user as Record<string, unknown>;
    const values: unknown[] = [
      claims.permissions,
      claims.roles,
      claims.scope,
      claims.scopes,
    ];

    const permissions: string[] = [];
    for (const value of values) {
      if (typeof value === 'string') {
        permissions.push(...value.split(/[\s,]+/).filter(Boolean));
        continue;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string' && item.trim().length > 0) {
            permissions.push(item.trim());
          }
        }
      }
    }

    return [...new Set(permissions)];
  }

  private isApiKeyBypassAllowed(): boolean {
    const explicit = process.env.ALLOW_API_KEY_AUTHZ_BYPASS;
    if (explicit !== undefined) {
      return explicit !== 'false';
    }

    return process.env.NODE_ENV !== 'production';
  }

  private async recordDenied(
    context: ExecutionContext,
    request: AuthzRequestLike | undefined,
    requiredPermissions: string[],
    providedPermissions: string[],
  ): Promise<void> {
    const req = request as AuthzRequestLike & {
      headers?: Record<string, unknown>;
      method?: string;
      originalUrl?: string;
      url?: string;
      ip?: string;
    };
    await this.securityAudit.recordDeniedAttempt({
      ownerId: resolveOwnerId({
        headers: req?.headers,
        user: (req?.user as Record<string, unknown>) ?? undefined,
      }),
      action: this.resolveAction(context),
      reason: 'auth.permissions.missing',
      authType: req?.user ? 'jwt' : 'api_key',
      method: req?.method,
      endpoint: req?.originalUrl ?? req?.url,
      metadata: {
        ip: req?.ip,
        requiredPermissions,
        providedPermissions,
      },
    });
  }

  private resolveAction(context: ExecutionContext): string {
    const className = context.getClass().name || 'UnknownClass';
    const handlerName = context.getHandler().name || 'unknownHandler';
    return `${className}.${handlerName}`;
  }
}
