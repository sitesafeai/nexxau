import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should handle multiple concurrent users', async ({ browser }) => {
    const context = await browser.newContext();
    const pages = [];
    
    // Create multiple browser contexts to simulate concurrent users
    for (let i = 0; i < 10; i++) {
      const page = await context.newPage();
      pages.push(page);
    }

    // Navigate all pages to dashboard simultaneously
    const navigationPromises = pages.map(page => page.goto('/dashboard'));
    await Promise.all(navigationPromises);

    // Check that all pages loaded successfully
    for (const page of pages) {
      await expect(page.getByText(/dashboard/i)).toBeVisible();
    }

    await context.close();
  });

  test('should handle high-frequency API requests', async ({ page }) => {
    const startTime = Date.now();
    const requests = [];
    
    // Make 100 concurrent API requests
    for (let i = 0; i < 100; i++) {
      const request = page.request.get('/api/health');
      requests.push(request);
    }

    const responses = await Promise.all(requests);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // All requests should succeed
    for (const response of responses) {
      expect(response.status()).toBe(200);
    }

    // Should complete within reasonable time (5 seconds)
    expect(duration).toBeLessThan(5000);
  });

  test('should handle large detection data', async ({ page }) => {
    // Mock large detection dataset
    const largeDetectionData = {
      detections: Array.from({ length: 1000 }, (_, i) => ({
        id: `detection-${i}`,
        class: 'person',
        confidence: Math.random(),
        bbox: [Math.random() * 1000, Math.random() * 1000, Math.random() * 1000, Math.random() * 1000],
        timestamp: new Date().toISOString(),
      })),
    };

    await page.route('**/api/analytics/detections', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeDetectionData),
      });
    });

    const startTime = Date.now();
    await page.goto('/dashboard/analytics');
    const endTime = Date.now();
    const loadTime = endTime - startTime;

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Should display detection data
    await expect(page.getByText(/detections/i)).toBeVisible();
  });

  test('should handle real-time detection stream', async ({ page }) => {
    let detectionCount = 0;
    const maxDetections = 100;

    // Mock real-time detection stream
    await page.route('**/api/yolo/detections/stream*', async (route) => {
      const stream = new ReadableStream({
        start(controller) {
          const interval = setInterval(() => {
            if (detectionCount >= maxDetections) {
              clearInterval(interval);
              controller.close();
              return;
            }

            const data = `data: ${JSON.stringify({
              cameraId: 'camera-1',
              detections: [
                {
                  class: 'person',
                  confidence: Math.random(),
                  bbox: [Math.random() * 1000, Math.random() * 1000, Math.random() * 1000, Math.random() * 1000],
                },
              ],
            })}\n\n`;
            
            controller.enqueue(new TextEncoder().encode(data));
            detectionCount++;
          }, 100); // Send detection every 100ms
        },
      });
      
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: stream,
      });
    });

    const startTime = Date.now();
    await page.goto('/dashboard/cameras');
    
    // Enable AI detection
    await page.getByRole('button', { name: /ai on/i }).click();
    
    // Wait for detections to be processed
    await page.waitForTimeout(5000);
    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // Should process detections efficiently
    expect(processingTime).toBeLessThan(10000);
    expect(detectionCount).toBeGreaterThan(0);
  });

  test('should handle database connection pooling', async ({ page }) => {
    const startTime = Date.now();
    const requests = [];
    
    // Make 50 concurrent database requests
    for (let i = 0; i < 50; i++) {
      const request = page.request.get('/api/cameras');
      requests.push(request);
    }

    const responses = await Promise.all(requests);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // All requests should succeed
    for (const response of responses) {
      expect(response.status()).toBe(200);
    }

    // Should complete within reasonable time (3 seconds)
    expect(duration).toBeLessThan(3000);
  });

  test('should handle memory usage efficiently', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Perform memory-intensive operations
    for (let i = 0; i < 100; i++) {
      await page.goto('/dashboard/cameras');
      await page.goto('/dashboard/analytics');
      await page.goto('/dashboard/alerts');
    }

    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Memory usage should not increase significantly
    const memoryIncrease = finalMemory - initialMemory;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
  });

  test('should handle network latency gracefully', async ({ page }) => {
    // Simulate network latency
    await page.route('**/api/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      await route.continue();
    });

    const startTime = Date.now();
    await page.goto('/dashboard');
    const endTime = Date.now();
    const loadTime = endTime - startTime;

    // Should load within 5 seconds despite network latency
    expect(loadTime).toBeLessThan(5000);
    
    // Should show loading states
    await expect(page.getByText(/loading/i)).toBeVisible();
  });

  test('should handle error recovery', async ({ page }) => {
    let requestCount = 0;
    
    // Mock intermittent API failures
    await page.route('**/api/**', async (route) => {
      requestCount++;
      if (requestCount % 3 === 0) {
        // Fail every 3rd request
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard');
    
    // Should handle errors gracefully
    await expect(page.getByText(/error occurred/i)).toBeVisible();
    
    // Should show retry option
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
  });

  test('should handle concurrent user sessions', async ({ browser }) => {
    const contexts = [];
    const pages = [];
    
    // Create multiple browser contexts for different users
    for (let i = 0; i < 5; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // Mock different user sessions
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: `user-${i}`,
              email: `user${i}@example.com`,
              name: `User ${i}`,
              role: 'admin',
            },
          }),
        });
      });
      
      contexts.push(context);
      pages.push(page);
    }

    // Navigate all pages simultaneously
    const navigationPromises = pages.map(page => page.goto('/dashboard'));
    await Promise.all(navigationPromises);

    // All pages should load successfully
    for (const page of pages) {
      await expect(page.getByText(/dashboard/i)).toBeVisible();
    }

    // Clean up
    for (const context of contexts) {
      await context.close();
    }
  });
});
