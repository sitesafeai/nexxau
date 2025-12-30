/**
 * Defensive Fetch Utilities
 * Provides robust error handling and logging for API calls
 */

export interface FetchError {
  type: 'network' | 'http' | 'parse' | 'unknown';
  message: string;
  status?: number;
  statusText?: string;
  url?: string;
  originalError?: any;
}

/**
 * Safe fetch wrapper with comprehensive error handling
 */
export async function safeFetch(
  url: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: any; error?: FetchError; response?: Response }> {
  const fullUrl = typeof window !== 'undefined' 
    ? (url.startsWith('http') ? url : `${window.location.origin}${url}`)
    : url;
  
  console.log('[FETCH] Request:', {
    method: options?.method || 'GET',
    url: fullUrl,
    timestamp: new Date().toISOString()
  });

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    console.log('[FETCH] Response:', {
      url: fullUrl,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    // Handle non-OK responses
    if (!response.ok) {
      let errorData: any = null;
      try {
        const text = await response.text();
        if (text) {
          errorData = JSON.parse(text);
        }
      } catch (e) {
        // Response is not JSON, use status text
        errorData = { error: response.statusText };
      }

      const error: FetchError = {
        type: 'http',
        message: errorData?.error || errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        statusText: response.statusText,
        url: fullUrl,
      };

      console.error('[FETCH] HTTP Error:', error);
      return { success: false, error, response };
    }

    // Parse response
    let data: any;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      try {
        data = await response.json();
      } catch (e) {
        const error: FetchError = {
          type: 'parse',
          message: 'Failed to parse JSON response',
          url: fullUrl,
          originalError: e,
        };
        console.error('[FETCH] Parse Error:', error);
        return { success: false, error, response };
      }
    } else {
      data = await response.text();
    }

    console.log('[FETCH] Success:', { url: fullUrl, dataSize: JSON.stringify(data).length });
    return { success: true, data, response };

  } catch (error: any) {
    // Network errors (ERR_CONNECTION_REFUSED, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const fetchError: FetchError = {
        type: 'network',
        message: 'Backend unavailable. Please check if the server is running.',
        url: fullUrl,
        originalError: error,
      };
      console.error('[FETCH] Network Error:', fetchError);
      return { success: false, error: fetchError };
    }

    // Other errors
    const unknownError: FetchError = {
      type: 'unknown',
      message: error?.message || 'Unknown error occurred',
      url: fullUrl,
      originalError: error,
    };
    console.error('[FETCH] Unknown Error:', unknownError);
    return { success: false, error: unknownError };
  }
}

/**
 * Get API base URL from environment or use relative path
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side: use relative path or env var
    return process.env.NEXT_PUBLIC_API_BASE_URL || '';
  }
  
  // Client-side: use env var or current origin
  return process.env.NEXT_PUBLIC_API_BASE_URL || '';
}

/**
 * Build full API URL
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  if (baseUrl) {
    // Absolute URL
    return `${baseUrl}${cleanEndpoint}`;
  }
  
  // Relative URL (Next.js API routes)
  return `/api${cleanEndpoint}`;
}

/**
 * Get stream base URL from environment
 */
export function getStreamBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_STREAM_BASE_URL || 'http://localhost:8888';
  }
  
  return process.env.NEXT_PUBLIC_STREAM_BASE_URL || 'http://localhost:8888';
}

/**
 * Build full stream URL
 */
export function buildStreamUrl(path: string): string {
  const baseUrl = getStreamBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

