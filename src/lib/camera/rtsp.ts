interface RtspConfig {
  name: string;
  rtspUrl: string;
}

export async function testRtspConnection(config: RtspConfig): Promise<void> {
  // TODO: Implement actual RTSP stream connection test
  // This is a placeholder that simulates a connection test
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (config.name && config.rtspUrl) {
        resolve();
      } else {
        reject(new Error('Invalid RTSP configuration'));
      }
    }, 1000);
  });
} 