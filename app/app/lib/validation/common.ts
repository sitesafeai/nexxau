import { z } from 'zod';

/**
 * Common validation schemas used across multiple API routes
 */

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  page: z.coerce.number().int().min(1).optional(),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export const emailSchema = z.string().email('Invalid email address');

export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number');

export const urlSchema = z.string().url('Invalid URL');

export const roleSchema = z.enum([
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'SITE_ADMIN',
  'SUPERVISOR',
  'WORKER',
  'VIEWER',
]);

export const severitySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const alertStatusSchema = z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'ESCALATED']);

export const cameraStatusSchema = z.enum(['ONLINE', 'OFFLINE', 'DEGRADED', 'ERROR', 'MAINTENANCE']);

export const timeRangeSchema = z.enum(['30d', '90d', 'year', '7d', '24h']);

/**
 * Helper function to validate request body
 */
export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Helper function to validate query parameters
 */
export function validateQuery<T>(schema: z.ZodSchema<T>, searchParams: URLSearchParams): { success: true; data: T } | { success: false; error: z.ZodError } {
  const params = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(params);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

