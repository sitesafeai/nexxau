-- Create 5 test alerts for Highway Bridge Project
-- Run this SQL script directly in your database

-- First, get the camera ID (or use a placeholder)
-- Replace 'YOUR_CAMERA_ID' with an actual camera ID from the worksite if needed

INSERT INTO "Alert" (
  id,
  title,
  description,
  severity,
  status,
  source,
  location,
  "violationType",
  "detectionSnapshot",
  "detectionData",
  "worksiteId",
  "cameraId",
  "createdAt",
  "updatedAt"
) VALUES
(
  gen_random_uuid()::text,
  'Missing Hard Hat Detected',
  'Worker detected without hard hat in Zone A - North Tower',
  'WARNING',
  'ACTIVE',
  'camera',
  'Zone A - North Tower',
  'missing_helmet',
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
  '{"confidence": 0.87, "objects": [{"class": "person", "confidence": 0.92, "bbox": [120, 80, 200, 350]}, {"class": "no_helmet", "confidence": 0.87, "bbox": [140, 85, 180, 120]}], "modelVersion": "yolo-v8-ppe-1.2.3"}'::jsonb,
  'cmha01l5h0005p98vyrfe3r0c',
  (SELECT id FROM "Camera" WHERE "worksiteId" = 'cmha01l5h0005p98vyrfe3r0c' LIMIT 1),
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '30 minutes'
),
(
  gen_random_uuid()::text,
  'Missing Safety Vest Detected',
  'Worker in Zone B - Bridge Deck without high-visibility vest',
  'WARNING',
  'ACTIVE',
  'camera',
  'Zone B - Bridge Deck',
  'missing_vest',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop',
  '{"confidence": 0.65, "objects": [{"class": "person", "confidence": 0.78, "bbox": [300, 150, 450, 500]}, {"class": "no_vest", "confidence": 0.65, "bbox": [320, 160, 430, 280]}], "modelVersion": "yolo-v8-ppe-1.2.3"}'::jsonb,
  'cmha01l5h0005p98vyrfe3r0c',
  (SELECT id FROM "Camera" WHERE "worksiteId" = 'cmha01l5h0005p98vyrfe3r0c' LIMIT 1),
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours'
),
(
  gen_random_uuid()::text,
  'Restricted Zone Entry',
  'Person detected entering restricted construction zone without authorization',
  'CRITICAL',
  'ACTIVE',
  'camera',
  'Zone C - Restricted Area',
  'restricted_zone',
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop',
  '{"confidence": 0.92, "objects": [{"class": "person", "confidence": 0.95, "bbox": [500, 200, 650, 550]}, {"class": "restricted_zone", "confidence": 0.92, "bbox": [480, 180, 680, 600]}], "modelVersion": "yolo-v8-ppe-1.2.3"}'::jsonb,
  'cmha01l5h0005p98vyrfe3r0c',
  (SELECT id FROM "Camera" WHERE "worksiteId" = 'cmha01l5h0005p98vyrfe3r0c' LIMIT 1),
  NOW() - INTERVAL '5 hours',
  NOW() - INTERVAL '5 hours'
),
(
  gen_random_uuid()::text,
  'Missing Safety Gloves',
  'Worker handling materials without protective gloves in Zone D',
  'INFO',
  'ACTIVE',
  'camera',
  'Zone D - Material Storage',
  'missing_gloves',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop',
  '{"confidence": 0.45, "objects": [{"class": "person", "confidence": 0.68, "bbox": [200, 100, 350, 450]}, {"class": "no_gloves", "confidence": 0.45, "bbox": [220, 300, 330, 380]}], "modelVersion": "yolo-v8-ppe-1.2.3"}'::jsonb,
  'cmha01l5h0005p98vyrfe3r0c',
  (SELECT id FROM "Camera" WHERE "worksiteId" = 'cmha01l5h0005p98vyrfe3r0c' LIMIT 1),
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 hour'
),
(
  gen_random_uuid()::text,
  'Missing Safety Goggles',
  'Worker performing welding operations without eye protection',
  'CRITICAL',
  'ACTIVE',
  'camera',
  'Zone E - Welding Station',
  'missing_goggles',
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
  '{"confidence": 0.78, "objects": [{"class": "person", "confidence": 0.85, "bbox": [400, 120, 550, 480]}, {"class": "welding_equipment", "confidence": 0.82, "bbox": [420, 200, 530, 280]}, {"class": "no_goggles", "confidence": 0.78, "bbox": [430, 125, 520, 180]}], "modelVersion": "yolo-v8-ppe-1.2.3"}'::jsonb,
  'cmha01l5h0005p98vyrfe3r0c',
  (SELECT id FROM "Camera" WHERE "worksiteId" = 'cmha01l5h0005p98vyrfe3r0c' LIMIT 1),
  NOW() - INTERVAL '15 minutes',
  NOW() - INTERVAL '15 minutes'
);

-- Verify the alerts were created
SELECT 
  id,
  title,
  severity,
  status,
  "violationType",
  "detectionData"->>'confidence' as confidence,
  "createdAt"
FROM "Alert"
WHERE "worksiteId" = 'cmha01l5h0005p98vyrfe3r0c'
ORDER BY "createdAt" DESC
LIMIT 5;
