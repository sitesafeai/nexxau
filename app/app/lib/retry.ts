/**
 * Retry Utility for SiteSafe
 * 
 * Provides retry logic with exponential backoff for:
 * - Database operations
 * - API requests
 * - Camera connections
 */

import { logger } from './logger';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number; // milliseconds
  maxDelay?: number; // milliseconds
  backoffMultiplier?: number;
  jitter?: boolean; // Add random jitter to prevent thundering herd
  jitterMax?: number; // Maximum jitter percentage (default: 0.3 = 30%)
  retryableErrors?: string[]; // Error messages that should trigger retry
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (error: Error) => boolean;
  rateLimitPerSecond?: number; // Max retries per second (prevents reconnect storms)
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryableErrors' | 'onRetry' | 'shouldRetry'>> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true,
  jitterMax: 0.3, // 30% jitter
  rateLimitPerSecond: 10, // Max 10 retries per second
};

// Rate limiter for retries (prevents reconnect storms)
class RetryRateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  public canRetry(key: string, maxPerSecond: number): boolean {
    const now = Date.now();
    const windowStart = now - 1000; // Last second
    
    if (!this.attempts.has(key)) {
      this.attempts.set(key, []);
    }
    
    const attempts = this.attempts.get(key)!;
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(timestamp => timestamp > windowStart);
    this.attempts.set(key, recentAttempts);
    
    // Check if we're under the limit
    if (recentAttempts.length >= maxPerSecond) {
      return false;
    }
    
    // Record this attempt
    recentAttempts.push(now);
    return true;
  }
  
  public clear(key: string): void {
    this.attempts.delete(key);
  }
}

const rateLimiter = new RetryRateLimiter();

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
  context?: string
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      // Log attempt
      if (attempt > 1) {
        logger.debug(`Retry attempt ${attempt}/${opts.maxAttempts}`, { 
          context, 
          attempt 
        });
      }
      
      // Execute operation
      const result = await operation();
      
      // Success!
      if (attempt > 1) {
        logger.info(`Operation succeeded on attempt ${attempt}`, { 
          context, 
          attempt 
        });
      }
      
      return result;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry this error
      const shouldRetry = options.shouldRetry 
        ? options.shouldRetry(lastError)
        : isRetryableError(lastError, options.retryableErrors);
      
      if (!shouldRetry) {
        logger.warn(`Non-retryable error encountered`, { 
          context, 
          attempt,
          error: lastError.message 
        });
        throw lastError;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === opts.maxAttempts) {
        logger.error(`Operation failed after ${attempt} attempts`, { 
          context, 
          attempt,
          maxAttempts: opts.maxAttempts
        }, lastError);
        throw lastError;
      }
      
      // Check rate limit (prevent reconnect storms)
      const rateLimitKey = context || 'default';
      if (opts.rateLimitPerSecond) {
        if (!rateLimiter.canRetry(rateLimitKey, opts.rateLimitPerSecond)) {
          logger.error(`Rate limit exceeded for ${rateLimitKey}, aborting retry`, {
            context,
            attempt,
            maxPerSecond: opts.rateLimitPerSecond,
          });
          throw new Error(`Rate limit exceeded: too many retries for ${rateLimitKey}`);
        }
      }
      
      // Calculate delay with exponential backoff
      let delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay
      );
      
      // Add jitter to prevent thundering herd
      if (opts.jitter) {
        const jitterAmount = delay * opts.jitterMax * Math.random();
        const jitterSign = Math.random() < 0.5 ? -1 : 1;
        delay = Math.max(0, delay + (jitterSign * jitterAmount));
      }
      
      logger.warn(`Operation failed, retrying in ${Math.round(delay)}ms`, { 
        context, 
        attempt,
        delay: Math.round(delay),
        error: lastError.message,
        jitter: opts.jitter,
      });
      
      // Call onRetry callback if provided
      if (options.onRetry) {
        options.onRetry(attempt, lastError);
      }
      
      // Wait before retrying
      await sleep(Math.round(delay));
    }
  }
  
  // This shouldn't be reached, but TypeScript needs it
  throw lastError || new Error('Operation failed with unknown error');
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: Error, retryableErrors?: string[]): boolean {
  const errorMessage = error.message.toLowerCase();
  
  // Network and connection errors are always retryable
  const networkErrors = [
    'econnrefused',
    'econnreset',
    'etimedout',
    'enotfound',
    'network',
    'timeout',
    'socket hang up',
    'connection refused',
    'connection reset',
    'connection timeout'
  ];
  
  if (networkErrors.some(netErr => errorMessage.includes(netErr))) {
    return true;
  }
  
  // Database-specific retryable errors
  const dbErrors = [
    'deadlock',
    'lock timeout',
    'connection pool',
    'too many connections',
    'connection terminated'
  ];
  
  if (dbErrors.some(dbErr => errorMessage.includes(dbErr))) {
    return true;
  }
  
  // Check custom retryable errors
  if (retryableErrors) {
    return retryableErrors.some(retryableErr => 
      errorMessage.includes(retryableErr.toLowerCase())
    );
  }
  
  return false;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a database operation with transaction support
 */
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  return retry(
    operation,
    {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2,
      retryableErrors: [
        'deadlock',
        'lock timeout',
        'connection',
        'ECONNREFUSED',
        'ETIMEDOUT'
      ]
    },
    context || 'database-operation'
  );
}

