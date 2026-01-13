/**
 * Janus VideoRoom Publisher Test
 * Connects to Janus server and publishes webcam to VideoRoom 1234
 */

(function() {
    'use strict';

    // Configuration
    const JANUS_SERVER = 'http://192.168.64.4:8088/janus';
    const ROOM_ID = 1234;
    
    // State
    let janus = null;
    let session = null;
    let pluginHandle = null;
    let localVideo = null;
    let localStream = null;
    let isPublishing = false;
    
    // DOM elements
    const statusEl = document.getElementById('status');
    const consoleLogEl = document.getElementById('console-log');
    const videoContainerEl = document.getElementById('video-container');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    
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
        
        // Also log to browser console
        const consoleMethod = type === 'error' ? console.error : 
                              type === 'success' ? console.log : 
                              console.info;
        consoleMethod(`[Janus Publisher Test] ${message}`);
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
        
        // Check WebRTC support
        if (!Janus.isWebrtcSupported()) {
            fail('WebRTC is not supported in this browser');
        }
        
        log('WebRTC support confirmed', 'success');
        
        // Initialize Janus
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
     * Create Janus session
     */
    function createSession() {
        log('Step 2: Creating Janus session...', 'info');
        updateStatus('Creating session...', 'info');
        
        janus = new Janus({
            server: JANUS_SERVER,
            success: function() {
                log('Session created successfully', 'success');
                session = janus;
                attachToVideoRoom();
            },
            error: function(error) {
                fail('Failed to create Janus session', error);
            },
            destroyed: function() {
                log('Session destroyed', 'info');
            }
        });
        
        log('new Janus() called, waiting for success callback...', 'info');
    }
    
    /**
     * Attach to VideoRoom plugin
     */
    function attachToVideoRoom() {
        log('Step 3: Attaching to VideoRoom plugin...', 'info');
        updateStatus('Attaching to VideoRoom plugin...', 'info');
        
        if (!session) {
            fail('No active session. Cannot attach to plugin.');
        }
        
        session.attach({
            plugin: 'janus.plugin.videoroom',
            success: function(handle) {
                log('Successfully attached to VideoRoom plugin', 'success');
                pluginHandle = handle;
                log(`Plugin handle assigned: ${pluginHandle ? 'YES' : 'NO'}`, pluginHandle ? 'success' : 'error');
                if (!pluginHandle) {
                    fail('Plugin handle is null after attachment');
                }
                log(`Plugin handle ID: ${pluginHandle.getId()}`, 'info');
                updateStatus('Ready to publish. Click "Start Publishing" to begin.', 'success');
                startBtn.disabled = false;
            },
            error: function(error) {
                fail('Failed to attach to VideoRoom plugin', error);
            },
            iceState: function(state) {
                log(`ICE state changed: ${state}`, 'info');
            },
            webrtcState: function(on) {
                log(`WebRTC state: ${on ? 'UP' : 'DOWN'}`, on ? 'success' : 'error');
                if (!on && isPublishing) {
                    updateStatus('WebRTC connection lost', 'error');
                }
            },
            onmessage: function(msg, jsep) {
                log(`Received message from plugin: ${JSON.stringify(msg)}`, 'info');
                
                if (jsep) {
                    log(`Received JSEP answer: ${JSON.stringify(jsep)}`, 'info');
                    handleRemoteJsep(jsep);
                }
                
                // Handle different message types
                if (msg.videoroom) {
                    handleVideoRoomMessage(msg);
                }
            },
            onlocaltrack: function(track, on) {
                log(`Local track ${on ? 'added' : 'removed'}: ${track.kind} (id: ${track.id})`, on ? 'success' : 'info');
                if (!on) {
                    log(`WARNING: Local ${track.kind} track was removed - this may cause video playback issues`, 'error');
                    // Check if this is expected (e.g., during cleanup) or unexpected
                    if (isPublishing && localStream) {
                        const stillActive = localStream.getTracks().filter(t => t.id === track.id && t.readyState === 'live');
                        if (stillActive.length === 0) {
                            log(`Track ${track.id} is no longer in the stream`, 'error');
                        }
                    }
                }
            },
            onremotetrack: function(track, mid, on) {
                log(`Remote track ${on ? 'added' : 'removed'}: ${track.kind} (mid: ${mid})`, 'info');
            },
            ondataopen: function() {
                log('Data channel opened', 'success');
            },
            ondata: function(data) {
                log(`Data received: ${data}`, 'info');
            },
            oncleanup: function() {
                log('Plugin handle cleanup', 'info');
            }
        });
        
        log('session.attach() called, waiting for success callback...', 'info');
    }
    
    /**
     * Get user media (webcam + microphone)
     */
    function getUserMedia() {
        log('Step 4: Requesting user media (webcam + microphone)...', 'info');
        updateStatus('Requesting webcam access...', 'info');
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            fail('getUserMedia is not supported in this browser');
        }
        
        navigator.mediaDevices.getUserMedia({
            audio: true,
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            }
        })
        .then(function(stream) {
            log('User media obtained successfully', 'success');
            log(`Audio tracks: ${stream.getAudioTracks().length}`, 'info');
            log(`Video tracks: ${stream.getVideoTracks().length}`, 'info');
            
            localStream = stream;
            displayLocalVideo(stream);
            joinRoomAsPublisher();
        })
        .catch(function(error) {
            fail('Failed to get user media', error);
        });
    }
    
    /**
     * Display local video preview
     */
    function displayLocalVideo(stream) {
        log('Step 5: Displaying local video preview...', 'info');
        
        if (!localVideo) {
            localVideo = document.getElementById('local-video');
            if (!localVideo) {
                fail('Local video element not found in DOM');
            }
        }
        
        // CRITICAL: Set muted BEFORE assigning srcObject for autoplay to work
        log('Setting video element muted attribute to true...', 'info');
        localVideo.muted = true;
        localVideo.setAttribute('muted', 'true');
        log('Video element muted: ' + localVideo.muted, 'info');
        
        // Ensure autoplay and playsinline are set
        localVideo.autoplay = true;
        localVideo.setAttribute('autoplay', 'true');
        localVideo.playsInline = true;
        localVideo.setAttribute('playsinline', 'true');
        
        log('Video element attributes set: muted=' + localVideo.muted + ', autoplay=' + localVideo.autoplay + ', playsInline=' + localVideo.playsInline, 'info');
        
        // Assign stream
        log('Assigning stream to video element...', 'info');
        localVideo.srcObject = stream;
        log('Local video stream attached to <video> element', 'success');
        
        // Error handling - must be set BEFORE play()
        localVideo.onerror = function(error) {
            const errorDetails = {
                error: error,
                errorCode: localVideo.error ? localVideo.error.code : 'unknown',
                errorMessage: localVideo.error ? localVideo.error.message : 'unknown',
                networkState: localVideo.networkState,
                readyState: localVideo.readyState
            };
            log('Local video playback error: ' + JSON.stringify(errorDetails), 'error');
            console.error('Local video error details:', errorDetails);
            updateStatus('ERROR: Local video playback error - check console for details', 'error');
            // Don't throw - allow recovery
        };
        
        localVideo.onloadedmetadata = function() {
            log('Local video metadata loaded', 'success');
            log(`Video dimensions: ${localVideo.videoWidth}x${localVideo.videoHeight}`, 'info');
            
            // Explicitly start playback with error handling
            log('Attempting to start video playback...', 'info');
            localVideo.play()
                .then(function() {
                    log('Local video started playing successfully', 'success');
                    updateStatus('Local video preview active', 'success');
                })
                .catch(function(error) {
                    log('Video play() failed: ' + error.message, 'error');
                    console.error('Video play() error:', error);
                    updateStatus('WARNING: Video autoplay failed - user interaction may be required', 'error');
                    // Try unmuting and playing again (some browsers require this)
                    if (localVideo.muted) {
                        log('Attempting to play with unmuted audio...', 'info');
                        localVideo.muted = false;
                        localVideo.play()
                            .then(function() {
                                log('Video playing after unmuting', 'success');
                                localVideo.muted = true; // Mute again after starting
                            })
                            .catch(function(err) {
                                log('Video play() failed even after unmuting: ' + err.message, 'error');
                            });
                    }
                });
        };
        
        localVideo.onplay = function() {
            log('Local video started playing (onplay event)', 'success');
        };
        
        localVideo.onpause = function() {
            log('Local video paused', 'info');
        };
        
        localVideo.onended = function() {
            log('Local video ended', 'info');
        };
        
        // Monitor track removal
        if (stream) {
            stream.getVideoTracks().forEach(function(track) {
                track.onended = function() {
                    log('Video track ended: ' + track.id, 'info');
                };
                track.onmute = function() {
                    log('Video track muted: ' + track.id, 'info');
                };
                track.onunmute = function() {
                    log('Video track unmuted: ' + track.id, 'info');
                };
            });
            
            stream.getAudioTracks().forEach(function(track) {
                track.onended = function() {
                    log('Audio track ended: ' + track.id, 'info');
                };
                track.onmute = function() {
                    log('Audio track muted: ' + track.id, 'info');
                };
                track.onunmute = function() {
                    log('Audio track unmuted: ' + track.id, 'info');
                };
            });
        }
    }
    
    /**
     * Join VideoRoom as publisher
     */
    function joinRoomAsPublisher() {
        log('Step 6: Joining VideoRoom as publisher...', 'info');
        updateStatus(`Joining room ${ROOM_ID} as publisher...`, 'info');
        
        if (!pluginHandle) {
            fail('No plugin handle. Cannot join room.');
        }
        
        // Verify handle is valid
        try {
            const handleId = pluginHandle.getId();
            log(`Verifying plugin handle ID: ${handleId}`, 'info');
        } catch (error) {
            fail('Plugin handle is invalid or not properly attached', error);
        }
        
        if (!localStream) {
            fail('No local stream. Cannot publish.');
        }
        
        const joinRequest = {
            request: 'join',
            room: ROOM_ID,
            ptype: 'publisher',
            id: Math.floor(Math.random() * 1000000),
            display: 'Publisher Test ' + Date.now()
        };
        
        log(`Sending join request: ${JSON.stringify(joinRequest)}`, 'info');
        
        // Send join request
        // NOTE: Do NOT read result.videoroom here - all events come through onmessage
        pluginHandle.send({
            message: joinRequest,
            success: function(result) {
                // Success callback only confirms message was sent
                // ALL VideoRoom events come through onmessage, not here
                log(`Join message sent successfully`, 'success');
                log(`Response (for reference only): ${JSON.stringify(result)}`, 'info');
                log('NOTE: VideoRoom events will arrive in onmessage callback', 'info');
                // publishStream() will be called from onmessage when 'joined' event is received
            },
            error: function(error) {
                fail('Failed to send join request', error);
            }
        });
    }
    
    /**
     * Publish the stream
     */
    function publishStream() {
        log('Step 7: Publishing stream...', 'info');
        updateStatus('Publishing stream...', 'info');
        
        if (!pluginHandle) {
            fail('No plugin handle. Cannot publish.');
        }
        
        // Verify handle is valid
        try {
            const handleId = pluginHandle.getId();
            log(`Verifying plugin handle ID before publish: ${handleId}`, 'info');
        } catch (error) {
            fail('Plugin handle is invalid before publish', error);
        }
        
        if (!localStream) {
            fail('No local stream. Cannot publish.');
        }
        
        // Create offer to publish
        pluginHandle.createOffer({
            media: {
                audioRecv: false,
                videoRecv: false,
                audioSend: true,
                videoSend: true
            },
            success: function(jsep) {
                log('Successfully created offer', 'success');
                log(`Offer JSEP: ${JSON.stringify(jsep)}`, 'info');
                
                // Send publish request with offer
                const publishRequest = {
                    request: 'configure',
                    audio: true,
                    video: true
                };
                
                log(`Sending publish request: ${JSON.stringify(publishRequest)}`, 'info');
                
                // Send publish request with offer
                // NOTE: Do NOT read result.videoroom here - all events come through onmessage
                pluginHandle.send({
                    message: publishRequest,
                    jsep: jsep,
                    success: function(result) {
                        // Success callback only confirms message was sent
                        // ALL VideoRoom events come through onmessage, not here
                        log(`Publish message sent successfully`, 'success');
                        log(`Response (for reference): ${JSON.stringify(result)}`, 'info');
                        log('NOTE: VideoRoom events will arrive in onmessage callback', 'info');
                        // Publishing state will be updated in onmessage when 'configured' event is received
                    },
                    error: function(error) {
                        fail('Failed to send publish request', error);
                    }
                });
            },
            error: function(error) {
                fail('Failed to create offer', error);
            }
        });
    }
    
    /**
     * Handle remote JSEP (SDP answer)
     */
    function handleRemoteJsep(jsep) {
        log('Step 8: Handling remote JSEP answer...', 'info');
        updateStatus('Processing WebRTC answer...', 'info');
        
        if (!pluginHandle) {
            fail('No plugin handle. Cannot handle JSEP.');
        }
        
        // Verify handle is valid
        try {
            const handleId = pluginHandle.getId();
            log(`Verifying plugin handle ID before handleRemoteJsep: ${handleId}`, 'info');
        } catch (error) {
            fail('Plugin handle is invalid before handleRemoteJsep', error);
        }
        
        log(`JSEP type: ${jsep.type}, SDP length: ${jsep.sdp ? jsep.sdp.length : 0}`, 'info');
        
        pluginHandle.handleRemoteJsep({
            jsep: jsep,
            success: function() {
                log('Successfully handled remote JSEP answer', 'success');
                log('WebRTC negotiation complete', 'success');
                updateStatus('WebRTC connection established - Publishing!', 'success');
            },
            error: function(error) {
                fail('Failed to handle remote JSEP', error);
            }
        });
    }
    
    /**
     * Handle VideoRoom plugin messages
     * ALL VideoRoom events come through here - never in send() success callbacks
     */
    function handleVideoRoomMessage(msg) {
        log(`handleVideoRoomMessage: Processing message`, 'info');
        log(`Message content: ${JSON.stringify(msg)}`, 'info');
        
        if (msg.videoroom === 'joined') {
            log('STATE: Publisher joined room successfully', 'success');
            updateStatus(`Joined room ${ROOM_ID} as publisher`, 'success');
            // Now we can publish the stream
            publishStream();
        }
        
        if (msg.videoroom === 'event') {
            log('STATE: VideoRoom event received', 'info');
            
            // Publisher configured successfully
            if (msg.configured === 'ok') {
                log('STATE: Publisher configuration confirmed', 'success');
                updateStatus('Stream published successfully', 'success');
                isPublishing = true;
                startBtn.disabled = true;
                stopBtn.disabled = false;
            }
            
            // Error handling
            if (msg.error) {
                fail(`VideoRoom error: ${msg.error}`, msg.error);
            }
        }
    }
    
    /**
     * Stop publishing
     */
    function stopPublishing() {
        log('Stopping publication...', 'info');
        updateStatus('Stopping publication...', 'info');
        
        if (!pluginHandle) {
            log('No plugin handle to detach', 'info');
            cleanup();
            return;
        }
        
        // Unpublish
        pluginHandle.send({
            message: {
                request: 'unpublish'
            },
            success: function(result) {
                log(`Unpublish response: ${JSON.stringify(result)}`, 'success');
                cleanup();
            },
            error: function(error) {
                log(`Error unpublishing: ${error}`, 'error');
                cleanup();
            }
        });
    }
    
    /**
     * Cleanup function
     */
    function cleanup() {
        log('Cleaning up...', 'info');
        isPublishing = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        
        // Clear video element FIRST (before stopping tracks)
        if (localVideo) {
            log('Clearing video element srcObject...', 'info');
            if (localVideo.srcObject) {
                // Remove error handlers to prevent errors during cleanup
                localVideo.onerror = null;
                localVideo.srcObject = null;
                log('Video element srcObject cleared', 'info');
            }
        }
        
        // Stop all tracks AFTER clearing video element
        if (localStream) {
            log('Stopping all media tracks...', 'info');
            localStream.getTracks().forEach(track => {
                if (track.readyState !== 'ended') {
                    track.stop();
                    log(`Stopped ${track.kind} track (id: ${track.id})`, 'info');
                } else {
                    log(`${track.kind} track (id: ${track.id}) already ended`, 'info');
                }
            });
            localStream = null;
        }
        
        // Detach plugin handle
        if (pluginHandle) {
            pluginHandle.detach();
            pluginHandle = null;
        }
        
        // Destroy session
        if (session) {
            session.destroy();
            session = null;
        }
        
        updateStatus('Cleaned up. Ready to start again.', 'info');
    }
    
    /**
     * Start publishing (public API)
     */
    function startPublishing() {
        if (isPublishing) {
            log('Already publishing', 'info');
            return;
        }
        
        if (!session) {
            log('No session. Reinitializing...', 'info');
            initJanus();
            return;
        }
        
        if (!pluginHandle) {
            log('No plugin handle. Reattaching...', 'info');
            attachToVideoRoom();
            // Wait for attachment before proceeding
            setTimeout(function() {
                if (!pluginHandle) {
                    fail('Plugin handle still not available after reattachment attempt');
                } else {
                    getUserMedia();
                }
            }, 1000);
            return;
        }
        
        // Verify handle is valid before proceeding
        try {
            pluginHandle.getId();
        } catch (error) {
            log('Plugin handle invalid, reattaching...', 'error');
            attachToVideoRoom();
            setTimeout(function() {
                if (!pluginHandle) {
                    fail('Plugin handle still not available after reattachment attempt');
                } else {
                    getUserMedia();
                }
            }, 1000);
            return;
        }
        
        getUserMedia();
    }
    
    // Handle page unload
    window.addEventListener('beforeunload', function() {
        if (isPublishing) {
            stopPublishing();
        } else {
            cleanup();
        }
    });
    
    // Start initialization when page loads
    window.addEventListener('load', function() {
        log('Page loaded, starting Janus initialization...', 'info');
        try {
            initJanus();
        } catch (error) {
            fail('Initialization failed', error);
        }
    });
    
    // Export for debugging and button handlers
    window.janusPublisherTest = {
        startPublishing: startPublishing,
        stopPublishing: stopPublishing,
        cleanup: cleanup,
        getSession: () => session,
        getPluginHandle: () => pluginHandle,
        getJanus: () => janus,
        getLocalStream: () => localStream,
        isPublishing: () => isPublishing
    };
    
})();

