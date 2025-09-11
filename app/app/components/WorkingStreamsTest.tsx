import React, { useState, useEffect } from 'react';
import CameraFeed from './CameraFeed'; // Adjust the import path as needed

// Working test streams as of 2024/2025
const WORKING_STREAMS = [
  {
    name: 'Apple Test Stream (Bipbop 4x3)',
    url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8',
    description: 'Apple\'s official test stream - very reliable'
  },
  {
    name: 'Apple Test Stream (Bipbop 16x9)',
    url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8',
    description: 'Apple\'s widescreen test stream'
  },
  {
    name: 'Cloudflare Stream Sample',
    url: 'https://customer-m033z5x00ks6nunl.cloudflarestream.com/b236bde30eb07b9d01318940e5fc3eda/manifest/video.m3u8',
    description: 'Cloudflare public demo stream'
  },
  {
    name: 'Wowza Sample Stream',
    url: 'https://wowzaec2demo.streamlock.net/live/bigbuckbunny/playlist.m3u8',
    description: 'Wowza demo stream (may not always be available)'
  },
  {
    name: 'RTSP People Stream (via HLS)',
    url: 'rtsp://rtspstream:eExmoJQ2QwuuJyBYDWtLo@zephyr.rtsp.stream/people',
    description: 'Live people detection stream - requires RTSP to HLS conversion'
  },
  {
    name: 'People Stream (HLS via RTSP Server)',
    url: 'http://localhost:8888/streams/people/index.m3u8',
    description: 'Live people detection stream converted to HLS via RTSP server'
  },
  {
    name: 'Alternative People Stream',
    url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8',
    description: 'Alternative test stream for people detection testing'
  }
];

const WorkingStreamsTest: React.FC = () => {
  const [selectedStream, setSelectedStream] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [useCustom, setUseCustom] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  // Set initial stream after component mounts to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    setSelectedStream(WORKING_STREAMS[0].url);
  }, []);

  const handleStreamChange = (streamUrl: string) => {
    setSelectedStream(streamUrl);
    setUseCustom(false);
  };

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      setSelectedStream(customUrl.trim());
      setUseCustom(true);
    }
  };

  const testStreamUrl = async (url: string) => {
    try {
      console.log(`Testing stream: ${url}`);
      const response = await fetch(url);
      const text = await response.text();
      
      if (response.ok && text.includes('#EXTM3U')) {
        console.log(`✅ Stream is valid: ${url}`);
        console.log('Manifest preview:', text.substring(0, 200) + '...');
        return true;
      } else {
        console.log(`❌ Invalid stream: ${url}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error testing stream ${url}:`, error);
      return false;
    }
  };

  const testAllStreams = async () => {
    console.log('=== Testing all streams ===');
    for (const stream of WORKING_STREAMS) {
      await testStreamUrl(stream.url);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  if (!mounted) {
    return (
      <div className="working-streams-test p-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">HLS Stream Testing</h1>
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="working-streams-test p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">HLS Stream Testing</h1>
      
      {/* Stream Selector */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-lg font-semibold mb-4">Select a Test Stream:</h2>
        
        <div className="space-y-2 mb-4">
          {WORKING_STREAMS.map((stream, index) => (
            <div key={index} className="flex items-start space-x-2">
              <input
                type="radio"
                id={`stream-${index}`}
                name="stream"
                checked={selectedStream === stream.url && !useCustom}
                onChange={() => handleStreamChange(stream.url)}
                className="mt-1"
              />
              <label htmlFor={`stream-${index}`} className="flex-1 cursor-pointer">
                <div className="font-medium text-blue-600">{stream.name}</div>
                <div className="text-sm text-gray-600">{stream.description}</div>
                <div className="text-xs text-gray-500 font-mono break-all">{stream.url}</div>
              </label>
            </div>
          ))}
        </div>

        {/* Custom URL */}
        <form onSubmit={handleCustomUrlSubmit} className="mt-4 p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-2">
            Or test your own stream URL:
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/stream.m3u8"
              className="flex-1 p-2 border rounded"
            />
            <button 
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Test Custom
            </button>
          </div>
          {useCustom && (
            <div className="mt-2 text-sm text-blue-600">
              Using custom URL: {selectedStream}
            </div>
          )}
        </form>

        {/* Test Controls */}
        <div className="mt-4 flex gap-2">
          <button 
            onClick={testAllStreams}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Test All Streams (Check Console)
          </button>
          <button 
            onClick={() => testStreamUrl(selectedStream)}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            Test Selected Stream
          </button>
        </div>
      </div>

      {/* Video Player */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Current Stream:</h2>
        <div className="border rounded p-4 bg-gray-50">
          <div className="mb-2 text-sm">
            <strong>URL:</strong> <span className="font-mono text-blue-600">{selectedStream}</span>
          </div>
          
          <CameraFeed
            streamUrl={selectedStream}
            className="w-full max-w-2xl"
            autoPlay={false}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded">
        <h3 className="font-semibold text-blue-800 mb-2">Testing Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
          <li>Select one of the working streams above</li>
          <li>Click "Test Selected Stream" to verify the stream URL is accessible</li>
          <li>Check the browser console for detailed logs</li>
          <li>The video should load and be playable</li>
          <li>If a stream doesn't work, try another one</li>
        </ol>
        
        <div className="mt-3 p-3 bg-yellow-100 rounded">
          <strong className="text-yellow-800">Note:</strong>
          <span className="text-yellow-700 ml-1">
            The original MUX test stream (https://test-streams.mux.dev/bbb-360p.m3u8) is returning 404. 
            Use one of the working streams above instead.
          </span>
        </div>
      </div>
    </div>
  );
};

export default WorkingStreamsTest;
