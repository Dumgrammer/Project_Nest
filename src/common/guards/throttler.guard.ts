import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(
    context: ExecutionContext,
  ): { req: Record<string, unknown>; res: Record<string, unknown> } {
    const contextType = context.getType<string>();
    if (contextType === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context).getContext<{
        req?: Record<string, unknown>;
        res?: Record<string, unknown>;
      }>();

      return {
        req: (gqlContext?.req ?? {}) as Record<string, unknown>,
        res: (gqlContext?.res ?? {}) as Record<string, unknown>,
      };
    }

    const http = context.switchToHttp();
    return {
      req: (http.getRequest() ?? {}) as Record<string, unknown>,
      res: (http.getResponse() ?? {}) as Record<string, unknown>,
    };
  }
}
