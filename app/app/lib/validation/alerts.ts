import { z } from 'zod';
import { severitySchema, alertStatusSchema, paginationSchema, dateRangeSchema } from './common';

/**
 * Validation schemas for alert-related API endpoints
 */

export const createAlertSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  severity: severitySchema,
  source: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  worksiteId: z.string().min(1).optional(),
  cameraId: z.string().min(1).optional(),
  ruleId: z.string().min(1).optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateAlertSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  severity: severitySchema.optional(),
  status: alertStatusSchema.optional(),
  location: z.string().max(200).optional(),
  metadata: z.record(z.any()).optional(),
});

export const acknowledgeAlertSchema = z.object({
  note: z.string().max(1000, 'Note must be less than 1000 characters').optional(),
});

export const alertQuerySchema = paginationSchema.merge(dateRangeSchema).extend({
  worksiteId: z.string().optional(),
  severity: severitySchema.optional(),
  status: z.string().optional(), // Allow any string, we'll handle parsing in the route
  source: z.string().optional(),
});

export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type UpdateAlertInput = z.infer<typeof updateAlertSchema>;
export type AcknowledgeAlertInput = z.infer<typeof acknowledgeAlertSchema>;
export type AlertQueryInput = z.infer<typeof alertQuerySchema>;

