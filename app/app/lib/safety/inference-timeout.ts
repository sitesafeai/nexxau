/**
 * Inference Timeout & GPU Safety
 * 
 * Per directive: Assume the model will crash.
 * - Wrap inference in hard timeouts
 * - Kill execution on GPU OOM
 * - Restart workers automatically
 * - Never share GPU context across unrelated sites
 */

export interface InferenceOptions {
  timeoutMs: number; // Hard timeout for inference
  maxRetries: number; // Max retries on failure
  gpuDeviceId?: number; // GPU device to use
  batchSize?: number; // Batch size for inference
  memoryLimitMB?: number; // GPU memory limit
}

export interface InferenceResult<T = any> {
  success: boolean;
  result?: T;
  error?: string;
  executionTimeMs: number;
  gpuMemoryUsedMB?: number;
  retries: number;
}

const DEFAULT_OPTIONS: Required<Omit<InferenceOptions, 'gpuDeviceId' | 'batchSize' | 'memoryLimitMB'>> = {
  timeoutMs: 5000, // 5 seconds default timeout
  maxRetries: 1,
};

/**
 * Execute inference with timeout and GPU safety
 */
export async function executeInferenceWithTimeout<T>(
  inferenceFn: () => Promise<T>,
  options: Partial<InferenceOptions> = {}
): Promise<InferenceResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  let retries = 0;
  let lastError: Error | null = null;

  while (retries <= opts.maxRetries) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Inference timeout after ${opts.timeoutMs}ms`));
        }, opts.timeoutMs);
      });

      // Race inference against timeout
      const result = await Promise.race([
        inferenceFn(),
        timeoutPromise,
      ]);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result,
        executionTimeMs: executionTime,
        retries,
      };
    } catch (error: any) {
      lastError = error;
      retries++;

      // Check if it's a timeout
      if (error.message?.includes('timeout')) {
        console.error(`[InferenceTimeout] Inference timed out after ${opts.timeoutMs}ms (attempt ${retries})`);
        
        if (retries > opts.maxRetries) {
          return {
            success: false,
            error: `Inference timeout after ${opts.timeoutMs}ms`,
            executionTimeMs: Date.now() - startTime,
            retries,
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      // Check if it's a GPU OOM error
      if (error.message?.includes('out of memory') || 
          error.message?.includes('OOM') ||
          error.message?.includes('CUDA out of memory')) {
        console.error(`[InferenceTimeout] GPU OOM detected (attempt ${retries})`);
        
        // Try to free GPU memory
        if (typeof global !== 'undefined' && (global as any).gc) {
          (global as any).gc(); // Force garbage collection if available
        }
        
        if (retries > opts.maxRetries) {
          return {
            success: false,
            error: 'GPU out of memory',
            executionTimeMs: Date.now() - startTime,
            retries,
          };
        }
        
        // Wait longer before retry after OOM
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      // Other errors - don't retry
      return {
        success: false,
        error: error.message || 'Inference failed',
        executionTimeMs: Date.now() - startTime,
        retries,
      };
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Inference failed after retries',
    executionTimeMs: Date.now() - startTime,
    retries,
  };
}

/**
 * Check GPU memory availability
 */
export async function checkGPUMemory(deviceId: number = 0): Promise<{
  available: boolean;
  totalMB?: number;
  freeMB?: number;
  usedMB?: number;
}> {
  try {
    // This would need to be implemented based on your GPU library
    // For PyTorch: torch.cuda.get_device_properties(deviceId).total_memory
    // For TensorFlow: tf.config.experimental.get_memory_info('GPU:0')
    
    // Placeholder - implement based on your ML framework
    return {
      available: true,
      // totalMB, freeMB, usedMB would be populated here
    };
  } catch (error) {
    console.error('[InferenceTimeout] Failed to check GPU memory:', error);
    return { available: false };
  }
}

/**
 * Monitor inference health
 */
export class InferenceHealthMonitor {
  private static instance: InferenceHealthMonitor;
  private failureCount: Map<string, number> = new Map();
  private lastFailure: Map<string, Date> = new Map();
  private readonly maxFailures = 5;
  private readonly failureWindowMs = 60000; // 1 minute

  public static getInstance(): InferenceHealthMonitor {
    if (!InferenceHealthMonitor.instance) {
      InferenceHealthMonitor.instance = new InferenceHealthMonitor();
    }
    return InferenceHealthMonitor.instance;
  }

  /**
   * Record inference failure
   */
  public recordFailure(worksiteId: string, error: string): void {
    const now = new Date();
    const lastFail = this.lastFailure.get(worksiteId);
    
    // Reset if outside window
    if (!lastFail || (now.getTime() - lastFail.getTime()) > this.failureWindowMs) {
      this.failureCount.set(worksiteId, 0);
    }
    
    const count = (this.failureCount.get(worksiteId) || 0) + 1;
    this.failureCount.set(worksiteId, count);
    this.lastFailure.set(worksiteId, now);
    
    console.warn(`[InferenceHealth] Worksite ${worksiteId}: ${count} failures in window`);
    
    // Alert if threshold exceeded
    if (count >= this.maxFailures) {
      console.error(`[InferenceHealth] Worksite ${worksiteId}: ${count} failures exceeded threshold`);
      // In production, trigger alert/notification
    }
  }

  /**
   * Record inference success
   */
  public recordSuccess(worksiteId: string): void {
    this.failureCount.set(worksiteId, 0);
  }

  /**
   * Check if worksite should skip inference (too many failures)
   */
  public shouldSkipInference(worksiteId: string): boolean {
    const failures = this.failureCount.get(worksiteId) || 0;
    return failures >= this.maxFailures;
  }
}

export const inferenceHealthMonitor = InferenceHealthMonitor.getInstance();

