/**
 * Janus RTSP Service - Test/Usage Examples
 * 
 * This file demonstrates how to use the Janus RTSP service functions.
 * It can be used for testing, debugging, or as a reference for integration.
 * 
 * Usage Examples:
 */

import { createRtspPublisher, destroyRtspPublisher, listRtspMounts } from './janusRtspService';

/**
 * Example 1: Create a simple RTSP mount
 */
async function exampleCreateMount() {
  try {
    const rtspUrl = 'rtsp://192.168.1.100:554/stream1';
    const feedId = await createRtspPublisher(rtspUrl);
    console.log(`✅ RTSP mount created with feed ID: ${feedId}`);
    return feedId;
  } catch (error: any) {
    console.error(`❌ Failed to create RTSP mount: ${error.message}`);
    throw error;
  }
}

/**
 * Example 2: Create and then destroy an RTSP mount
 */
async function exampleCreateAndDestroy() {
  try {
    // Create mount
    const rtspUrl = 'rtsp://camera.example.com:554/h264';
    const feedId = await createRtspPublisher(rtspUrl);
    console.log(`✅ Created mount with feed ID: ${feedId}`);

    // Wait a bit (for testing)
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Destroy mount
    await destroyRtspPublisher(feedId);
    console.log(`✅ Destroyed mount with feed ID: ${feedId}`);
  } catch (error: any) {
    console.error(`❌ Error in create/destroy cycle: ${error.message}`);
    throw error;
  }
}

/**
 * Example 3: Create RTSP mount with authentication
 */
async function exampleCreateMountWithAuth() {
  try {
    // RTSP URL with embedded credentials
    const rtspUrl = 'rtsp://username:password@192.168.1.100:554/stream1';
    const feedId = await createRtspPublisher(rtspUrl);
    console.log(`✅ RTSP mount with auth created: ${feedId}`);
    return feedId;
  } catch (error: any) {
    console.error(`❌ Failed to create authenticated RTSP mount: ${error.message}`);
    throw error;
  }
}

/**
 * Example 4: List all active RTSP mounts
 */
async function exampleListMounts() {
  try {
    const mounts = await listRtspMounts();
    console.log(`✅ Found ${mounts.length} active RTSP mounts:`);
    mounts.forEach(mount => {
      console.log(`  - Feed ID ${mount.mountpoint_id}: ${mount.rtsp_url}`);
    });
    return mounts;
  } catch (error: any) {
    console.error(`❌ Failed to list RTSP mounts: ${error.message}`);
    throw error;
  }
}

/**
 * Example 5: Error handling pattern (for API route integration)
 */
async function exampleErrorHandling() {
  try {
    const feedId = await createRtspPublisher('rtsp://invalid-url/stream');
    return { success: true, feedId };
  } catch (error: any) {
    // Check for specific error types
    if (error.message.includes('timeout')) {
      return { 
        success: false, 
        error: 'JANUS_TIMEOUT',
        message: 'Janus server did not respond in time' 
      };
    }
    
    if (error.message.includes('connect')) {
      return { 
        success: false, 
        error: 'JANUS_CONNECTION_FAILED',
        message: 'Cannot connect to Janus Admin API' 
      };
    }

    if (error.message.includes('mountpoint_id')) {
      return { 
        success: false, 
        error: 'JANUS_INVALID_RESPONSE',
        message: 'Janus returned invalid response format' 
      };
    }

    // Generic error
    return { 
      success: false, 
      error: 'JANUS_ERROR',
      message: error.message 
    };
  }
}

/**
 * Mock/stub version for testing without actual Janus server
 * 
 * This can be used in unit tests or when Janus is not available
 */
export const janusRtspServiceMock = {
  createRtspPublisher: async (rtspUrl: string): Promise<number> => {
    console.log(`[MOCK] Would create RTSP mount for: ${rtspUrl}`);
    // Return a mock feed ID
    return 12345;
  },

  destroyRtspPublisher: async (feedId: number): Promise<void> => {
    console.log(`[MOCK] Would destroy RTSP mount with feed ID: ${feedId}`);
  },

  listRtspMounts: async (): Promise<Array<{ mountpoint_id: number; rtsp_url: string; mounted: string }>> => {
    console.log('[MOCK] Would list RTSP mounts');
    return [];
  },
};

// Export examples for use in test files
export const examples = {
  createMount: exampleCreateMount,
  createAndDestroy: exampleCreateAndDestroy,
  createMountWithAuth: exampleCreateMountWithAuth,
  listMounts: exampleListMounts,
  errorHandling: exampleErrorHandling,
};

