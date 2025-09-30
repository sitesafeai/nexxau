-- CreateTable
CREATE TABLE "Detection" (
    "id" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "detections" JSONB NOT NULL,
    "frameData" TEXT,
    "frameWidth" INTEGER,
    "frameHeight" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Detection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Detection" ADD CONSTRAINT "Detection_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
