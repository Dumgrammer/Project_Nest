import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { SecurityAuditService } from '../../security-audit/security-audit.service.js';

interface AuthRequestLike {
  headers?: Record<string, unknown>;
  user?: unknown;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly securityAudit: SecurityAuditService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = this.getRequest(context);
    if (!request) {
      throw new UnauthorizedException('Request context not available');
    }

    const token = this.extractBearerToken(request.headers?.authorization);
    if (token) {
      try {
        const payload = this.verifyJwt(token);
        request.user = payload;
        return true;
      } catch (error) {
        await this.recordDenied(context, request, 'auth.jwt.invalid', 'jwt');
        if (error instanceof UnauthorizedException) {
          throw error;
        }
        throw new UnauthorizedException('Invalid JWT token');
      }
    }

    const incoming = request.headers?.['x-api-key'];
    const expected = this.resolveExpectedApiKey();
    if (incoming !== expected) {
      await this.recordDenied(context, request, 'auth.api_key.invalid', 'api_key');
      throw new UnauthorizedException('Invalid API key');
    }
    return true;
  }

  private getRequest(
    context: ExecutionContext,
  ): AuthRequestLike | undefined {
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

  private extractBearerToken(value: unknown): string | null {
    if (typeof value === 'string') {
      return this.parseBearer(value);
    }
    if (Array.isArray(value)) {
      for (const candidate of value) {
        if (typeof candidate !== 'string') {
          continue;
        }
        const token = this.parseBearer(candidate);
        if (token) {
          return token;
        }
      }
    }
    return null;
  }

  private parseBearer(value: string): string | null {
    const [scheme, token] = value.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }
    return token.trim() || null;
  }

  private verifyJwt(token: string): JwtPayload {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException('JWT auth is not configured');
    }

    const verified = jwt.verify(token, secret);
    if (typeof verified === 'string') {
      throw new UnauthorizedException('Invalid JWT payload');
    }
    return verified;
  }

  private resolveExpectedApiKey(): string {
    const configured = process.env.WORKFLOW_API_KEY;
    if (configured && configured.trim().length > 0) {
      return configured.trim();
    }

    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('API key auth is not configured');
    }

    return 'dev-key';
  }

  private async recordDenied(
    context: ExecutionContext,
    request: AuthRequestLike,
    reason: string,
    authType: string,
  ): Promise<void> {
    const req = request as AuthRequestLike & {
      method?: string;
      originalUrl?: string;
      url?: string;
      ip?: string;
    };
    await this.securityAudit.recordDeniedAttempt({
      action: this.resolveAction(context),
      reason,
      authType,
      method: req.method,
      endpoint: req.originalUrl ?? req.url,
      metadata: {
        ip: req.ip,
        headers: request.headers,
      },
    });
  }

  private resolveAction(context: ExecutionContext): string {
    const className = context.getClass().name || 'UnknownClass';
    const handlerName = context.getHandler().name || 'unknownHandler';
    return `${className}.${handlerName}`;
  }
}
