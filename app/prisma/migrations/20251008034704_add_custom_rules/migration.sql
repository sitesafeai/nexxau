-- CreateTable
CREATE TABLE "CustomRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "detectionCriteria" JSONB NOT NULL,
    "triggerConditions" JSONB NOT NULL,
    "alertSettings" JSONB NOT NULL,
    "timeConstraints" JSONB,
    "locationConstraints" JSONB,
    "aiModelType" TEXT,
    "confidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "customModelPath" TEXT,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dashboardEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsRecipients" JSONB,
    "emailRecipients" JSONB,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 15,
    "maxAlertsPerHour" INTEGER NOT NULL DEFAULT 10,
    "worksiteId" TEXT,
    "cameraId" TEXT,
    "createdBy" TEXT,
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRuleTrigger" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "detectionData" JSONB NOT NULL,
    "cameraId" TEXT,
    "worksiteId" TEXT,
    "location" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'triggered',
    "processedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "smsSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "dashboardAlert" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomRuleTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRuleViolation" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "triggerId" TEXT,
    "violationType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "detectionData" JSONB NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "cameraId" TEXT,
    "worksiteId" TEXT,
    "location" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "smsSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomRuleViolation_pkey" PRIMARY KEY ("id")
);
