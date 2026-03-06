import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

/**
 * Interceptor that reads the resolved `dataScope` from the request
 * (set by {@link PermissionGuard}) and makes it available for logging.
 *
 * The actual scope filtering happens in the service layer, where
 * services read `request.dataScope` to determine query filters.
 * This interceptor exists primarily for observability.
 */
@Injectable()
export class DataScopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    // dataScope is already set on the request by PermissionGuard.
    // Services can access it via @Req() or by injecting REQUEST scope.
    // This interceptor is a passthrough for now — extend for logging/metrics.
    if (request.dataScope) {
      // Could add logging, metrics, etc. here
    }

    return next.handle();
  }
}
