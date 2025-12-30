// AI Detection Integration Service
import { customRuleEngine } from './custom-rule-engine';
import { logger } from './logger';

interface AIDetectionData {
  cameraId: string;
  timestamp: Date;
  objects: Array<{
    class: string;
    confidence: number;
    bbox: [number, number, number, number]; // [x, y, width, height]
    id?: string;
  }>;
  frameData?: string;
  metadata?: {
    location?: string;
    worksiteId?: string;
    cameraName?: string;
    streamQuality?: number;
    frameRate?: number;
    [key: string]: any;
  };
}

export class AIDetectionIntegration {
  private static instance: AIDetectionIntegration;
  private isProcessing = false;
  private processingQueue: AIDetectionData[] = [];
  private lastProcessedTimestamp: Date = new Date();

  private constructor() {
    this.startProcessingLoop();
  }

  public static getInstance(): AIDetectionIntegration {
    if (!AIDetectionIntegration.instance) {
      AIDetectionIntegration.instance = new AIDetectionIntegration();
    }
    return AIDetectionIntegration.instance;
  }

  /**
   * Process detection data from AI service
   */
  public async processDetection(detectionData: AIDetectionData): Promise<void> {
    try {
      // Add to processing queue
      this.processingQueue.push(detectionData);

      // If not currently processing, start processing
      if (!this.isProcessing) {
        this.processQueue();
      }

      logger.info(`Detection data queued for processing: ${detectionData.objects.length} objects detected`);
    } catch (error) {
      logger.error('Error processing detection data:', error as any);
    }
  }

  /**
   * Process detection data from AI service (direct method)
   */
  public async processDetectionDirect(detectionData: AIDetectionData): Promise<void> {
    try {
      // Validate detection data
      if (!detectionData.cameraId || !detectionData.timestamp || !detectionData.objects) {
        logger.warn('Invalid detection data received:', detectionData);
        return;
      }

      // Check if we have any objects to process
      if (detectionData.objects.length === 0) {
        logger.info(`No objects detected in camera ${detectionData.cameraId}`);
        return;
      }

      // Process through custom rule engine
      await customRuleEngine.processDetection(detectionData);

      this.lastProcessedTimestamp = new Date();
      logger.info(`Detection processed successfully: ${detectionData.objects.length} objects, camera ${detectionData.cameraId}`);
    } catch (error) {
      logger.error('Error processing detection data directly:', error as any);
    }
  }

  /**
   * Process detection data from AI service (HTTP endpoint)
   */
  public async processDetectionFromAI(detectionData: any): Promise<void> {
    try {
      // Transform AI service data to our format
      const transformedData: AIDetectionData = {
        cameraId: detectionData.camera_id || detectionData.cameraId,
        timestamp: new Date(detectionData.timestamp || Date.now()),
        objects: (detectionData.detections || detectionData.objects || []).map((obj: any) => ({
          class: obj.class || obj.class_name || obj.label,
          confidence: obj.confidence || obj.score || 0,
          bbox: obj.bbox || [obj.x, obj.y, obj.width, obj.height],
          id: obj.id || obj.tracking_id
        })),
        frameData: detectionData.frame_data || detectionData.frameData,
        metadata: {
          location: detectionData.location,
          worksiteId: detectionData.worksite_id || detectionData.worksiteId,
          cameraName: detectionData.camera_name || detectionData.cameraName,
          streamQuality: detectionData.stream_quality || detectionData.streamQuality,
          frameRate: detectionData.frame_rate || detectionData.frameRate,
          ...detectionData.metadata
        }
      };

      await this.processDetectionDirect(transformedData);
    } catch (error) {
      logger.error('Error processing detection from AI service:', error as any);
    }
  }

  /**
   * Process detection data from AI service (WebSocket)
   */
  public async processDetectionFromWebSocket(detectionData: any): Promise<void> {
    try {
      // Handle WebSocket detection data
      const transformedData: AIDetectionData = {
        cameraId: detectionData.camera_id,
        timestamp: new Date(detectionData.timestamp),
        objects: detectionData.detections.map((detection: any) => ({
          class: detection.class,
          confidence: detection.confidence,
          bbox: detection.bbox,
          id: detection.id
        })),
        frameData: detectionData.frame_data,
        metadata: {
          location: detectionData.location,
          worksiteId: detectionData.worksite_id,
          cameraName: detectionData.camera_name,
          ...detectionData.metadata
        }
      };

      await this.processDetectionDirect(transformedData);
    } catch (error) {
      logger.error('Error processing detection from WebSocket:', error as any);
    }
  }

  /**
   * Process detection data from AI service (File upload)
   */
  public async processDetectionFromFile(fileData: any): Promise<void> {
    try {
      // Handle file-based detection data
      const transformedData: AIDetectionData = {
        cameraId: fileData.camera_id,
        timestamp: new Date(fileData.timestamp),
        objects: fileData.detections.map((detection: any) => ({
          class: detection.class,
          confidence: detection.confidence,
          bbox: detection.bbox,
          id: detection.id
        })),
        frameData: fileData.frame_data,
        metadata: {
          location: fileData.location,
          worksiteId: fileData.worksite_id,
          cameraName: fileData.camera_name,
          ...fileData.metadata
        }
      };

      await this.processDetectionDirect(transformedData);
    } catch (error) {
      logger.error('Error processing detection from file:', error as any);
    }
  }

  /**
   * Start processing queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const detectionData = this.processingQueue.shift();
      if (detectionData) {
        try {
          await this.processDetectionDirect(detectionData);
        } catch (error) {
          logger.error('Error processing queued detection:', error as any);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Start processing loop
   */
  private startProcessingLoop(): void {
    // Process queue every 100ms
    setInterval(() => {
      if (this.processingQueue.length > 0 && !this.isProcessing) {
        this.processQueue();
      }
    }, 100);

    // Log processing stats every 5 minutes
    setInterval(() => {
      if (this.processingQueue.length > 0) {
        logger.info(`Processing queue status: ${this.processingQueue.length} items queued`);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Get processing statistics
   */
  public getProcessingStats(): any {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.processingQueue.length,
      lastProcessedTimestamp: this.lastProcessedTimestamp,
      activeRules: customRuleEngine.getActiveRules().length
    };
  }

  /**
   * Clear processing queue
   */
  public clearQueue(): void {
    this.processingQueue = [];
    logger.info('Processing queue cleared');
  }

  /**
   * Test detection processing
   */
  public async testDetectionProcessing(cameraId: string): Promise<void> {
    const testData: AIDetectionData = {
      cameraId,
      timestamp: new Date(),
      objects: [
        {
          class: 'person',
          confidence: 0.9,
          bbox: [100, 100, 200, 300],
          id: 'test-1'
        },
        {
          class: 'hardhat',
          confidence: 0.8,
          bbox: [120, 80, 50, 50],
          id: 'test-2'
        }
      ],
      metadata: {
        location: 'Test Location',
        cameraName: 'Test Camera',
        streamQuality: 95,
        frameRate: 30
      }
    };

    await this.processDetectionDirect(testData);
    logger.info('Test detection processing completed');
  }
}

// Export singleton instance
export const aiDetectionIntegration = AIDetectionIntegration.getInstance();
