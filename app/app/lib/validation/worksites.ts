import { z } from 'zod';
import { paginationSchema, dateRangeSchema } from './common';

/**
 * Validation schemas for worksite-related API endpoints
 */

export const createWorksiteSchema = z.object({
  name: z.string().min(1, 'Worksite name is required').max(200),
  worksiteName: z.string().max(200).optional(), // Slug/handle
  location: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  companyId: z.string().min(1, 'Company ID is required'),
  cameraSystemType: z.string().max(50).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
});

export const updateWorksiteSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  location: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
  cameraSystemType: z.string().max(50).optional(),
});

export const worksiteQuerySchema = paginationSchema.merge(dateRangeSchema).extend({
  companyId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
});

export type CreateWorksiteInput = z.infer<typeof createWorksiteSchema>;
export type UpdateWorksiteInput = z.infer<typeof updateWorksiteSchema>;
export type WorksiteQueryInput = z.infer<typeof worksiteQuerySchema>;

