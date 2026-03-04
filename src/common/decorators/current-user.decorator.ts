import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Extracts the normalized AuthUser from the request object.
 *
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthUser) { ... }
 *
 * @Get('my-id')
 * getMyId(@CurrentUser('id') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as Record<string, unknown> | undefined;
    return data ? user?.[data] : user;
  },
);
