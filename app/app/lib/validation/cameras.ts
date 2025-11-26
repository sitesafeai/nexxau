import { z } from 'zod';
import { cameraStatusSchema, paginationSchema, dateRangeSchema } from './common';

/**
 * Validation schemas for camera-related API endpoints
 */

export const createCameraSchema = z.object({
  name: z.string().min(1, 'Camera name is required').max(200),
  type: z.string().max(100).optional(),
  streamUrl: z.string().url('Invalid stream URL').optional(),
  hlsUrl: z.string().url('Invalid HLS URL').optional(),
  location: z.string().max(200).optional(),
  ipAddress: z.string().ip('Invalid IP address').optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  username: z.string().max(100).optional(),
  password: z.string().max(200).optional(),
  rtspPath: z.string().max(200).optional(),
  mediamtxPath: z.string().max(200).optional(),
  worksiteId: z.string().min(1, 'Worksite ID is required'),
  metadata: z.record(z.any()).optional(),
});

export const updateCameraSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.string().max(100).optional(),
  streamUrl: z.string().url().optional(),
  hlsUrl: z.string().url().optional(),
  location: z.string().max(200).optional(),
  ipAddress: z.string().ip().optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  username: z.string().max(100).optional(),
  password: z.string().max(200).optional(),
  rtspPath: z.string().max(200).optional(),
  mediamtxPath: z.string().max(200).optional(),
  status: cameraStatusSchema.optional(),
  metadata: z.record(z.any()).optional(),
});

export const cameraHealthSchema = z.object({
  status: cameraStatusSchema,
  streamQuality: z.coerce.number().int().min(0).max(100).optional(),
  frameRate: z.coerce.number().int().min(0).max(120).optional(),
  resolution: z.string().max(50).optional(),
  bitrate: z.coerce.number().int().min(0).optional(),
  latency: z.coerce.number().int().min(0).optional(),
  errors: z.array(z.any()).optional(),
});

export const cameraQuerySchema = paginationSchema.merge(dateRangeSchema).extend({
  worksiteId: z.string().optional(),
  companyId: z.string().optional(),
  status: cameraStatusSchema.optional(),
  type: z.string().optional(),
});

export type CreateCameraInput = z.infer<typeof createCameraSchema>;
export type UpdateCameraInput = z.infer<typeof updateCameraSchema>;
export type CameraHealthInput = z.infer<typeof cameraHealthSchema>;
export type CameraQueryInput = z.infer<typeof cameraQuerySchema>;

