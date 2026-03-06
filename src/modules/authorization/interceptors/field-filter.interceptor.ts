import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { getSensitiveFields } from '../decorators/sensitive-field.decorator';
import { PermissionCacheService } from '../services/permission-cache.service';

/**
 * Strips sensitive fields from the response based on the user's permissions.
 *
 * Scans the response data for objects whose class has `@SensitiveField()`
 * decorators, and removes fields the user doesn't have permission to see.
 *
 * Apply per-controller or globally as needed.
 */
@Injectable()
export class FieldFilterInterceptor implements NestInterceptor {
  constructor(private readonly permissionCache: PermissionCacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data: unknown) => {
        if (!request.localUser || !request.localUser.businessId) {
          return data;
        }
        return this.filterSensitiveFields(data, request);
      }),
    );
  }

  private filterSensitiveFields(data: unknown, request: Request): unknown {
    if (!data || typeof data !== 'object') return data;

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map((item) => this.filterSensitiveFields(item, request));
    }

    // Check if the object's class has sensitive field metadata
    const ctor = data.constructor as abstract new (...args: unknown[]) => unknown;
    const sensitiveFields = getSensitiveFields(ctor);

    if (sensitiveFields.size === 0) return data;

    const result = { ...data } as Record<string, unknown>;

    for (const [field] of sensitiveFields) {
      const fieldName = String(field);
      // Check if user has the required permission key
      // For now, super admins bypass; others have the field removed
      if (!request.localUser?.isSuperAdmin) {
        delete result[fieldName];
      }
    }

    return result;
  }
}
