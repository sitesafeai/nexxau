import { z } from 'zod';
import { emailSchema, phoneSchema, paginationSchema, dateRangeSchema } from './common';

/**
 * Validation schemas for company-related API endpoints
 */

export const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200),
  companyUsername: z.string().min(1, 'Company username is required').max(100).regex(/^[a-z0-9-]+$/, 'Username must be lowercase alphanumeric with hyphens'),
  email: emailSchema,
  contactEmail: emailSchema.optional(),
  phone: phoneSchema.optional(),
  address: z.string().max(500).optional(),
});

export const updateCompanySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: emailSchema.optional(),
  contactEmail: emailSchema.optional(),
  phone: phoneSchema.optional(),
  address: z.string().max(500).optional(),
});

export const companyQuerySchema = paginationSchema.merge(dateRangeSchema).extend({
  search: z.string().optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CompanyQueryInput = z.infer<typeof companyQuerySchema>;

