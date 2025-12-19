/**
 * Next.js API Route Middleware
 * 
 * Provides standardized middleware for API routes with:
 * - Correlation IDs
 * - API versioning
 * - Error handling
 * - Request logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiVersioning, ApiResponse, ApiError } from './api-versioning';
import { observability } from './observability';

export interface ApiContext {
  correlationId: string;
  version: string;
  path: string;
  method: string;
  startTime: number;
}

/**
 * Create API context from request
 */
export function createApiContext(request: NextRequest): ApiContext {
  const correlationId = ApiVersioning.getCorrelationId(request);
  const version = ApiVersioning.getLatestVersion();
  const path = new URL(request.url).pathname;
  const method = request.method;

  return {
    correlationId,
    version,
    path,
    method,
    startTime: Date.now(),
  };
}

/**
 * Wrap API route handler with safety middleware
 */
export function withApiSafety<T = any>(
  handler: (request: NextRequest, context: ApiContext) => Promise<T>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const context = createApiContext(request);
    const { correlationId, path, method } = context;

    try {
      // Validate API version
      const versionCheck = ApiVersioning.validateVersion(request);
      if (!versionCheck.valid) {
        return ApiVersioning.createErrorResponse(
          new Error(versionCheck.error || 'Unsupported API version'),
          correlationId,
          400,
          path
        );
      }

      // Execute handler
      const result = await handler(request, context);

      // Create success response
      const response = ApiVersioning.createSuccessResponse(result, correlationId);

      // Add correlation ID to headers
      response.headers.set('X-Correlation-ID', correlationId);
      response.headers.set('X-API-Version', context.version);

      // Log request
      const latency = Date.now() - context.startTime;
      console.log(`[API] ${method} ${path} - ${response.status} - ${latency}ms - ${correlationId}`);

      return response;
    } catch (error: any) {
      // Record error
      observability.recordError(error, `API:${method}:${path}`, undefined);

      // Create error response
      const statusCode = error.statusCode || error.status || 500;
      const response = ApiVersioning.createErrorResponse(
        error,
        correlationId,
        statusCode,
        path
      );

      // Add correlation ID to headers
      response.headers.set('X-Correlation-ID', correlationId);
      response.headers.set('X-API-Version', context.version);

      // Log error
      const latency = Date.now() - context.startTime;
      console.error(`[API] ${method} ${path} - ${statusCode} - ${latency}ms - ${correlationId}`, error);

      return response;
    }
  };
}

/**
 * Extract correlation ID from response (for logging)
 */
export function getCorrelationId(request: NextRequest): string {
  return ApiVersioning.getCorrelationId(request);
}

