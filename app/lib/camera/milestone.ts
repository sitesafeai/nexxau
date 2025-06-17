import axios from 'axios';

const MILESTONE_API_URL = process.env.MILESTONE_API_URL;
const MILESTONE_API_KEY = process.env.MILESTONE_API_KEY;

export async function testMilestoneConnection() {
  try {
    const response = await axios.get(`${MILESTONE_API_URL}/api/v1/status`, {
      headers: {
        'Authorization': `Bearer ${MILESTONE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Milestone connection error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getMilestoneCameras() {
  try {
    const response = await axios.get(`${MILESTONE_API_URL}/api/v1/cameras`, {
      headers: {
        'Authorization': `Bearer ${MILESTONE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching Milestone cameras:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 