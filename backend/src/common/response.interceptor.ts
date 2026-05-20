import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Standard API response format
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  path: string;
}

/**
 * Response interceptor to standardize all API responses
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      map((data) => {
        const response = context.getResponse();
        const statusCode = response.statusCode;

        this.logger.log(`${method} ${url} - ${statusCode}`);

        return {
          success: statusCode >= 200 && statusCode < 300,
          data,
          timestamp: new Date().toISOString(),
          path: url,
        };
      }),
    );
  }
}

/**
 * Paginated response format
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    path: '',
  };
}

/**
 * Create error response
 */
export function createErrorResponse(error: string): ApiResponse<null> {
  return {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    path: '',
  };
}
