import axios from 'axios';

const CLOUD_API_URL = process.env.CLOUD_API_URL;
const CLOUD_API_KEY = process.env.CLOUD_API_KEY;

export async function testCloudConnection() {
  try {
    const response = await axios.get(`${CLOUD_API_URL}/api/v1/status`, {
      headers: {
        'Authorization': `Bearer ${CLOUD_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Cloud connection error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getCloudCameras() {
  try {
    const response = await axios.get(`${CLOUD_API_URL}/api/v1/cameras`, {
      headers: {
        'Authorization': `Bearer ${CLOUD_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching cloud cameras:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 