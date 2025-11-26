import { z } from 'zod';

/**
 * Validation schemas for detection-related API endpoints
 */

export const detectionFeedbackSchema = z.object({
  detectionId: z.string().min(1, 'Detection ID is required'),
  feedback: z.enum(['true_positive', 'false_positive', 'needs_review'], {
    errorMap: () => ({ message: 'Feedback must be true_positive, false_positive, or needs_review' }),
  }),
  note: z.string().max(1000, 'Note must be less than 1000 characters').optional(),
});

export const detectionQuerySchema = z.object({
  cameraId: z.string().optional(),
  worksiteId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  feedback: z.enum(['true_positive', 'false_positive', 'needs_review', 'none']).optional(),
});

export type DetectionFeedbackInput = z.infer<typeof detectionFeedbackSchema>;
export type DetectionQueryInput = z.infer<typeof detectionQuerySchema>;

