import axios from 'axios';

export async function testOnvifConnection(onvifUrl: string, username: string, password: string) {
  try {
    const response = await axios.get(`${onvifUrl}/onvif/device_service`, {
      auth: {
        username,
        password
      },
      headers: {
        'Content-Type': 'application/soap+xml'
      },
      timeout: 5000
    });
    
    return {
      success: true,
      data: {
        status: response.status,
        headers: response.headers
      }
    };
  } catch (error) {
    console.error('ONVIF connection error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 