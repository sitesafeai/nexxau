// CURSOR PROMPT: Full Janus + YOLO + WebSocket + Browser Overlay Validation
// Validates: RTP forward, YOLO inference, WebSocket detection, canvas overlay
// WARNING: Make sure your Janus server, YOLO service, and test feeds are running
(async function() {
    'use strict';

    const log = (msg, type='info') => {
        const prefix = '[VALIDATION]';
        if (type === 'error') console.error(prefix, msg);
        else if (type === 'success') console.log(prefix, msg);
        else console.info(prefix, msg);
    };

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // Detect environment and get correct host IP
    const getHostIP = () => {
        // If running on localhost, likely connecting to VM
        // Check if Janus server URL contains a VM IP (from videoroom-test.js)
        const janusServer = 'http://192.168.64.4:8088/janus'; // Match videoroom-test.js
        const vmMatch = janusServer.match(/http:\/\/([\d.]+)/);
        const vmIP = vmMatch ? vmMatch[1] : '192.168.64.4';
        
        // Use VM IP if on localhost, otherwise use current hostname
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return vmIP;
        }
        return window.location.hostname;
    };

    const config = {
        janusRoom: 1234,
        rtpPort: 5004,
        wsUrl: `ws://${getHostIP()}:8766/ws/detections`,
        testDuration: 15000, // ms per test
    };
    
    log(`Detected host IP: ${getHostIP()}`, 'info');
    log(`Using WebSocket URL: ${config.wsUrl}`, 'info');

    log('=== VALIDATION START ===', 'success');

    // Step 1: Janus session check
    if (!window.janusTest || !window.discoveryHandle) {
        log('Janus objects not found. Ensure videoroom-test.js is loaded.', 'error');
        return;
    }
    log('Janus session & discovery handle found.', 'success');

    // Step 2: List participants
    let participants = [];
    try {
        participants = await new Promise(resolve => {
            try {
                window.discoveryHandle.send({
                    message: { request: 'listparticipants', room: config.janusRoom },
                    success: res => {
                        log('listparticipants request sent successfully.', 'success');
                        resolve(res.participants || []);
                    },
                    error: err => {
                        log('listparticipants request failed: '+err, 'error');
                        resolve([]);
                    }
                });
            } catch (e) {
                log('listparticipants request exception: ' + e, 'error');
                resolve([]);
            }
        });
        log(`Participants in room: ${participants.length}`, 'info');
        if(participants.length===0) log('No participants detected. Publish a feed.', 'error');
    } catch(e) {
        log('listparticipants exception: '+e, 'error');
    }

    // Step 3: Start RTP Forward
    const feedId = participants[0]?.id;
    if(feedId && window.startRtpForward) {
        try {
            log(`Starting RTP forward for feed ${feedId}...`, 'info');
            window.startRtpForward(feedId);
            await sleep(2000);
            log('RTP forward started (check YOLO logs)', 'success');
        } catch(e) {
            log('RTP forward start failed: ' + e, 'error');
        }
    } else {
        if (!feedId) log('No feed ID found. Skipping RTP forward test.', 'error');
        if (!window.startRtpForward) log('startRtpForward() function not found.', 'error');
    }

    // Step 4: WebSocket validation with automatic retry
    let detectionReceived = false;
    let feedDetections = {};
    let ws = null;
    let wsRetryCount = 0;
    let wsConnected = false;
    const WS_MAX_RETRIES = 10;
    
    const attemptWSConnection = () => {
        wsRetryCount++;
        const currentAttempt = wsRetryCount; // Capture for this attempt
        log(`Connecting to YOLO WebSocket... (attempt ${currentAttempt}/${WS_MAX_RETRIES})`, 'info');
        
        try {
            ws = new WebSocket(config.wsUrl);
            
            ws.onopen = () => {
                log('WebSocket connected to YOLO successfully', 'success');
                wsConnected = true;
                wsRetryCount = 0; // Reset on success
            };
            
            ws.onerror = (e) => {
                if (!wsConnected) {
                    log(`WebSocket connection error (attempt ${currentAttempt}/${WS_MAX_RETRIES})`, 'error');
                    
                    if (wsRetryCount < WS_MAX_RETRIES) {
                        const delay = Math.min(3000 * wsRetryCount, 10000); // Exponential backoff, max 10s
                        log(`Retrying in ${delay/1000}s...`, 'info');
                        setTimeout(attemptWSConnection, delay);
                    } else {
                        log(`Max retry attempts reached. WebSocket connection failed.`, 'error');
                        log('Continuing validation - YOLO service may not be running.', 'info');
                    }
                }
            };
            
            ws.onmessage = (msg) => {
                try {
                    const data = JSON.parse(msg.data);
                    detectionReceived = true;
                    feedDetections[data.feedId] = (feedDetections[data.feedId]||0)+1;
                    log(`Detection received - feed ${data.feedId}: ${data.detections.length} objects`, 'info');
                } catch(e) {
                    log('WebSocket parse error: '+e, 'error');
                }
            };
            
            ws.onclose = (event) => {
                const wasConnected = wsConnected;
                wsConnected = false;
                
                if (wasConnected) {
                    log(`WebSocket closed (code=${event.code})`, 'info');
                } else if (event.code !== 1000 && wsRetryCount < WS_MAX_RETRIES) {
                    // Unexpected close before connection succeeded - retry
                    log(`WebSocket closed unexpectedly (code=${event.code}). Retrying...`, 'info');
                    setTimeout(attemptWSConnection, 3000);
                }
            };
        } catch (error) {
            log(`WebSocket creation error: ${error}`, 'error');
            if (wsRetryCount < WS_MAX_RETRIES) {
                const delay = Math.min(3000 * wsRetryCount, 10000);
                setTimeout(attemptWSConnection, delay);
            } else {
                log('WebSocket connection failed after max retries.', 'error');
            }
        }
    };
    
    // Start WebSocket connection (non-blocking, keeps retrying)
    attemptWSConnection();
    
    // Wait a bit for initial connection, then proceed with validation
    await sleep(3000);
    if (wsConnected) {
        log('WebSocket connection established', 'success');
    } else {
        log('WebSocket still connecting in background...', 'info');
    }
    
    // Wait for detections
    log('Waiting 10s for YOLO detections...', 'info');
    await sleep(10000);
    if(detectionReceived) {
        log(`Detections received for feeds: ${Object.keys(feedDetections).join(', ')}`, 'success');
    } else {
        if (wsConnected) {
            log('No YOLO detections received. Check YOLO service & RTP forwarding.', 'error');
        } else {
            log('No YOLO detections received (WebSocket not connected).', 'error');
        }
    }

    // Step 5: Canvas overlay validation & visual annotation
    const videoEl = document.querySelector('video');
    const canvas = document.querySelector('canvas') || document.querySelector('[id^="detection-canvas"]');
    if(!canvas) log('Canvas overlay missing.', 'error');
    else if(!videoEl) log('Video element not found.', 'error');
    else {
        const ctx = canvas.getContext('2d');
        if(!ctx) log('Canvas context unavailable.', 'error');
        else {
            log('Canvas overlay OK. Drawing test annotations.', 'success');
            ctx.clearRect(0,0,canvas.width,canvas.height);
            // Draw bounding boxes for visual confirmation
            ctx.strokeStyle='red';
            ctx.lineWidth=2;
            ctx.strokeRect(10,10,100,50);
            ctx.font = '16px Arial';
            ctx.fillStyle = 'red';
            ctx.fillText('TEST BOX', 12, 30);
            log('Test bounding box drawn.', 'success');
        }
    }

    // Step 6: Stop RTP Forward
    if(feedId && window.stopRtpForward) {
        try {
            window.stopRtpForward(feedId);
            log('RTP forward stopped.', 'success');
        } catch(e) {
            log('RTP stop failed: ' + e, 'error');
        }
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
        log('WebSocket closed.', 'info');
    }
    log('=== VALIDATION COMPLETE ===', 'success');
    log('✅ If all success messages appeared, system is working end-to-end.');
})();
