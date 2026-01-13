/**
 * Janus VideoRoom Subscriber Test
 * Connects to Janus server and subscribes to VideoRoom 1234
 * 
 * ARCHITECTURE:
 * - Main handle: Discovery only (listparticipants, events)
 * - Subscriber handles: One per publisher feed (WebRTC negotiation + media)
 */
let discoveryHandle; // this will store your discovery handle


(function() {
    'use strict';

    // Configuration
    const JANUS_SERVER = 'http://192.168.64.4:8088/janus';
    const ROOM_ID = 1234;
    
    // Frame capture configuration (for YOLO inference)
    const CAPTURE_FPS = 5;  // Capture 5 frames per second for YOLO
    
    // Detect environment and get correct host IP for WebSocket
    // Try localhost first (if YOLO service is running locally), then VM IP
    const getWebSocketHost = () => {
        // If running on localhost, try localhost first (YOLO service might be local)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Check if we have an env var override
            if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_YOLO_WS_HOST) {
                return process.env.NEXT_PUBLIC_YOLO_WS_HOST;
            }
            // Default to localhost (YOLO service running locally)
            // If that fails, will retry with VM IP
            return 'localhost';
        }
        return window.location.hostname;
    };
    
    // WebSocket Configuration (for YOLO detection events)
    const WS_CONFIG = {
        url: (typeof window !== 'undefined' && window.location) 
            ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${getWebSocketHost()}:8766/ws/detections`
            : (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_YOLO_WS_URL) 
                || 'ws://localhost:8766/ws/detections'
    };
    
    // State - HARD SINGLETON SESSION
    let janus = null;
    let sessionReady = false;
    let destroying = false;
    let session = null;
    // DISCOVERY HANDLE - Must be globally accessible
    let discoveryHandle = null;
    let subscribedFeedId = null;
    let isSubscribed = false;
    let retryTimeout = null;
    // Per-publisher subscriber handles
    const subscriberHandlesByFeed = new Map(); // feedId -> pluginHandle
    const subscriberVideoElByFeed = new Map(); // feedId -> HTMLVideoElement
    const subscriberStreamsByFeed = new Map(); // feedId -> MediaStream (accumulated tracks)
    const frameCaptureByFeed = new Map(); // feedId -> { canvas, ctx, interval } for frame capture
    
    // WebSocket connection for YOLO detections
    let yoloWebSocket = null;
    let yoloWsReconnectTimeout = null;
    let yoloWsReconnectAttempts = 0;
    const YOLO_WS_MAX_RECONNECT_ATTEMPTS = 10; // Stop spamming after 10 attempts
    
    // DOM elements
    const statusEl = document.getElementById('status');
    const consoleLogEl = document.getElementById('console-log');
    
    /**
     * Logging utilities
     */
    function log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;
        consoleLogEl.appendChild(logEntry);
        consoleLogEl.scrollTop = consoleLogEl.scrollHeight;
        
        const consoleMethod = type === 'error' ? console.error : 
                              type === 'success' ? console.log : 
                              console.info;
        consoleMethod(`[Janus Test] ${message}`);
    }
    
    function updateStatus(message, type = 'info') {
        statusEl.textContent = message;
        statusEl.className = type;
        log(`STATUS: ${message}`, type);
    }
    
    function fail(message, error = null) {
        const errorMsg = error ? `${message}: ${error.message || error}` : message;
        updateStatus(`ERROR: ${errorMsg}`, 'error');
        log(`FAILURE: ${errorMsg}`, 'error');
        if (error) {
            console.error('Full error:', error);
        }
        throw new Error(errorMsg);
    }
    
    /**
     * Initialize Janus
     */
    function initJanus() {
        log('Step 1: Initializing Janus library...', 'info');
        
        if (typeof Janus === 'undefined') {
            fail('Janus library not loaded. Check if janus.js is accessible.');
        }
        
        log('Janus library loaded successfully', 'success');
        
        if (!Janus.isWebrtcSupported()) {
            fail('WebRTC is not supported in this browser');
        }
        
        log('WebRTC support confirmed', 'success');
        
        Janus.init({
            debug: 'all',
            callback: function() {
                log('Janus.init() callback fired', 'success');
                createSession();
            }
        });
        
        log('Janus.init() called, waiting for callback...', 'info');
    }
    
    /**
     * Create Janus session - HARD SINGLETON
     */
    function createSession() {
        log('Step 2: Creating Janus session...', 'info');
        updateStatus('Creating session...', 'info');
        
        // ENFORCE SINGLETON: Never create multiple sessions
        if (janus) {
            log('WARNING: Janus already exists, refusing to create another', 'error');
            console.warn('Janus already exists, refusing to create another');
            return;
        }
        
        janus = new Janus({
            server: JANUS_SERVER,
            success: function() {
                sessionReady = true;
                log('Janus session established', 'success');
                log('SESSION READY: sessionReady = true', 'success');
                session = janus;
                attachToVideoRoom();
            },
            error: function(error) {
                sessionReady = false;
                fail('Failed to create Janus session', error);
            },
            destroyed: function() {
                log('Janus session destroyed', 'info');
                console.warn('Janus session destroyed');
                janus = null;
                session = null;
                sessionReady = false;
                destroying = false;
            }
        });
        
        log('new Janus() called, waiting for success callback...', 'info');
    }
    
    /**
     * Attach to VideoRoom plugin (DISCOVERY ONLY)
     * Main handle does NOT handle WebRTC or media
     */
    function attachToVideoRoom() {
        log('Step 3: Attaching to VideoRoom plugin (discovery only)...', 'info');
        updateStatus('Attaching to VideoRoom plugin...', 'info');
        
        // GUARD: Check session is alive
        if (!janus || !sessionReady || destroying) {
            log('BLOCKED: Cannot attach - session not ready or destroying', 'error');
            console.warn('Blocked attach: session not ready or destroying');
            return;
        }
        
        if (!session) {
            fail('No active session. Cannot attach to plugin.');
        }
        
        session.attach({
            plugin: 'janus.plugin.videoroom',
            success: function(handle) {
                // CRITICAL: Assign discovery handle in module-global scope
                discoveryHandle = handle;
                window.discoveryHandle = handle;  // Make globally accessible
                log('Successfully attached to VideoRoom plugin (discovery handle)', 'success');
                log(`Discovery handle attached: ${discoveryHandle}`, 'success');
                log(`Discovery handle ID: ${discoveryHandle.getId()}`, 'info');
                console.log('Discovery handle attached:', discoveryHandle);
                log('STATE: Discovery handle attached. onmessage callback is now registered.', 'success');
                log('CALLBACK REGISTRATION: onmessage callback registered at handle attachment time', 'info');
                updateStatus('Checking for publishers in room...', 'info');
                
                // Verify handle is accessible
                if (!discoveryHandle) {
                    fail('CRITICAL: discoveryHandle is null after assignment');
                }
                
                // Call requestListParticipants synchronously - onmessage is already registered
                log('CALLBACK REGISTRATION: Calling requestListParticipants() - onmessage is ready', 'info');
                requestListParticipants();
            },
            error: function(error) {
                fail('Failed to attach to VideoRoom plugin', error);
            },
            onmessage: function(msg, jsep) {
                // Main handle onmessage: Discovery only, ignore JSEP
                log('=== ONMESSAGE CALLBACK FIRED ===', 'success');
                console.log("=== ONMESSAGE FIRED ===", msg);
                log(`Discovery handle onmessage received: ${JSON.stringify(msg)}`, 'info');
                log(`Message type: ${msg.videoroom || 'unknown'}`, 'info');
                
                // JSEP should NEVER arrive on main handle
                if (jsep) {
                    log('WARNING: JSEP received on discovery handle (should not happen)', 'error');
                }
                
                if (msg.videoroom) {
                    log('Calling handleVideoRoomMessage()...', 'info');
                    handleVideoRoomMessage(msg);
                }
                
                // REQUIRED: Listen for publishers in "joined" or "event" messages
                if (msg.videoroom === 'joined' || msg.videoroom === 'event') {
                    if (msg.publishers && Array.isArray(msg.publishers) && msg.publishers.length > 0) {
                        log(`VERIFICATION: publishers array detected: ${JSON.stringify(msg.publishers)}`, 'success');
                        log(`VERIFICATION: Found ${msg.publishers.length} publisher(s)`, 'success');
                        
                        for (const publisher of msg.publishers) {
                            const feedId = publisher && publisher.id;
                            if (feedId) {
                                log(`VERIFICATION: Subscribing to feed ${feedId}`, 'success');
                                subscribeToFeed(feedId);
                            }
                        }
                    }
                }
            },
            oncleanup: function() {
                log('Discovery handle cleanup', 'info');
            }
        });
        
        log('session.attach() called for discovery handle...', 'info');
    }
    
    /**
     * Request list of participants from the room
     */
    function requestListParticipants() {
        log('Step 4: Requesting list of participants...', 'info');
        updateStatus('Requesting participant list...', 'info');
        
        // GUARD: Check session is alive
        if (!janus || !sessionReady || destroying) {
            log('BLOCKED: Cannot request participants - session not ready or destroying', 'error');
            console.warn('Blocked requestListParticipants: session not ready or destroying');
            return;
        }
        
        // CRITICAL: Verify discovery handle exists
        if (!discoveryHandle) {
            log('ERROR: discoveryHandle is not defined. Cannot request participants.', 'error');
            console.error('discoveryHandle is not defined. Cannot request participants.');
            fail('No discovery handle. Cannot request participants.');
            return;
        }
        
        const listRequest = {
            request: 'listparticipants',
            room: ROOM_ID
        };
        
        log(`Sending listparticipants request: ${JSON.stringify(listRequest)}`, 'info');
        log(`Using discovery handle: ${discoveryHandle} (ID: ${discoveryHandle.getId()})`, 'info');
        log('MESSAGE SEND: Calling discoveryHandle.send() synchronously - onmessage is already registered', 'info');
        
        // Send synchronously - onmessage callback is already registered when attach() success fires
        discoveryHandle.send({
            message: listRequest,
            success: function(result) {
                log(`MESSAGE SEND: listparticipants message sent successfully`, 'success');
                log(`MESSAGE SEND: Response from send() success callback: ${JSON.stringify(result)}`, 'info');
                
                // CRITICAL FIX: Janus sometimes returns the response in success callback instead of onmessage
                // Check if result contains the actual response data
                if (result && result.videoroom === 'participants') {
                    log('MESSAGE SEND: Response contains participants data - processing directly from success callback', 'success');
                    log('MESSAGE SEND: This is a Janus quirk - response came in success callback instead of onmessage', 'info');
                    handleVideoRoomMessage(result);
                } else {
                    log('MESSAGE SEND: Waiting for onmessage callback to receive Janus response...', 'info');
                }
            },
            error: function(error) {
                log(`MESSAGE SEND: Failed to send listparticipants request: ${error}`, 'error');
                fail('Failed to send listparticipants request', error);
            }
        });
        
        log('MESSAGE SEND: discoveryHandle.send() call completed', 'info');
    }
    
    /**
     * Handle VideoRoom plugin messages (discovery only)
     */
    function handleVideoRoomMessage(msg) {
        log('=== handleVideoRoomMessage CALLED ===', 'success');
        log(`handleVideoRoomMessage: Processing message`, 'info');
        log(`handleVideoRoomMessage: msg.videoroom = ${msg.videoroom}`, 'info');
        
        if (msg.videoroom === 'participants') {
            log('STATE: Received listparticipants response', 'info');
            handleParticipantsList(msg);
            return;
        }
        
        if (msg.videoroom === 'event') {
            log('DIAGNOSTIC: videoroom:"event" received', 'success');
            log(`Event message: ${JSON.stringify(msg)}`, 'info');
            
            if (msg.unpublished) {
                const unpublishedId = msg.unpublished;
                log(`STATE: Publisher ${unpublishedId} left the room`, 'info');
                updateStatus('Publisher left the room', 'info');
                
                if (subscriberHandlesByFeed.has(unpublishedId)) {
                    log('STATE: Our subscribed publisher left. Cleaning up subscriber handle.', 'info');
                    const subHandle = subscriberHandlesByFeed.get(unpublishedId);
                    
                    // Stop frame capture before detaching
                    stopFrameCapture(unpublishedId);
                    
                    subHandle.detach();
                    subscriberHandlesByFeed.delete(unpublishedId);
                    subscriberVideoElByFeed.delete(unpublishedId);
                    subscriberStreamsByFeed.delete(unpublishedId);
                    updateStatus('Waiting for new publisher...', 'info');
                    requestListParticipants();
                }
            }
            
            if (msg.leaving) {
                log(`STATE: Publisher ${msg.leaving} is leaving`, 'info');
            }
            
            if (msg.error) {
                fail(`VideoRoom error: ${msg.error}`, msg.error);
            }
        }
    }
    
    /**
     * Handle participants list response
     * Subscribes to existing publishers found in the participants list
     */
    function handleParticipantsList(msg) {
        log('handleParticipantsList: Processing participant list', 'info');
        
        if (!msg.participants || !Array.isArray(msg.participants)) {
            log('No participants array in response. Retrying in 1 second', 'info');
            updateStatus('No participants yet, retrying...', 'info');
            retryListParticipants();
            return;
        }
        
        if (msg.participants.length === 0) {
            log('No participants yet, retrying in 1 second', 'info');
            updateStatus('No participants yet, retrying...', 'info');
            retryListParticipants();
            return;
        }
        
        log(`Total participants: ${msg.participants.length}`, 'info');
        
        const publishers = msg.participants.filter(function(p) {
            return p.publisher === true;
        });
        
        log(`Publishers found in listparticipants: ${publishers.length}`, publishers.length > 0 ? 'success' : 'info');
        
        if (publishers.length > 0) {
            log('Subscribing to existing publishers from listparticipants response...', 'success');
            for (const p of publishers) {
                const feedId = p && p.id;
                if (feedId) {
                    log(`Publisher found in participants list (feed=${feedId}, display=${p.display || 'N/A'})`, 'info');
                    // subscribeToFeed() has duplicate check, so safe to call even if already subscribed via event
                    subscribeToFeed(feedId);
                }
            }
        } else {
            log('No publishers yet, retrying in 1 second', 'info');
            updateStatus('No publishers yet, retrying...', 'info');
            retryListParticipants();
        }
    }
    
    /**
     * Retry listparticipants after 1 second
     */
    function retryListParticipants() {
        if (isSubscribed) {
            log('Already subscribed, skipping retry', 'info');
            return;
        }
        
        if (retryTimeout) {
            clearTimeout(retryTimeout);
        }
        
        log('Retrying listparticipants in 1 second...', 'info');
        retryTimeout = setTimeout(function() {
            log('Retrying listparticipants request...', 'info');
            requestListParticipants();
        }, 1000);
    }
    
    // RTP forwarding code removed - using browser-based frame capture instead
    
    /**
     * Subscribe to a specific publisher feed
     * Creates a NEW subscriber handle for WebRTC negotiation
     */
    function subscribeToFeed(feedId) {
        log(`Step 5: Subscribing to publisher feed ${feedId}...`, 'info');
        updateStatus(`Subscribing to publisher ${feedId}...`, 'info');

        // GUARD: Check session is alive
        if (!janus || !sessionReady || destroying) {
            log('BLOCKED: Cannot subscribe - session not ready or destroying', 'error');
            console.warn('Blocked subscribeToFeed: session not ready or destroying');
            return;
        }

        if (feedId === null || feedId === undefined) {
            log('Cannot subscribe: feed ID is null/undefined. Aborting subscribe.', 'error');
            return;
        }
        if (typeof feedId !== 'number' || feedId <= 0 || !Number.isInteger(feedId)) {
            log(`Cannot subscribe: feed ID must be a positive integer. Got: ${feedId} (${typeof feedId})`, 'error');
            return;
        }

        if (subscriberHandlesByFeed.has(feedId)) {
            log(`Already have a subscriber handle for feed ${feedId}, ignoring`, 'info');
            return;
        }

        if (!session) {
            fail('No active Janus session. Cannot attach subscriber handle.');
        }

        log(`Subscriber attaching for feed ${feedId}...`, 'info');

        session.attach({
            plugin: 'janus.plugin.videoroom',
            success: function(subHandle) {
                log(`VERIFICATION: Subscriber handle attached for feed ${feedId} (handleId=${subHandle.getId()})`, 'success');
                subscriberHandlesByFeed.set(feedId, subHandle);

                subscribedFeedId = feedId;
                isSubscribed = true;

                const joinMsg = {
                    request: 'join',
                    room: ROOM_ID,
                    ptype: 'subscriber',
                    feed: feedId
                };
                log(`VERIFICATION: Subscribing to feed ${feedId}`, 'success');
                log(`VERIFICATION: Subscriber join request sending (feed=${feedId}): ${JSON.stringify(joinMsg)}`, 'info');
                log(`VERIFICATION: Subscriber joined (feed=${feedId})`, 'success');

                subHandle.send({
                    message: joinMsg,
                    success: function(result) {
                        log(`DIAGNOSTIC: Subscriber join message sent (feed=${feedId})`, 'success');
                        log(`DIAGNOSTIC: Waiting for JSEP offer from Janus server...`, 'info');
                    },
                    error: function(error) {
                        log(`Subscriber join send failed (feed=${feedId}): ${error}`, 'error');
                        subscriberHandlesByFeed.delete(feedId);
                        fail('Failed to send subscriber join request', error);
                    }
                });
            },
            error: function(error) {
                fail(`Failed to attach subscriber handle for feed ${feedId}`, error);
            },
            iceState: function(state) {
                log(`DIAGNOSTIC: Subscriber ICE state (feed=${feedId}): ${state}`, 'info');
                if (state === 'connected') {
                    log(`DIAGNOSTIC: ICE connected for feed ${feedId}`, 'success');
                } else if (state === 'failed') {
                    log(`DIAGNOSTIC: ICE failed for feed ${feedId}`, 'error');
                }
            },
            webrtcState: function(on) {
                log(`DIAGNOSTIC: Subscriber WebRTC state (feed=${feedId}): ${on ? 'UP' : 'DOWN'}`, on ? 'success' : 'error');
                if (on) {
                    log(`DIAGNOSTIC: WebRTC media is now available for feed ${feedId}`, 'success');
                }
            },
            onmessage: function(msg, jsep) {
                log(`DIAGNOSTIC: Subscriber onmessage (feed=${feedId}): ${JSON.stringify(msg)}`, 'info');

                // CRITICAL: Get handle from map (subHandle is not in scope here)
                const subHandle = subscriberHandlesByFeed.get(feedId);
                if (!subHandle) {
                    log(`ERROR: Subscriber handle not found for feed ${feedId}`, 'error');
                    return;
                }

                if (msg && msg.error) {
                    fail(`Subscriber plugin error (feed=${feedId}): ${msg.error}`, msg.error);
                }
                
                // Handle videoroom: "attached" - frame capture will start after video is playing
                if (msg.videoroom === 'attached') {
                    log(`Publisher attached for feed ${feedId}`, 'info');
                    // Frame capture will start automatically when video starts playing
                }

                // JSEP offer received: create answer and send start
                if (jsep) {
                    log(`DIAGNOSTIC: JSEP offer received (feed=${feedId}, type=${jsep.type})`, 'success');
                    log(`DIAGNOSTIC: JSEP SDP length: ${jsep.sdp ? jsep.sdp.length : 0}`, 'info');
                    log(`DIAGNOSTIC: Subscriber creating answer (tracks) for feed ${feedId}...`, 'info');

                    // GUARD: Check session is alive before createAnswer
                    if (!janus || !sessionReady || destroying) {
                        log('BLOCKED: Cannot createAnswer - session not ready or destroying', 'error');
                        console.warn('Blocked createAnswer: session not ready or destroying');
                        return;
                    }

                    log(`VERIFICATION: Creating SDP answer for feed ${feedId}`, 'success');
                    subHandle.createAnswer({
                        jsep: jsep,
                        media: { audioSend: false, videoSend: false },
                        success: function(answerJsep) {
                            log(`VERIFICATION: createAnswer success (feed=${feedId})`, 'success');
                            log(`VERIFICATION: Answer JSEP type: ${answerJsep.type}`, 'info');
                            log(`VERIFICATION: Creating SDP answer - COMPLETE`, 'success');

                            subHandle.send({
                                message: { request: 'start', room: ROOM_ID },
                                jsep: answerJsep,
                                success: function() {
                                    log(`VERIFICATION: Start request sent (feed=${feedId})`, 'success');
                                    log(`VERIFICATION: WebRTC negotiation initiated for feed ${feedId}`, 'success');
                                },
                                error: function(err) {
                                    fail(`Subscriber start failed (feed=${feedId})`, err);
                                }
                            });
                        },
                        error: function(err) {
                            fail(`Subscriber createAnswer failed (feed=${feedId})`, err);
                        }
                    });
                } else {
                    // Track if no JSEP is received after subscription
                    log(`DIAGNOSTIC: No JSEP received yet (feed=${feedId})`, 'info');
                    log(`WARNING: If no JSEP arrives, subscription may have been attempted before publisher was publishing`, 'error');
                }
            },
            onremotetrack: function(track, mid, on) {
                log(`VERIFICATION: onremotetrack fired (feed=${feedId}): ${on ? 'added' : 'removed'}`, on ? 'success' : 'info');
                log(`VERIFICATION: Track kind: ${track.kind}, id: ${track.id}, mid: ${mid}`, 'info');

                // Get or create stream for this feed (accumulate tracks)
                let stream = subscriberStreamsByFeed.get(feedId);
                if (!stream) {
                    stream = new MediaStream();
                    subscriberStreamsByFeed.set(feedId, stream);
                    log(`Created new MediaStream for feed ${feedId}`, 'info');
                }

                if (on) {
                    // Add track to stream
                    stream.addTrack(track);
                    log(`Added ${track.kind} track to stream for feed ${feedId}`, 'success');
                    
                    if (track.kind === 'video') {
                        log(`VERIFICATION: Remote video track received (feed=${feedId}, track.id=${track.id})`, 'success');
                        log(`VERIFICATION: onremotetrack fired - COMPLETE`, 'success');
                        
                        const videoEl = getOrCreateVideoElementForFeed(feedId);
                        
                        // CRITICAL: Set muted BEFORE assigning srcObject for autoplay to work
                        videoEl.muted = true;
                        videoEl.setAttribute('muted', 'true');
                        videoEl.autoplay = true;
                        videoEl.setAttribute('autoplay', 'true');
                        videoEl.playsInline = true;
                        videoEl.setAttribute('playsinline', 'true');
                        
                        // Assign stream
                        videoEl.srcObject = stream;
                        log(`VERIFICATION: Video element attached (feed=${feedId})`, 'success');
                        
                        // Error handling
                        videoEl.onerror = function(error) {
                            const errorDetails = {
                                error: error,
                                errorCode: videoEl.error ? videoEl.error.code : 'unknown',
                                errorMessage: videoEl.error ? videoEl.error.message : 'unknown',
                                networkState: videoEl.networkState,
                                readyState: videoEl.readyState
                            };
                            log(`Remote video playback error (feed=${feedId}): ${JSON.stringify(errorDetails)}`, 'error');
                            console.error('Remote video error details:', errorDetails);
                        };
                        
                        // Explicitly start playback when metadata is loaded
                        videoEl.onloadedmetadata = function() {
                            log(`Video metadata loaded for feed ${feedId}`, 'success');
                            log(`Video dimensions: ${videoEl.videoWidth}x${videoEl.videoHeight}`, 'info');
                            
                            log(`Attempting to start video playback for feed ${feedId}...`, 'info');
                            videoEl.play()
                                .then(function() {
                                    log(`Remote video started playing successfully (feed=${feedId})`, 'success');
                                    updateStatus('Remote video stream received and playing', 'success');
                                    
                                    // Start frame capture for YOLO
                                    startFrameCapture(videoEl, feedId);
                                })
                                .catch(function(error) {
                                    log(`Video play() failed for feed ${feedId}: ${error.message}`, 'error');
                                    console.error('Video play() error:', error);
                                    // Try unmuting and playing again
                                    if (videoEl.muted) {
                                        log(`Attempting to play with unmuted audio for feed ${feedId}...`, 'info');
                                        videoEl.muted = false;
                                        videoEl.play()
                                            .then(function() {
                                                log(`Video playing after unmuting (feed=${feedId})`, 'success');
                                                videoEl.muted = true; // Mute again after starting
                                            })
                                            .catch(function(err) {
                                                log(`Video play() failed even after unmuting (feed=${feedId}): ${err.message}`, 'error');
                                            });
                                    }
                                });
                        };
                        
                        updateStatus('Remote video stream received', 'success');
                    } else if (track.kind === 'audio') {
                        log(`VERIFICATION: Remote audio track received (feed=${feedId}, track.id=${track.id})`, 'success');
                    }
                } else {
                    // Remove track from stream
                    stream.removeTrack(track);
                    log(`⚠️ Track removed: ${track.kind} (feed=${feedId}, track.id=${track.id})`, 'info');
                    
                    // If no tracks left, clear stream but don't remove video element
                    if (stream.getTracks().length === 0) {
                        subscriberStreamsByFeed.delete(feedId);
                        log(`⚠️ All tracks removed - stream cleared for feed ${feedId}`, 'warning');
                        log(`ℹ️ Video element will remain but may show black screen until tracks return`, 'info');
                        
                        // If video track was removed, publisher might have stopped
                        // Wait a bit then check if publisher is still active
                        if (track.kind === 'video') {
                            log(`🔄 Video track removed - checking if publisher is still active in 2 seconds...`, 'info');
                            setTimeout(function() {
                                // Check if publisher is still in room
                                if (discoveryHandle) {
                                    discoveryHandle.send({
                                        message: { request: 'listparticipants', room: ROOM_ID },
                                        success: function(result) {
                                            const participants = result.participants || [];
                                            const publisherStillActive = participants.some(p => p.id === feedId && p.publisher === true);
                                            if (publisherStillActive) {
                                                log(`✅ Publisher ${feedId} is still active - tracks may return shortly`, 'info');
                                            } else {
                                                log(`⚠️ Publisher ${feedId} is no longer active - video feed ended`, 'warning');
                                            }
                                        },
                                        error: function(error) {
                                            log(`Error checking publisher status: ${error}`, 'error');
                                        }
                                    });
                                }
                            }, 2000);
                        }
                    }
                }
            },
            oncleanup: function() {
                log(`Subscriber handle cleanup (feed=${feedId})`, 'info');
            }
        });
    }
    
    function getOrCreateVideoElementForFeed(feedId) {
        // Check if we already have a video element for this feed
        if (subscriberVideoElByFeed.has(feedId)) {
            return subscriberVideoElByFeed.get(feedId);
        }

        // For the first feed, try to use the existing remote-video element
        if (feedId === subscribedFeedId || subscriberVideoElByFeed.size === 0) {
            const existing = document.getElementById('remote-video');
            if (existing) {
                subscriberVideoElByFeed.set(feedId, existing);
                log(`Using existing remote-video element for feed ${feedId}`, 'info');
                return existing;
            }
        }

        // Create new video element
        const container = document.getElementById('video-container') || document.body;
        const video = document.createElement('video');
        video.id = `remote-video-${feedId}`;
        
        // CRITICAL: Set attributes BEFORE appending to DOM
        video.muted = true;
        video.setAttribute('muted', 'true');
        video.autoplay = true;
        video.setAttribute('autoplay', 'true');
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.style.width = '100%';
        video.style.maxWidth = '1280px';
        video.style.background = '#000';
        
        container.appendChild(video);
        subscriberVideoElByFeed.set(feedId, video);
        log(`Created <video> element for feed ${feedId}`, 'info');
        return video;
    }
    
    /**
     * Cleanup function - DESTROY ONCE AND WAIT
     */
    function cleanup() {
        // Prevent double-destroy
        if (!janus || destroying) {
            log('Cleanup blocked: no session or already destroying', 'info');
            return;
        }

        destroying = true;
        log('Destroying Janus session...', 'info');
        console.log('Destroying Janus session…');
        
        if (retryTimeout) {
            clearTimeout(retryTimeout);
            retryTimeout = null;
        }
        
        isSubscribed = false;
        subscribedFeedId = null;
        
        // Detach subscriber handles
        for (const [feedId, subHandle] of subscriberHandlesByFeed.entries()) {
            try {
                log(`Detaching subscriber handle for feed ${feedId}`, 'info');
                subHandle.detach();
            } catch (e) {
                log(`Error detaching subscriber handle for feed ${feedId}: ${e}`, 'error');
            }
        }
        // Stop all frame captures before cleanup
        for (const feedId of frameCaptureByFeed.keys()) {
            stopFrameCapture(feedId);
        }
        
        subscriberHandlesByFeed.clear();
        subscriberVideoElByFeed.clear();
        subscriberStreamsByFeed.clear();
        frameCaptureByFeed.clear();
        
        if (discoveryHandle) {
            try {
                log('Detaching discovery handle...', 'info');
                discoveryHandle.detach();
            } catch (e) {
                log(`Error detaching discovery handle: ${e}`, 'error');
            }
            discoveryHandle = null;
        }
        
        if (janus) {
            janus.destroy({
                success: function() {
                    log('Janus destroyed cleanly', 'success');
                    console.log('Janus destroyed cleanly');
                },
                error: function(err) {
                    log(`Janus destroy error: ${err}`, 'error');
                    console.error('Janus destroy error:', err);
                }
            });
        }
        
        // Close YOLO WebSocket
        if (yoloWebSocket) {
            yoloWebSocket.close();
            yoloWebSocket = null;
        }
        
        if (yoloWsReconnectTimeout) {
            clearTimeout(yoloWsReconnectTimeout);
            yoloWsReconnectTimeout = null;
        }
    }
    
    /**
     * Start frame capture for YOLO inference
     * Captures frames from video element and sends JPEG via WebSocket
     */
    function startFrameCapture(videoElement, feedId) {
        // Don't start if already capturing
        if (frameCaptureByFeed.has(feedId)) {
            log(`Frame capture already running for feed ${feedId}`, 'info');
            return;
        }
        
        if (!yoloWebSocket || yoloWebSocket.readyState !== WebSocket.OPEN) {
            log(`Cannot start frame capture: WebSocket not connected for feed ${feedId}. Will retry when WebSocket connects.`, 'warning');
            // Retry when WebSocket connects (handled in onopen callback)
            return;
        }
        
        // Wait for video to be ready
        if (videoElement.readyState < 2) {
            log(`Video not ready for feed ${feedId}, waiting for loadedmetadata...`, 'info');
            videoElement.onloadedmetadata = () => {
                startFrameCapture(videoElement, feedId);
            };
            return;
        }
        
        // Create canvas for frame capture
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        canvas.width = videoElement.videoWidth || videoElement.clientWidth;
        canvas.height = videoElement.videoHeight || videoElement.clientHeight;
        
        if (canvas.width === 0 || canvas.height === 0) {
            log(`Video dimensions not ready for feed ${feedId}, retrying...`, 'info');
            setTimeout(() => startFrameCapture(videoElement, feedId), 500);
            return;
        }
        
        log(`📸 Starting frame capture for feed ${feedId} at ${CAPTURE_FPS} FPS (canvas: ${canvas.width}x${canvas.height})`, 'success');
        
        // Start capturing frames
        const interval = setInterval(() => {
            if (videoElement.readyState < 2 || videoElement.paused || videoElement.ended) {
                return;  // Video not ready
            }
            
            if (!yoloWebSocket || yoloWebSocket.readyState !== WebSocket.OPEN) {
                return;  // WebSocket not connected
            }
            
            // Draw current frame to canvas
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            
            // Convert to JPEG blob and send
            canvas.toBlob(
                (blob) => {
                    if (blob && yoloWebSocket && yoloWebSocket.readyState === WebSocket.OPEN) {
                        yoloWebSocket.send(blob);
                        log(`📸 Sent frame for feed ${feedId} (${blob.size} bytes)`, 'debug');
                    }
                },
                'image/jpeg',
                0.7  // JPEG quality
            );
        }, 1000 / CAPTURE_FPS);
        
        // Store capture info
        frameCaptureByFeed.set(feedId, { canvas, ctx, interval });
        
        log(`✅ Frame capture started for feed ${feedId}`, 'success');
    }
    
    /**
     * Stop frame capture for a feed
     */
    function stopFrameCapture(feedId) {
        const capture = frameCaptureByFeed.get(feedId);
        if (capture) {
            clearInterval(capture.interval);
            frameCaptureByFeed.delete(feedId);
            log(`📸 Frame capture stopped for feed ${feedId}`, 'info');
        }
    }
    
    /**
     * Connect to YOLO WebSocket for detection events
     */
    function connectYoloWebSocket() {
        if (yoloWebSocket && yoloWebSocket.readyState === WebSocket.OPEN) {
            log('YOLO WebSocket already connected', 'info');
            return;
        }
        
        // Try localhost first, then fallback to VM IP if needed
        const tryConnect = (url, isFallback = false) => {
            log(`YOLO: Connecting to WebSocket at ${url}...`, 'info');
            
                try {
                    const ws = new WebSocket(url);
                    ws.binaryType = 'blob';  // Accept binary JPEG frames
                
                const connectTimeout = setTimeout(() => {
                    if (ws.readyState === WebSocket.CONNECTING) {
                        ws.close();
                        if (!isFallback) {
                            // Try fallback to VM IP
                            const janusMatch = JANUS_SERVER.match(/http:\/\/([\d.]+)/);
                            const fallbackHost = janusMatch ? janusMatch[1] : '192.168.64.4';
                            const fallbackUrl = url.replace('localhost', fallbackHost).replace('127.0.0.1', fallbackHost);
                            log(`YOLO: localhost connection timeout, trying fallback: ${fallbackUrl}`, 'info');
                            tryConnect(fallbackUrl, true);
                        }
                    }
                }, 3000); // 3 second timeout
                
                ws.onopen = function() {
                    clearTimeout(connectTimeout);
                    yoloWebSocket = ws;
                    log('YOLO: WebSocket connected successfully', 'success');
                    updateStatus('YOLO detection service connected', 'success');
                    
                    // Reset reconnect attempts on successful connection
                    yoloWsReconnectAttempts = 0;
                    
                    // Clear any reconnect timeout
                    if (yoloWsReconnectTimeout) {
                        clearTimeout(yoloWsReconnectTimeout);
                        yoloWsReconnectTimeout = null;
                    }
                    
                    // Start frame capture for any active video feeds that don't have capture running yet
                    // This handles the case where video started playing before WebSocket connected
                    for (const [feedId, videoEl] of subscriberVideoElByFeed.entries()) {
                        if (!frameCaptureByFeed.has(feedId) && videoEl.readyState >= 2 && !videoEl.paused && !videoEl.ended) {
                            log(`YOLO: Starting frame capture for feed ${feedId} now that WebSocket is connected`, 'info');
                            setTimeout(() => {
                                startFrameCapture(videoEl, feedId);
                            }, 100);
                        }
                    }
                };
                
                ws.onmessage = function(event) {
                    try {
                        // Handle binary data (shouldn't receive binary from backend, but just in case)
                        if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
                            log(`⚠️ YOLO: Received binary data (unexpected)`, 'warning');
                            return;
                        }
                        
                        const rawData = event.data;
                        log(`🔵 YOLO: WebSocket message received (${rawData.length} bytes)`, 'debug');
                        
                        const detection = JSON.parse(rawData);
                        
                        // Handle keepalive messages
                        if (detection.type === 'keepalive') {
                            log(`💚 YOLO: Received keepalive message`, 'debug');
                            return;
                        }
                        
                        // Check if this is a detection message
                        if (Array.isArray(detection.detections)) {
                            const detectionsCount = detection.detections.length;
                            log(`🎯 YOLO: Detection received with ${detectionsCount} detection(s)`, 'success');
                            if (detectionsCount > 0) {
                                log(`🎯 YOLO: Detections: ${detection.detections.map(d => `${d.label} (${(d.confidence * 100).toFixed(0)}%)`).join(', ')}`, 'info');
                            }
                            // Map detection to the active feed that's currently capturing frames
                            // Since we're sending frames from active feeds, map to the feed that's actively capturing
                            const activeCaptureFeeds = Array.from(frameCaptureByFeed.keys());
                            const activeVideoFeeds = Array.from(subscriberVideoElByFeed.keys());
                            
                            // Prefer feed that's actively capturing, otherwise use first active video feed
                            const feedId = activeCaptureFeeds.length > 0 
                                ? activeCaptureFeeds[0] 
                                : (activeVideoFeeds.length > 0 
                                    ? activeVideoFeeds[0] 
                                    : (detection.feedId !== undefined ? detection.feedId : 0));
                            
                            if (feedId > 0) {
                                log(`🎯 YOLO: Mapping detection to feed ${feedId} (capturing: [${activeCaptureFeeds.join(', ')}], videos: [${activeVideoFeeds.join(', ')}])`, 'debug');
                                handleYoloDetection({ ...detection, feedId });
                            } else {
                                log(`⚠️ YOLO: No active feed found to map detection to`, 'warning');
                            }
                        } else {
                            log(`⚠️ YOLO: Unknown message format: ${JSON.stringify(detection).substring(0, 100)}`, 'warning');
                        }
                    } catch (error) {
                        log(`❌ YOLO: Error parsing detection message: ${error}`, 'error');
                        log(`❌ YOLO: Raw message (first 500 chars): ${event.data.substring(0, 500)}`, 'error');
                    }
                };
                
                ws.onerror = function(error) {
                    clearTimeout(connectTimeout);
                    // Only log error on first few attempts to reduce spam
                    if (yoloWsReconnectAttempts < 3) {
                        log(`YOLO: WebSocket error: ${error}`, 'error');
                    }
                };
                
                ws.onclose = function(event) {
                    clearTimeout(connectTimeout);
                    // Only log close on first few attempts
                    if (yoloWsReconnectAttempts < 3) {
                        log(`YOLO: WebSocket closed (code=${event.code}, reason=${event.reason || 'none'})`, 'info');
                    }
                    yoloWebSocket = null;
                    
                    // Attempt to reconnect if under max attempts
                    if (yoloWsReconnectAttempts < YOLO_WS_MAX_RECONNECT_ATTEMPTS) {
                        if (!yoloWsReconnectTimeout) {
                            yoloWsReconnectAttempts++;
                            const delay = Math.min(3000 * yoloWsReconnectAttempts, 30000); // Exponential backoff, max 30s
                            
                            if (yoloWsReconnectAttempts <= 3) {
                                log(`YOLO: Attempting to reconnect in ${delay/1000}s... (attempt ${yoloWsReconnectAttempts}/${YOLO_WS_MAX_RECONNECT_ATTEMPTS})`, 'info');
                            } else if (yoloWsReconnectAttempts === 4) {
                                log(`YOLO: YOLO service unavailable. Retrying silently... (attempt ${yoloWsReconnectAttempts}/${YOLO_WS_MAX_RECONNECT_ATTEMPTS})`, 'info');
                            }
                            
                            yoloWsReconnectTimeout = setTimeout(function() {
                                yoloWsReconnectTimeout = null;
                                connectYoloWebSocket();
                            }, delay);
                        }
                    } else if (yoloWsReconnectAttempts === YOLO_WS_MAX_RECONNECT_ATTEMPTS) {
                        log(`YOLO: Max reconnection attempts reached (${YOLO_WS_MAX_RECONNECT_ATTEMPTS}). YOLO service unavailable.`, 'error');
                        log(`YOLO: To re-enable, restart the YOLO service and refresh the page.`, 'info');
                    }
                };
            } catch (error) {
                log(`YOLO: Failed to create WebSocket: ${error}`, 'error');
            }
        };
        
        tryConnect(WS_CONFIG.url);
    }
    
    /**
     * Handle YOLO detection event
     */
    function handleYoloDetection(detection) {
        const feedId = detection.feedId;
        const detections = detection.detections || [];
        
        if (detections.length === 0) {
            return; // No detections to draw
        }
        
        log(`YOLO: Received ${detections.length} detection(s) for feed ${feedId}`, 'info');
        
        // Draw bounding boxes on canvas overlay
        drawDetections(feedId, detections);
    }
    
    /**
     * Draw detection bounding boxes on canvas overlay
     */
    function drawDetections(feedId, detections) {
        log(`🎨 drawDetections called for feed ${feedId} with ${detections.length} detections`, 'info');
        
        const videoEl = subscriberVideoElByFeed.get(feedId);
        if (!videoEl) {
            log(`❌ drawDetections: Video element not found for feed ${feedId}`, 'error');
            return; // Video element not found
        }
        
        // Get or create canvas overlay
        let canvas = document.getElementById(`detection-canvas-${feedId}`);
        if (!canvas) {
            log(`🎨 Creating canvas overlay for feed ${feedId}`, 'info');
            // Create canvas overlay
            const container = videoEl.parentElement;
            if (!container) {
                log(`❌ drawDetections: Video element has no parent container for feed ${feedId}`, 'error');
                return;
            }
            canvas = document.createElement('canvas');
            canvas.id = `detection-canvas-${feedId}`;
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '10';
            container.style.position = 'relative';
            container.appendChild(canvas);
            log(`✅ Canvas overlay created and appended for feed ${feedId}`, 'success');
        }
        
        // Match canvas size to video
        const videoWidth = videoEl.videoWidth || videoEl.clientWidth;
        const videoHeight = videoEl.videoHeight || videoEl.clientHeight;
        
        log(`📐 Video dimensions for feed ${feedId}: ${videoWidth}x${videoHeight}`, 'info');
        
        if (videoWidth === 0 || videoHeight === 0) {
            log(`⚠️ drawDetections: Video not ready (dimensions: ${videoWidth}x${videoHeight}) for feed ${feedId}`, 'warning');
            return; // Video not ready
        }
        
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        canvas.style.width = videoEl.style.width || '100%';
        canvas.style.height = 'auto';
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            log(`❌ drawDetections: Cannot get canvas context for feed ${feedId}`, 'error');
            return;
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw each detection
        let drawnCount = 0;
        detections.forEach(function(det) {
            try {
                const [x, y, width, height] = det.bbox; // Normalized 0-1
                
                // Convert to pixel coordinates
                const px = x * videoWidth;
                const py = y * videoHeight;
                const pw = width * videoWidth;
                const ph = height * videoHeight;
                
                // Color based on confidence
                const confidence = det.confidence;
                const color = confidence > 0.7 ? '#00ff00' : confidence > 0.5 ? '#ffff00' : '#ff0000';
                
                // Draw bounding box
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.strokeRect(px, py, pw, ph);
                
                // Draw label with confidence
                ctx.fillStyle = color;
                ctx.font = 'bold 16px Arial';
                ctx.fillText(
                    `${det.label} ${(confidence * 100).toFixed(0)}%`,
                    px + 2,
                    py - 5
                );
                drawnCount++;
            } catch (e) {
                log(`❌ Error drawing detection: ${e}`, 'error');
            }
        });
        
        log(`✅ Drew ${drawnCount} bounding boxes on canvas for feed ${feedId}`, 'success');
    }
    
    /**
     * Test function to manually test canvas overlay
     * Call this from browser console: testOverlay()
     */
    // Expose functions globally for testing
    window.handleYoloDetection = handleYoloDetection;
    window.drawDetections = drawDetections;
    
    window.testOverlay = function() {
        const feedId = Array.from(subscriberHandlesByFeed.keys())[0];
        if (!feedId) {
            log('No active feed to test overlay on', 'error');
            return;
        }
        log(`🧪 Testing overlay for feed ${feedId}`, 'info');
        
        // Create a test detection
        const testDetection = {
            feedId: feedId,
            timestamp: Date.now(),
            detections: [
                {
                    label: 'test',
                    confidence: 0.95,
                    bbox: [0.1, 0.1, 0.3, 0.3] // x, y, width, height (normalized)
                },
                {
                    label: 'test2',
                    confidence: 0.85,
                    bbox: [0.6, 0.6, 0.2, 0.2]
                }
            ]
        };
        
        handleYoloDetection(testDetection);
        log('✅ Test overlay drawn - you should see 2 green boxes', 'success');
    };
    
    // COMMENTED OUT DURING TESTING - Prevents session destruction on page refresh
    // window.addEventListener('beforeunload', cleanup);
    
    window.addEventListener('load', function() {
        log('Page loaded, starting Janus initialization...', 'info');
        try {
            initJanus();
            // Connect to YOLO WebSocket
            connectYoloWebSocket();
        } catch (error) {
            fail('Initialization failed', error);
        }
    });
    
    // Expose discovery handle globally for debugging
    window.janusTest = {
        cleanup: cleanup,
        getSession: () => session,
        getDiscoveryHandle: () => discoveryHandle,
        getPluginHandle: () => discoveryHandle,
        getJanus: () => janus,
        getSubscribedFeedId: () => subscribedFeedId,
        isSubscribed: () => isSubscribed,
        getSessionReady: () => sessionReady,
        isDestroying: () => destroying
    };
    
    // Expose frame capture functions globally for testing
    window.startFrameCapture = function(feedId) {
        const videoEl = subscriberVideoElByFeed.get(feedId);
        if (!videoEl) {
            console.error(`No video element found for feed ${feedId}`);
            return;
        }
        startFrameCapture(videoEl, feedId);
    };
    
    window.stopFrameCapture = stopFrameCapture;
    
})();