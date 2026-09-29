import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import jwt, { JwtPayload } from 'jsonwebtoken';

interface AuthRequestLike {
  headers?: Record<string, unknown>;
  user?: unknown;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = this.getRequest(context);
    if (!request) {
      throw new UnauthorizedException('Request context not available');
    }

    const token = this.extractBearerToken(request.headers?.authorization);
    if (token) {
      const payload = this.verifyJwt(token);
      request.user = payload;
      return true;
    }

    const incoming = request.headers?.['x-api-key'];
    const expected = process.env.WORKFLOW_API_KEY ?? 'dev-key';
    if (incoming !== expected) {
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

    try {
      const verified = jwt.verify(token, secret);
      if (typeof verified === 'string') {
        throw new UnauthorizedException('Invalid JWT payload');
      }
      return verified;
    } catch {
      throw new UnauthorizedException('Invalid JWT token');
    }
  }
}
