/**
 * Predefined camera rules — seeded per camera on creation.
 * These cannot be deleted, only disabled with a required reason.
 */

import type { PrismaClient } from '@prisma/client';

export const PREDEFINED_RULES = [
  {
    name: 'No Helmet Violation',
    ifCondition: 'person_detected',
    andCondition: 'no_helmet',
    thenAction: 'both',
    isPredefined: true,
    enabled: true,
  },
  {
    name: 'No Vest Violation',
    ifCondition: 'person_detected',
    andCondition: 'no_vest',
    thenAction: 'both',
    isPredefined: true,
    enabled: true,
  },
];

export async function seedDefaultRules(cameraId: string, prisma: PrismaClient) {
  await prisma.cameraRule.createMany({
    data: PREDEFINED_RULES.map((r) => ({
      ...r,
      cameraId,
    })),
  });
}
