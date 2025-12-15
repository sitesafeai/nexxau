# Creating Test Alerts for False Positives Testing

## Option 1: Using SQL Script (Recommended)

1. Connect to your database (Supabase, PostgreSQL, etc.)
2. Run the SQL script:
   ```bash
   psql -d your_database -f app/scripts/create-test-alerts.sql
   ```
   Or copy/paste the SQL from `app/scripts/create-test-alerts.sql` into your database query editor.

## Option 2: Using the API (Requires Authentication)

1. Make sure your server is running: `npm run dev`
2. Log in to the application
3. Open browser console and run:
   ```javascript
   const alerts = [
     {
       title: 'Missing Hard Hat Detected',
       description: 'Worker detected without hard hat in Zone A - North Tower',
       severity: 'WARNING',
       source: 'camera',
       location: 'Zone A - North Tower',
       worksiteId: 'cmha01l5h0005p98vyrfe3r0c',
       violationType: 'missing_helmet',
       detectionSnapshot: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
       detectionData: {
         confidence: 0.87,
         objects: [
           { class: 'person', confidence: 0.92, bbox: [120, 80, 200, 350] },
           { class: 'no_helmet', confidence: 0.87, bbox: [140, 85, 180, 120] }
         ],
         modelVersion: 'yolo-v8-ppe-1.2.3',
       },
     },
     // ... (add other alerts from create-test-alerts-api.ts)
   ];
   
   for (const alert of alerts) {
     await fetch('/api/alerts', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(alert)
     });
   }
   ```

## Test Alerts Created

1. **Missing Hard Hat Detected** - WARNING, 87% confidence
2. **Missing Safety Vest Detected** - WARNING, 65% confidence  
3. **Restricted Zone Entry** - CRITICAL, 92% confidence
4. **Missing Safety Gloves** - INFO, 45% confidence
5. **Missing Safety Goggles** - CRITICAL, 78% confidence

All alerts are associated with the **Highway Bridge Project** worksite and will appear in the False Positives tab for testing.
