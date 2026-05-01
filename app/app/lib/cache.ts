type CacheEntry<T> = {
  data: T;
  expires: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) {
    return hit.data as T;
  }

  const active = inflight.get(key);
  if (active) {
    return active as Promise<T>;
  }

  const promise = fn()
    .then((data) => {
      cache.set(key, { data, expires: now + ttlMs });
      return data;
    })
    .finally(() => {
      inflight.delete(key);
      if (cache.size > 1000) {
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
      }
    });

  inflight.set(key, promise);
  return promise;
}

/**
 * Simple In-Memory Cache Utility
 * 
 * Provides caching for API responses to enable instant Overview tab loads.
 * 
 * Architecture:
 * - In-memory Map-based cache (can be upgraded to Redis in production)
 * - TTL (Time-To-Live) support
 * - Automatic expiration cleanup
 * - Cache invalidation support
 * 
 * Usage:
 * ```typescript
 * const cached = await Cache.get('key');
 * await Cache.set('key', value, { ttl: 300 });
 * await Cache.wrap('key', () => fetchData(), { ttl: 60 });
 * ```
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value as T;
  }

  /**
   * Set a value in cache with optional TTL
   * 
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Cache options (ttl in seconds)
   */
  async set<T>(key: string, value: T, options?: { ttl?: number }): Promise<void> {
    const ttl = (options?.ttl || 300) * 1000; // Convert to milliseconds
    const expiresAt = Date.now() + ttl;
    
    this.cache.set(key, {
      value,
      expiresAt
    });
  }

  /**
   * Wrap a function with caching
   * 
   * If cached value exists and is not expired, returns cached value.
   * Otherwise, executes function, caches result, and returns it.
   * 
   * @param key - Cache key
   * @param fn - Function to execute if cache miss
   * @param options - Cache options (ttl in seconds)
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    options?: { ttl?: number }
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const result = await fn();
    await this.set(key, result, options);
    return result;
  }

  /**
   * Delete a cache entry
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Delete all cache entries matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[Cache] Cleaned up ${cleaned} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance
export const Cache = new CacheManager();

/**
 * Cache key generators for consistency
 */
export const CacheKeys = {
  safetyScore: (worksiteId: string, date: string) => 
    `safetyScore:${worksiteId}:${date}`,
  
  cameraMetrics: (worksiteId: string) => 
    `cameraMetrics:${worksiteId}`,
  
  alertMetrics: (worksiteId: string) => 
    `alertMetrics:${worksiteId}`,
  
  safetyScoreMetrics: (worksiteId: string) => 
    `safetyScoreMetrics:${worksiteId}`,
  
  lastActivity: (worksiteId: string) => 
    `lastActivity:${worksiteId}`,
  
  // Pattern for invalidating all worksite-related caches
  worksitePattern: (worksiteId: string) => 
    `^(${worksiteId}|.*:${worksiteId}.*)$`
};

