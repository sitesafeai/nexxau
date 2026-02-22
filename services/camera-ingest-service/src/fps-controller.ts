/**
 * FPS Controller
 * 
 * Controls frame rate based on system load to reduce costs and ensure stability.
 */

import { createLogger, Logger } from '@nexxau/logger';
import os from 'os';

const logger = createLogger({
  service: 'camera-ingest-service',
  environment: process.env.NODE_ENV || 'development',
  version: '1.0.0',
});

export interface FPSControllerConfig {
  minFPS: number;
  maxFPS: number;
  reductionFactor: number;
  loadThresholdCPU: number;
  loadThresholdMemory: number;
  loadThresholdBacklog: number;
}

export class FPSController {
  private config: FPSControllerConfig;
  private currentFPS: number;
  private loadCheckInterval?: NodeJS.Timeout;

  constructor(config?: Partial<FPSControllerConfig>) {
    this.config = {
      minFPS: parseFloat(process.env.FPS_CONTROL_MIN || '0.5'),
      maxFPS: parseFloat(process.env.FPS_CONTROL_MAX || '10.0'),
      reductionFactor: parseFloat(process.env.FPS_CONTROL_REDUCTION_FACTOR || '0.5'),
      loadThresholdCPU: parseFloat(process.env.FPS_CONTROL_CPU_THRESHOLD || '0.8'),
      loadThresholdMemory: parseFloat(process.env.FPS_CONTROL_MEMORY_THRESHOLD || '0.8'),
      loadThresholdBacklog: parseInt(process.env.FPS_CONTROL_BACKLOG_THRESHOLD || '15', 10),
      ...config,
    };
    this.currentFPS = this.config.maxFPS;
  }

  /**
   * Get current FPS based on system load
   */
  getCurrentFPS(frameBacklog?: number): number {
    const cpuLoad = this.getCPULoad();
    const memoryLoad = this.getMemoryLoad();
    const backlogLoad = frameBacklog !== undefined && frameBacklog > this.config.loadThresholdBacklog;

    // Check if any load threshold is exceeded
    const isUnderLoad = 
      cpuLoad > this.config.loadThresholdCPU ||
      memoryLoad > this.config.loadThresholdMemory ||
      backlogLoad;

    if (isUnderLoad) {
      // Reduce FPS
      const newFPS = Math.max(
        this.config.minFPS,
        this.currentFPS * this.config.reductionFactor
      );
      
      if (newFPS !== this.currentFPS) {
        logger.warn('FPS reduced due to system load', {
          oldFPS: this.currentFPS,
          newFPS,
          cpuLoad,
          memoryLoad,
          frameBacklog,
        });
        this.currentFPS = newFPS;
      }
    } else {
      // Gradually increase FPS (recovery)
      const newFPS = Math.min(
        this.config.maxFPS,
        this.currentFPS * (1 / this.config.reductionFactor)
      );
      
      if (newFPS !== this.currentFPS && newFPS < this.config.maxFPS) {
        logger.info('FPS increased due to reduced load', {
          oldFPS: this.currentFPS,
          newFPS,
          cpuLoad,
          memoryLoad,
        });
        this.currentFPS = newFPS;
      } else if (this.currentFPS < this.config.maxFPS) {
        // Fully recovered
        this.currentFPS = this.config.maxFPS;
        logger.info('FPS fully recovered to maximum', { fps: this.currentFPS });
      }
    }

    return this.currentFPS;
  }

  /**
   * Get CPU load (0-1)
   */
  private getCPULoad(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }

    // Simple load average (not perfect but good enough)
    const load = os.loadavg()[0] / cpus.length;
    return Math.min(1, load);
  }

  /**
   * Get memory load (0-1)
   */
  private getMemoryLoad(): number {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return 1 - (freeMem / totalMem);
  }

  /**
   * Reset FPS to maximum (for testing/recovery)
   */
  reset(): void {
    this.currentFPS = this.config.maxFPS;
    logger.info('FPS controller reset to maximum', { fps: this.currentFPS });
  }
}

