/**
 * Frame Validation System
 * 
 * Validates every frame as untrusted input.
 * Per directive: Treat every frame as untrusted input.
 */

export interface FrameValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: any;
}

export interface FrameData {
  camera_id: string;
  timestamp: number | string | Date;
  detections?: any[];
  frame_data?: string; // base64 encoded
  frame_width?: number;
  frame_height?: number;
  [key: string]: any;
}

export class FrameValidator {
  private static readonly MAX_FRAME_WIDTH = 7680; // 8K
  private static readonly MAX_FRAME_HEIGHT = 4320; // 8K
  private static readonly MIN_FRAME_WIDTH = 64;
  private static readonly MIN_FRAME_HEIGHT = 64;
  private static readonly MAX_DETECTIONS = 1000; // Prevent DoS
  private static readonly MAX_TIMESTAMP_DRIFT_MS = 60000; // 1 minute
  private static readonly MAX_BASE64_SIZE = 50 * 1024 * 1024; // 50MB

  /**
   * Validate frame data with strict checks
   */
  public static validateFrame(data: any): FrameValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitized: any = {};

    // 1. Validate required fields
    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: ['Frame data must be an object'],
        warnings: [],
      };
    }

    // 2. Validate camera_id
    if (!data.camera_id || typeof data.camera_id !== 'string' || data.camera_id.trim().length === 0) {
      errors.push('camera_id is required and must be a non-empty string');
    } else {
      // Sanitize camera_id (alphanumeric, dashes, underscores only)
      const sanitizedId = data.camera_id.trim().replace(/[^a-zA-Z0-9_-]/g, '');
      if (sanitizedId !== data.camera_id) {
        warnings.push(`camera_id was sanitized: "${data.camera_id}" -> "${sanitizedId}"`);
      }
      sanitized.camera_id = sanitizedId;
    }

    // 3. Validate timestamp
    if (data.timestamp === undefined || data.timestamp === null) {
      errors.push('timestamp is required');
    } else {
      const timestamp = this.validateTimestamp(data.timestamp);
      if (!timestamp) {
        errors.push('timestamp is invalid or out of acceptable range');
      } else {
        sanitized.timestamp = timestamp;
        
        // Check timestamp drift (not too far in future/past)
        const now = Date.now();
        const drift = Math.abs(now - timestamp.getTime());
        if (drift > this.MAX_TIMESTAMP_DRIFT_MS) {
          warnings.push(`Timestamp drift is ${drift}ms (max: ${this.MAX_TIMESTAMP_DRIFT_MS}ms)`);
        }
      }
    }

    // 4. Validate detections array
    if (data.detections !== undefined) {
      if (!Array.isArray(data.detections)) {
        errors.push('detections must be an array');
      } else {
        // Check array size (DoS protection)
        if (data.detections.length > this.MAX_DETECTIONS) {
          errors.push(`Too many detections: ${data.detections.length} (max: ${this.MAX_DETECTIONS})`);
        } else {
          // Validate each detection
          const validatedDetections = [];
          for (let i = 0; i < data.detections.length; i++) {
            const detection = data.detections[i];
            const detectionResult = this.validateDetection(detection, i);
            
            if (detectionResult.isValid) {
              validatedDetections.push(detectionResult.sanitizedData);
            } else {
              warnings.push(`Detection ${i} invalid: ${detectionResult.errors.join(', ')}`);
              // Drop invalid detections rather than failing entire frame
            }
          }
          sanitized.detections = validatedDetections;
        }
      }
    }

    // 5. Validate frame dimensions
    if (data.frame_width !== undefined || data.frame_height !== undefined) {
      const width = this.validateDimension(data.frame_width, 'frame_width');
      const height = this.validateDimension(data.frame_height, 'frame_height');
      
      if (!width.valid) {
        errors.push(width.error!);
      } else {
        sanitized.frame_width = width.value;
      }
      
      if (!height.valid) {
        errors.push(height.error!);
      } else {
        sanitized.frame_height = height.value;
      }
      
      // Validate aspect ratio (prevent malformed frames)
      if (width.valid && height.valid) {
        const aspectRatio = width.value! / height.value!;
        if (aspectRatio < 0.1 || aspectRatio > 10) {
          warnings.push(`Unusual aspect ratio: ${aspectRatio.toFixed(2)}`);
        }
      }
    }

    // 6. Validate frame_data (base64 encoded image)
    if (data.frame_data !== undefined) {
      if (typeof data.frame_data !== 'string') {
        errors.push('frame_data must be a string (base64 encoded)');
      } else {
        // Check size
        const sizeBytes = (data.frame_data.length * 3) / 4; // Approximate base64 size
        if (sizeBytes > this.MAX_BASE64_SIZE) {
          errors.push(`frame_data too large: ${(sizeBytes / 1024 / 1024).toFixed(2)}MB (max: ${this.MAX_BASE64_SIZE / 1024 / 1024}MB)`);
        } else {
          // Validate base64 format
          if (!/^[A-Za-z0-9+/=]+$/.test(data.frame_data)) {
            errors.push('frame_data contains invalid base64 characters');
          } else {
            sanitized.frame_data = data.frame_data;
          }
        }
      }
    }

    // 7. Validate frame shape consistency
    if (sanitized.frame_width && sanitized.frame_height && sanitized.frame_data) {
      // Could decode and verify, but that's expensive - just log warning
      warnings.push('Frame data present with dimensions - consider verifying consistency');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: errors.length === 0 ? sanitized : undefined,
    };
  }

  /**
   * Validate timestamp
   */
  private static validateTimestamp(timestamp: number | string | Date): Date | null {
    try {
      let date: Date;
      
      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'number') {
        // Check if it's seconds or milliseconds
        if (timestamp < 10000000000) {
          // Likely seconds, convert to milliseconds
          date = new Date(timestamp * 1000);
        } else {
          date = new Date(timestamp);
        }
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else {
        return null;
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return null;
      }
      
      // Check if date is reasonable (not too far in past/future)
      const now = new Date();
      const minDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const maxDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour in future
      
      if (date < minDate || date > maxDate) {
        return null;
      }
      
      return date;
    } catch {
      return null;
    }
  }

  /**
   * Validate frame dimension
   */
  private static validateDimension(
    value: any,
    fieldName: string
  ): { valid: boolean; value?: number; error?: string } {
    if (value === undefined || value === null) {
      return { valid: false, error: `${fieldName} is required` };
    }
    
    const num = typeof value === 'string' ? parseInt(value, 10) : Number(value);
    
    if (isNaN(num) || !isFinite(num)) {
      return { valid: false, error: `${fieldName} must be a valid number` };
    }
    
    if (num < 0) {
      return { valid: false, error: `${fieldName} must be non-negative` };
    }
    
    if (fieldName === 'frame_width') {
      if (num < this.MIN_FRAME_WIDTH || num > this.MAX_FRAME_WIDTH) {
        return {
          valid: false,
          error: `${fieldName} must be between ${this.MIN_FRAME_WIDTH} and ${this.MAX_FRAME_WIDTH}`,
        };
      }
    } else if (fieldName === 'frame_height') {
      if (num < this.MIN_FRAME_HEIGHT || num > this.MAX_FRAME_HEIGHT) {
        return {
          valid: false,
          error: `${fieldName} must be between ${this.MIN_FRAME_HEIGHT} and ${this.MAX_FRAME_HEIGHT}`,
        };
      }
    }
    
    return { valid: true, value: Math.floor(num) };
  }

  /**
   * Validate a single detection object
   */
  private static validateDetection(
    detection: any,
    index: number
  ): { isValid: boolean; errors: string[]; sanitizedData?: any } {
    const errors: string[] = [];
    const sanitized: any = {};

    if (!detection || typeof detection !== 'object') {
      return { isValid: false, errors: ['Detection must be an object'] };
    }

    // Validate class/class_name
    if (detection.class !== undefined) {
      if (typeof detection.class !== 'string') {
        errors.push('class must be a string');
      } else {
        sanitized.class = detection.class.trim().substring(0, 100); // Limit length
      }
    } else if (detection.class_name !== undefined) {
      if (typeof detection.class_name !== 'string') {
        errors.push('class_name must be a string');
      } else {
        sanitized.class = detection.class_name.trim().substring(0, 100);
      }
    }

    // Validate confidence
    if (detection.confidence !== undefined) {
      const conf = Number(detection.confidence);
      if (isNaN(conf) || conf < 0 || conf > 1) {
        errors.push('confidence must be a number between 0 and 1');
      } else {
        sanitized.confidence = Math.max(0, Math.min(1, conf)); // Clamp to [0, 1]
      }
    }

    // Validate bbox (bounding box)
    if (detection.bbox !== undefined) {
      if (!Array.isArray(detection.bbox) || detection.bbox.length !== 4) {
        errors.push('bbox must be an array of 4 numbers [x1, y1, x2, y2]');
      } else {
        const bbox = detection.bbox.map((v: any) => Number(v));
        if (bbox.some(isNaN)) {
          errors.push('bbox must contain only numbers');
        } else {
          // Validate bbox values are reasonable
          const [x1, y1, x2, y2] = bbox;
          if (x1 < 0 || y1 < 0 || x2 <= x1 || y2 <= y1) {
            errors.push('bbox coordinates are invalid (x2 > x1, y2 > y1, all >= 0)');
          } else {
            sanitized.bbox = bbox;
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitized : undefined,
    };
  }

  /**
   * Compute deterministic frame hash for deduplication
   */
  public static computeFrameHash(frameData: FrameData): string {
    // Create deterministic hash from key fields
    const hashInput = [
      frameData.camera_id,
      frameData.timestamp,
      frameData.frame_width,
      frameData.frame_height,
      frameData.detections?.length || 0,
    ].join('|');
    
    // Simple hash function (for production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
}

