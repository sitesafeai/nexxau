const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8888;

// Enable CORS for your React app
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true
}));

// Serve static HLS files
app.use('/streams', express.static(path.join(__dirname, 'streams')));

// Store active FFmpeg processes
const activeStreams = new Map();

// Convert RTSP to HLS
async function convertRTSPToHLS(rtspUrl, streamName) {
  const outputDir = path.join(__dirname, 'streams', streamName);
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'index.m3u8');
  
  // FFmpeg command to convert RTSP to HLS
  const ffmpegArgs = [
    '-i', rtspUrl,
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-ac', '1',
    '-strict', '-2',
    '-crf', '18',
    '-profile:v', 'baseline',
    '-maxrate', '400k',
    '-bufsize', '1835k',
    '-pix_fmt', 'yuv420p',
    '-hls_flags', 'delete_segments+append_list',
    '-f', 'hls',
    '-hls_time', '2',
    '-hls_list_size', '5',
    '-hls_allow_cache', '0',
    '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
    outputPath
  ];

  console.log(`Starting FFmpeg conversion for ${streamName}`);
  console.log(`RTSP URL: ${rtspUrl}`);
  console.log(`Output: ${outputPath}`);

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
  
  ffmpegProcess.stdout.on('data', (data) => {
    console.log(`FFmpeg stdout: ${data}`);
  });

  ffmpegProcess.stderr.on('data', (data) => {
    console.log(`FFmpeg stderr: ${data}`);
  });

  ffmpegProcess.on('close', (code) => {
    console.log(`FFmpeg process exited with code ${code}`);
    activeStreams.delete(streamName);
  });

  ffmpegProcess.on('error', (error) => {
    console.error(`FFmpeg error: ${error}`);
    activeStreams.delete(streamName);
  });

  activeStreams.set(streamName, ffmpegProcess);
  return outputPath;
}

// API Routes
app.post('/api/streams/start', express.json(), async (req, res) => {
  try {
    const { rtspUrl, streamName } = req.body;
    
    if (!rtspUrl || !streamName) {
      return res.status(400).json({ error: 'rtspUrl and streamName are required' });
    }

    // Stop existing stream if running
    if (activeStreams.has(streamName)) {
      const process = activeStreams.get(streamName);
      process.kill('SIGTERM');
      activeStreams.delete(streamName);
    }

    await convertRTSPToHLS(rtspUrl, streamName);
    
    res.json({ 
      success: true, 
      hlsUrl: `http://localhost:${PORT}/streams/${streamName}/index.m3u8`,
      message: 'Stream conversion started' 
    });
  } catch (error) {
    console.error('Error starting stream:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/streams/stop', express.json(), (req, res) => {
  try {
    const { streamName } = req.body;
    
    if (activeStreams.has(streamName)) {
      const process = activeStreams.get(streamName);
      process.kill('SIGTERM');
      activeStreams.delete(streamName);
      res.json({ success: true, message: 'Stream stopped' });
    } else {
      res.status(404).json({ error: 'Stream not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/streams/status', (req, res) => {
  const streams = Array.from(activeStreams.keys());
  res.json({ activeStreams: streams });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'RTSP-HLS server is running', port: PORT });
});

// Serve the people detection stream (your specific case)
app.get('/people/index.m3u8', (req, res) => {
  const streamPath = path.join(__dirname, 'streams', 'people', 'index.m3u8');
  
  if (fs.existsSync(streamPath)) {
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(streamPath);
  } else {
    res.status(404).json({ error: 'Stream not found. Make sure the conversion is running.' });
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  activeStreams.forEach((process, streamName) => {
    console.log(`Stopping stream: ${streamName}`);
    process.kill('SIGTERM');
  });
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`RTSP-HLS server running on http://localhost:${PORT}`);
  console.log(`Test the server: curl http://localhost:${PORT}/api/test`);
});

module.exports = app;
