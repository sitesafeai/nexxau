import { test, expect } from '@playwright/test';

test.describe('Camera and Detection System', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated state
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
            role: 'admin',
          },
        }),
      });
    });

    await page.goto('/dashboard');
  });

  test('should display camera feed', async ({ page }) => {
    // Mock camera data
    await page.route('**/api/cameras', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'camera-1',
            name: 'Test Camera',
            status: 'active',
            streamUrl: 'http://localhost:8888/test-camera/index.m3u8',
            location: 'Test Location',
          },
        ]),
      });
    });

    await page.goto('/dashboard/cameras');
    
    // Should show camera feed
    await expect(page.getByText(/test camera/i)).toBeVisible();
    await expect(page.getByText(/test location/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /ai on/i })).toBeVisible();
  });

  test('should toggle AI detection on/off', async ({ page }) => {
    // Mock camera data
    await page.route('**/api/cameras', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'camera-1',
            name: 'Test Camera',
            status: 'active',
            streamUrl: 'http://localhost:8888/test-camera/index.m3u8',
            location: 'Test Location',
          },
        ]),
      });
    });

    await page.goto('/dashboard/cameras');
    
    // Toggle AI detection on
    await page.getByRole('button', { name: /ai on/i }).click();
    await expect(page.getByRole('button', { name: /ai off/i })).toBeVisible();
    
    // Toggle AI detection off
    await page.getByRole('button', { name: /ai off/i }).click();
    await expect(page.getByRole('button', { name: /ai on/i })).toBeVisible();
  });

  test('should display detection overlay when AI is enabled', async ({ page }) => {
    // Mock camera data
    await page.route('**/api/cameras', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'camera-1',
            name: 'Test Camera',
            status: 'active',
            streamUrl: 'http://localhost:8888/test-camera/index.m3u8',
            location: 'Test Location',
          },
        ]),
      });
    });

    // Mock detection stream
    await page.route('**/api/yolo/detections/stream*', async (route) => {
      const stream = new ReadableStream({
        start(controller) {
          const data = `data: ${JSON.stringify({
            cameraId: 'camera-1',
            detections: [
              {
                class: 'person',
                confidence: 0.95,
                bbox: [100, 100, 200, 200],
              },
            ],
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
        },
      });
      
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: stream,
      });
    });

    await page.goto('/dashboard/cameras');
    
    // Enable AI detection
    await page.getByRole('button', { name: /ai on/i }).click();
    
    // Wait for detection overlay to appear
    await expect(page.locator('[data-testid="detection-overlay"]')).toBeVisible();
    
    // Should show detection bounding box
    await expect(page.locator('[data-testid="detection-box"]')).toBeVisible();
  });

  test('should show detection statistics', async ({ page }) => {
    // Mock detection data
    await page.route('**/api/analytics/detections', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalDetections: 150,
          detectionsByClass: {
            person: 100,
            vehicle: 30,
            equipment: 20,
          },
          detectionsByHour: [
            { hour: 0, count: 5 },
            { hour: 1, count: 3 },
            { hour: 2, count: 2 },
          ],
        }),
      });
    });

    await page.goto('/dashboard/analytics');
    
    // Should show detection statistics
    await expect(page.getByText(/total detections/i)).toBeVisible();
    await expect(page.getByText(/150/i)).toBeVisible();
    await expect(page.getByText(/person/i)).toBeVisible();
    await expect(page.getByText(/100/i)).toBeVisible();
  });

  test('should generate alert for safety violation', async ({ page }) => {
    // Mock detection with safety violation
    await page.route('**/api/yolo/detections/stream*', async (route) => {
      const stream = new ReadableStream({
        start(controller) {
          const data = `data: ${JSON.stringify({
            cameraId: 'camera-1',
            detections: [
              {
                class: 'person',
                confidence: 0.95,
                bbox: [100, 100, 200, 200],
                safetyViolation: true,
                violationType: 'no_helmet',
              },
            ],
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
        },
      });
      
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: stream,
      });
    });

    // Mock alert creation
    await page.route('**/api/alerts', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'alert-1',
          title: 'Safety Violation Detected',
          description: 'No helmet detected',
          severity: 'HIGH',
          status: 'ACTIVE',
        }),
      });
    });

    await page.goto('/dashboard/cameras');
    
    // Enable AI detection
    await page.getByRole('button', { name: /ai on/i }).click();
    
    // Wait for alert to appear
    await expect(page.getByText(/safety violation detected/i)).toBeVisible();
    await expect(page.getByText(/no helmet detected/i)).toBeVisible();
  });

  test('should display camera health status', async ({ page }) => {
    // Mock camera health data
    await page.route('**/api/cameras', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'camera-1',
            name: 'Test Camera',
            status: 'active',
            streamUrl: 'http://localhost:8888/test-camera/index.m3u8',
            location: 'Test Location',
            health: {
              status: 'healthy',
              lastDetection: new Date().toISOString(),
              uptime: '99.9%',
            },
          },
        ]),
      });
    });

    await page.goto('/dashboard/cameras');
    
    // Should show camera health status
    await expect(page.getByText(/healthy/i)).toBeVisible();
    await expect(page.getByText(/99.9%/i)).toBeVisible();
  });

  test('should handle camera connection errors', async ({ page }) => {
    // Mock camera with connection error
    await page.route('**/api/cameras', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'camera-1',
            name: 'Test Camera',
            status: 'error',
            streamUrl: 'http://localhost:8888/test-camera/index.m3u8',
            location: 'Test Location',
            error: 'Connection failed',
          },
        ]),
      });
    });

    await page.goto('/dashboard/cameras');
    
    // Should show error status
    await expect(page.getByText(/connection failed/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
  });

  test('should allow camera configuration', async ({ page }) => {
    // Mock camera data
    await page.route('**/api/cameras', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'camera-1',
            name: 'Test Camera',
            status: 'active',
            streamUrl: 'http://localhost:8888/test-camera/index.m3u8',
            location: 'Test Location',
          },
        ]),
      });
    });

    await page.goto('/dashboard/cameras');
    
    // Click on camera settings
    await page.getByRole('button', { name: /settings/i }).click();
    
    // Should show camera configuration modal
    await expect(page.getByText(/camera settings/i)).toBeVisible();
    await expect(page.getByLabel(/camera name/i)).toBeVisible();
    await expect(page.getByLabel(/stream url/i)).toBeVisible();
    await expect(page.getByLabel(/location/i)).toBeVisible();
  });

  test('should save camera configuration', async ({ page }) => {
    // Mock camera update
    await page.route('**/api/cameras/camera-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'camera-1',
          name: 'Updated Camera',
          status: 'active',
          streamUrl: 'http://localhost:8888/updated-camera/index.m3u8',
          location: 'Updated Location',
        }),
      });
    });

    await page.goto('/dashboard/cameras');
    
    // Open camera settings
    await page.getByRole('button', { name: /settings/i }).click();
    
    // Update camera configuration
    await page.getByLabel(/camera name/i).fill('Updated Camera');
    await page.getByLabel(/location/i).fill('Updated Location');
    
    // Save configuration
    await page.getByRole('button', { name: /save/i }).click();
    
    // Should show success message
    await expect(page.getByText(/camera updated successfully/i)).toBeVisible();
  });
});
