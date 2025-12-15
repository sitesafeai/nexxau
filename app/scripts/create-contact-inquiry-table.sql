-- Create ContactInquiry table if it doesn't exist
CREATE TABLE IF NOT EXISTS "ContactInquiry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "industry" TEXT,
    "message" TEXT NOT NULL,
    "sourcePage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNREAD',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "repliedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "ContactInquiry_status_idx" ON "ContactInquiry"("status");
CREATE INDEX IF NOT EXISTS "ContactInquiry_isRead_idx" ON "ContactInquiry"("isRead");
CREATE INDEX IF NOT EXISTS "ContactInquiry_createdAt_idx" ON "ContactInquiry"("createdAt");
