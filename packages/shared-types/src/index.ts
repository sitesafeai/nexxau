/**
 * Shared types for Nexxau microservices
 * 
 * These types are used across all services to ensure type safety
 * in inter-service communication.
 */

/**
 * Tenant/Customer identification
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User identification
 */
export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  SITE_MANAGER = 'SITE_MANAGER',
  VIEWER = 'VIEWER',
}

/**
 * Camera/Site identification
 */
export interface Camera {
  id: string;
  tenantId: string;
  siteId?: string;
  name: string;
  streamUrl: string;
  location?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Site {
  id: string;
  tenantId: string;
  name: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Detection result from ML service
 */
export interface DetectionResult {
  id: string;
  cameraId: string;
  tenantId: string;
  timestamp: Date;
  detections: Detection[];
  frameUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface Detection {
  id: string;
  type: DetectionType;
  confidence: number;
  bbox: BoundingBox;
  metadata?: Record<string, unknown>;
}

export enum DetectionType {
  PERSON = 'PERSON',
  PERSON_WITH_HARDHAT = 'PERSON_WITH_HARDHAT',
  PERSON_WITHOUT_HARDHAT = 'PERSON_WITHOUT_HARDHAT',
  PERSON_WITH_SAFETY_VEST = 'PERSON_WITH_SAFETY_VEST',
  PERSON_WITHOUT_SAFETY_VEST = 'PERSON_WITHOUT_SAFETY_VEST',
  SAFETY_VIOLATION = 'SAFETY_VIOLATION',
  EQUIPMENT = 'EQUIPMENT',
  VEHICLE = 'VEHICLE',
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Alert/Notification
 */
export interface Alert {
  id: string;
  tenantId: string;
  cameraId: string;
  detectionId: string;
  severity: AlertSeverity;
  type: string;
  message: string;
  isAcknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  createdAt: Date;
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * API Request/Response types
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    requestId?: string;
    timestamp: string;
    version?: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * Request context (passed between services)
 */
export interface RequestContext {
  requestId: string;
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  userRole?: UserRole;
  timestamp: Date;
}

/**
 * Health check response
 */
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  timestamp: Date;
  checks?: {
    [key: string]: {
      status: 'healthy' | 'unhealthy';
      message?: string;
      latency?: number;
    };
  };
}
