import axios from 'axios';

export async function testRtspConnection(rtspUrl: string) {
  try {
    // Note: This is a simplified test. In production, you'd want to use a proper RTSP client
    const response = await axios.get(rtspUrl, {
      timeout: 5000,
      validateStatus: (status) => status < 500 // Accept any status less than 500
    });
    
    return {
      success: true,
      data: {
        status: response.status,
        headers: response.headers
      }
    };
  } catch (error) {
    console.error('RTSP connection error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 