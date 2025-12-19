/**
 * API Versioning & Correlation ID System
 * 
 * Per directive: APIs must be boring and predictable.
 * - Strict versioning
 * - Correlation IDs in every request
 * - Standardized error schema
 */

export interface ApiVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface ApiError {
  error: string;
  message: string;
  code?: string;
  correlationId: string;
  timestamp: string;
  path?: string;
  details?: Record<string, any>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  correlationId: string;
  version: string;
  timestamp: string;
}

export class ApiVersioning {
  private static readonly DEFAULT_VERSION = '1.0.0';
  private static readonly SUPPORTED_VERSIONS = ['1.0.0', '1.1.0'];
  private static readonly LATEST_VERSION = '1.1.0';

  /**
   * Parse API version from header or query param
   */
  public static parseVersion(versionString?: string | null): ApiVersion {
    if (!versionString) {
      return this.parseVersionString(this.DEFAULT_VERSION);
    }

    // Support formats: "1.0.0", "v1", "1.0", "application/vnd.api+json;version=1.0"
    const match = versionString.match(/(\d+)\.?(\d+)?\.?(\d+)?/);
    if (match) {
      return {
        major: parseInt(match[1] || '1', 10),
        minor: parseInt(match[2] || '0', 10),
        patch: parseInt(match[3] || '0', 10),
      };
    }

    return this.parseVersionString(this.DEFAULT_VERSION);
  }

  /**
   * Check if version is supported
   */
  public static isVersionSupported(version: ApiVersion | string): boolean {
    const v = typeof version === 'string' ? this.parseVersionString(version) : version;
    const versionString = `${v.major}.${v.minor}.${v.patch}`;
    return this.SUPPORTED_VERSIONS.includes(versionString);
  }

  /**
   * Get latest supported version
   */
  public static getLatestVersion(): string {
    return this.LATEST_VERSION;
  }

  /**
   * Generate correlation ID
   */
  public static generateCorrelationId(): string {
    // Use crypto.randomUUID if available, fallback to timestamp + random
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback for Node.js
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}`;
  }

  /**
   * Extract correlation ID from request
   */
  public static getCorrelationId(request: Request): string {
    // Check header first
    const headerId = request.headers.get('X-Correlation-ID') || 
                     request.headers.get('X-Request-ID') ||
                     request.headers.get('Correlation-ID');
    
    if (headerId) {
      return headerId;
    }

    // Check query param
    const url = new URL(request.url);
    const queryId = url.searchParams.get('correlationId') || url.searchParams.get('requestId');
    if (queryId) {
      return queryId;
    }

    // Generate new one
    return this.generateCorrelationId();
  }

  /**
   * Create standardized error response
   */
  public static createErrorResponse(
    error: Error | string,
    correlationId: string,
    statusCode: number = 500,
    path?: string,
    details?: Record<string, any>
  ): Response {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorName = typeof error === 'string' ? 'Error' : error.name;

    const apiError: ApiError = {
      error: errorName,
      message: errorMessage,
      code: this.getErrorCode(errorName, statusCode),
      correlationId,
      timestamp: new Date().toISOString(),
      path,
      details,
    };

    const response: ApiResponse = {
      success: false,
      error: apiError,
      correlationId,
      version: this.LATEST_VERSION,
      timestamp: new Date().toISOString(),
    };

    return Response.json(response, { status: statusCode });
  }

  /**
   * Create standardized success response
   */
  public static createSuccessResponse<T>(
    data: T,
    correlationId: string,
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      correlationId,
      version: this.LATEST_VERSION,
      timestamp: new Date().toISOString(),
    };

    return Response.json(response, { status: statusCode });
  }

  /**
   * Get error code from error name and status
   */
  private static getErrorCode(errorName: string, statusCode: number): string {
    const codeMap: Record<string, string> = {
      'ValidationError': 'VALIDATION_ERROR',
      'NotFoundError': 'NOT_FOUND',
      'UnauthorizedError': 'UNAUTHORIZED',
      'ForbiddenError': 'FORBIDDEN',
      'ConflictError': 'CONFLICT',
      'RateLimitError': 'RATE_LIMIT_EXCEEDED',
      'DatabaseError': 'DATABASE_ERROR',
      'NetworkError': 'NETWORK_ERROR',
      'TimeoutError': 'TIMEOUT',
    };

    if (codeMap[errorName]) {
      return codeMap[errorName];
    }

    // Default codes by status
    const statusCodeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return statusCodeMap[statusCode] || 'UNKNOWN_ERROR';
  }

  /**
   * Parse version string to ApiVersion
   */
  private static parseVersionString(version: string): ApiVersion {
    const parts = version.split('.').map(p => parseInt(p || '0', 10));
    return {
      major: parts[0] || 1,
      minor: parts[1] || 0,
      patch: parts[2] || 0,
    };
  }

  /**
   * Validate API version compatibility
   */
  public static validateVersion(request: Request): {
    valid: boolean;
    version: ApiVersion;
    error?: string;
  } {
    const versionHeader = request.headers.get('API-Version') || 
                          request.headers.get('X-API-Version');
    
    const version = this.parseVersion(versionHeader);
    
    if (!this.isVersionSupported(version)) {
      return {
        valid: false,
        version,
        error: `Unsupported API version: ${version.major}.${version.minor}.${version.patch}. Supported versions: ${this.SUPPORTED_VERSIONS.join(', ')}`,
      };
    }

    return { valid: true, version };
  }
}

/**
 * Next.js middleware for API versioning and correlation IDs
 */
export function apiMiddleware(request: Request): {
  correlationId: string;
  version: ApiVersion;
  versionValid: boolean;
} {
  const correlationId = ApiVersioning.getCorrelationId(request);
  const versionCheck = ApiVersioning.validateVersion(request);
  
  // Add correlation ID to response headers
  // (Note: In Next.js, you'd set this in the route handler)
  
  return {
    correlationId,
    version: versionCheck.version,
    versionValid: versionCheck.valid,
  };
}

