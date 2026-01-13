// Test script for YOLO overlay - paste this in browser console
// Tests the overlay drawing without needing actual YOLO detections

(function() {
    'use strict';
    
    const log = (msg, type = 'info') => {
        const prefix = '[TEST OVERLAY]';
        if (type === 'error') console.error(prefix, msg);
        else if (type === 'success') console.log(prefix, msg);
        else console.info(prefix, msg);
    };
    
    log('Starting overlay test...', 'info');
    
    // Find active feed
    const feedId = Array.from(window.subscriberHandlesByFeed?.keys() || [])[0];
    if (!feedId) {
        log('No active feed found. Make sure video is playing.', 'error');
        return;
    }
    
    log(`Found active feed: ${feedId}`, 'success');
    
    // Test detection object
    const testDetection = {
        feedId: feedId,
        timestamp: Date.now(),
        detections: [
            {
                label: 'person',
                confidence: 0.95,
                bbox: [0.2, 0.2, 0.3, 0.4] // x, y, width, height (normalized)
            },
            {
                label: 'car',
                confidence: 0.87,
                bbox: [0.6, 0.5, 0.25, 0.3]
            },
            {
                label: 'bottle',
                confidence: 0.72,
                bbox: [0.1, 0.7, 0.15, 0.2]
            }
        ]
    };
    
    // Call the handleYoloDetection function
    if (typeof window.handleYoloDetection === 'function') {
        log('Calling handleYoloDetection...', 'info');
        window.handleYoloDetection(testDetection);
        log('✅ Overlay test complete! You should see 3 bounding boxes:', 'success');
        log('  - Green box: person (95% confidence)', 'info');
        log('  - Yellow box: car (87% confidence)', 'info');
        log('  - Red box: bottle (72% confidence)', 'info');
    } else {
        log('handleYoloDetection function not found. Make sure videoroom-test.js is loaded.', 'error');
        
        // Try alternative: call drawDetections directly if available
        if (typeof window.drawDetections === 'function') {
            log('Trying drawDetections directly...', 'info');
            window.drawDetections(feedId, testDetection.detections);
            log('✅ Direct drawDetections called', 'success');
        } else {
            log('drawDetections function also not found.', 'error');
        }
    }
})();