/**
 * Retry an API request
 */
export async function retryApiRequest<T>(
  request: () => Promise<T>,
  context?: string
): Promise<T> {
  return retry(
    request,
    {
      maxAttempts: 3,
      initialDelay: 500,
      maxDelay: 3000,
      backoffMultiplier: 2,
      shouldRetry: (error: Error) => {
        // Retry on network errors and 5xx status codes
        const message = error.message.toLowerCase();
        return (
          message.includes('network') ||
          message.includes('timeout') ||
          message.includes('503') ||
          message.includes('502') ||
          message.includes('500')
        );
      }
    },
    context || 'api-request'
  );
}

/**
 * Retry a camera connection
 */
export async function retryCameraConnection<T>(
  connect: () => Promise<T>,
  cameraId: string
): Promise<T> {
  return retry(
    connect,
    {
      maxAttempts: 5,
      initialDelay: 2000,
      maxDelay: 15000,
      backoffMultiplier: 1.5,
      onRetry: (attempt, error) => {
        logger.cameraError(
          cameraId,
          `Camera connection attempt ${attempt} failed: ${error.message}`,
          error,
          { attempt }
        );
      }
    },
    `camera-${cameraId}`
  );
}

/**
 * Circuit breaker pattern for repeated failures
 * 
 * Prevents overwhelming a failing service with retry attempts
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private context?: string
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      
      if (timeSinceLastFailure < this.timeout) {
        logger.warn('Circuit breaker is open, rejecting request', { 
          context: this.context,
          failures: this.failures,
          timeSinceLastFailure
        });
        throw new Error('Circuit breaker is open');
      }
      
      // Try half-open state
      this.state = 'half-open';
      logger.info('Circuit breaker entering half-open state', { 
        context: this.context 
      });
    }
    
    try {
      const result = await operation();
      
      // Success - close the circuit
      if (this.state === 'half-open' || this.failures > 0) {
        logger.info('Circuit breaker closing', { 
          context: this.context,
          previousFailures: this.failures
        });
      }
      
      this.failures = 0;
      this.state = 'closed';
      
      return result;
      
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.threshold) {
        this.state = 'open';
        logger.error('Circuit breaker opened due to repeated failures', { 
          context: this.context,
          failures: this.failures,
          threshold: this.threshold
        });
      }
      
      throw error;
    }
  }
  
  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }
  
  reset() {
    this.failures = 0;
    this.state = 'closed';
    logger.info('Circuit breaker manually reset', { 
      context: this.context 
    });
  }
}

/**
 * Batch retry - retry multiple operations with shared failure tracking
 */
export async function retryBatch<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
  const results = await Promise.allSettled(
    operations.map(op => retry(op, options))
  );
  
  return results.map(result => {
    if (result.status === 'fulfilled') {
      return { success: true, result: result.value };
    } else {
      return { success: false, error: result.reason };
    }
  });
}

