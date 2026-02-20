import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../types/response.type';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const errorResponse: ApiResponse<null> = {
      success: false,
      statusCode: status,
      message: exception.message,
      path: request.url,
      timestamp: new Date().toISOString(),
      data: null,
    };

    this.logger.error(`${request.method} ${request.url} ${status} - ${exception.message}`);

    response.status(status).json(errorResponse);
  }
}
