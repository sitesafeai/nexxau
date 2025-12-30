/**
 * Explicit Timeout Utilities
 * 
 * Provides explicit timeout tracking without relying on error message parsing.
 * Distinguishes between:
 * - User abort
 * - Timeout
 * - Network failure
 */

export class ExplicitTimeoutError extends Error {
  readonly name = 'ExplicitTimeoutError';
  readonly isTimeout = true;
  readonly timeoutMs: number;
  readonly startTime: number;
  readonly elapsed: number;

  constructor(timeoutMs: number, startTime: number) {
    const elapsed = Date.now() - startTime;
    super(`Request timed out after ${timeoutMs}ms (elapsed: ${elapsed}ms)`);
    this.timeoutMs = timeoutMs;
    this.startTime = startTime;
    this.elapsed = elapsed;
    Object.setPrototypeOf(this, ExplicitTimeoutError.prototype);
  }
}

export class UserAbortError extends Error {
  readonly name = 'UserAbortError';
  readonly isAbort = true;

  constructor() {
    super('Request was aborted by user');
    Object.setPrototypeOf(this, UserAbortError.prototype);
  }
}

export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Fetch with explicit timeout tracking
 * 
 * Returns:
 * - Response on success
 * - ExplicitTimeoutError on timeout
 * - UserAbortError on user abort
 * - Network error on network failure
 */
export async function fetchWithExplicitTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const timeoutMs = options.timeoutMs || 5000;
  const startTime = Date.now();
  
  // Create AbortController for timeout
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, timeoutMs);

  // Combine signals if user provided one
  let combinedSignal: AbortSignal;
  if (options.signal) {
    // User abort takes precedence
    const userAbortController = new AbortController();
    options.signal.addEventListener('abort', () => {
      userAbortController.abort();
      clearTimeout(timeoutId);
    });
    timeoutController.signal.addEventListener('abort', () => {
      // Timeout occurred
      userAbortController.abort();
    });
    combinedSignal = userAbortController.signal;
  } else {
    combinedSignal = timeoutController.signal;
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: combinedSignal,
    });

    clearTimeout(timeoutId);
    return response;

  } catch (error: any) {
    clearTimeout(timeoutId);

    // Explicit timeout detection
    if (timeoutController.signal.aborted && !options.signal?.aborted) {
      throw new ExplicitTimeoutError(timeoutMs, startTime);
    }

    // User abort detection
    if (options.signal?.aborted) {
      throw new UserAbortError();
    }

    // Network error (connection refused, DNS failure, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError = new Error(`Network error: ${error.message}`);
      networkError.name = 'NetworkError';
      (networkError as any).isNetworkError = true;
      throw networkError;
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Check if error is a timeout
 */
export function isTimeoutError(error: any): boolean {
  return error instanceof ExplicitTimeoutError || 
         error?.isTimeout === true ||
         error?.name === 'ExplicitTimeoutError';
}

/**
 * Check if error is a user abort
 */
export function isUserAbortError(error: any): boolean {
  return error instanceof UserAbortError ||
         error?.isAbort === true ||
         error?.name === 'UserAbortError';
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  return error?.isNetworkError === true ||
         (error instanceof TypeError && error.message.includes('fetch'));
}

