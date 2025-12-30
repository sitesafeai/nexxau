/**
 * PHASE 3: Frontend Camera Test UI (Minimal)
 * 
 * This component surfaces backend camera testing to the user.
 * It is minimal and focused - no global state, no polling, no streaming.
 * 
 * Responsibilities:
 * - Display test button
 * - Show test results (success/failure, snapshot, error)
 * - Call POST /api/cameras/test
 * 
 * Constraints:
 * - No global state (Zustand/Redux)
 * - No polling
 * - No streaming
 * - No camera credentials in React state
 * - If backend works, this must work
 */

'use client';

import { useState } from 'react';
import { CameraProtocol } from '@/app/lib/camera/types';

interface TestResult {
  success: boolean;
  latencyMs: number | null;
  snapshot: string | null;
  error: string | null;
}

export default function CameraTestTab() {
  const [streamUrl, setStreamUrl] = useState('');
  const [protocol, setProtocol] = useState<CameraProtocol>('rtsp');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const handleTest = async () => {
    if (!streamUrl.trim()) {
      setTestResult({
        success: false,
        latencyMs: null,
        snapshot: null,
        error: 'Please enter a stream URL'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/cameras/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamUrl: streamUrl.trim(),
          protocol,
        }),
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error: any) {
      setTestResult({
        success: false,
        latencyMs: null,
        snapshot: null,
        error: error.message || 'Failed to test camera connection'
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 p-6">
        <h2 className="text-xl font-bold text-white mb-6">Test Camera Connection</h2>
        
        {/* Input Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Stream URL
            </label>
            <input
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="rtsp://user:pass@192.168.1.100:554/stream1"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Protocol
            </label>
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value as CameraProtocol)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="rtsp">RTSP</option>
              <option value="hls">HLS</option>
              <option value="webrtc">WebRTC</option>
            </select>
          </div>

          <button
            onClick={handleTest}
            disabled={isTesting || !streamUrl.trim()}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
          >
            {isTesting ? 'Testing...' : 'Test Camera'}
          </button>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className={`rounded-lg border p-4 ${
            testResult.success
              ? 'bg-green-900/20 border-green-700/50'
              : 'bg-red-900/20 border-red-700/50'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {testResult.success ? (
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className={`font-semibold ${
                testResult.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {testResult.success ? 'Connection Successful' : 'Connection Failed'}
              </span>
            </div>

            {testResult.latencyMs !== null && (
              <div className="text-sm text-slate-300 mb-2">
                Latency: <span className="font-mono">{testResult.latencyMs}ms</span>
              </div>
            )}

            {testResult.snapshot && (
              <div className="mt-4">
                <p className="text-sm text-slate-300 mb-2">Snapshot:</p>
                <img
                  src={`data:image/png;base64,${testResult.snapshot}`}
                  alt="Camera snapshot"
                  className="max-w-full h-auto rounded border border-slate-600"
                />
              </div>
            )}

            {testResult.error && (
              <div className="mt-3 p-3 bg-slate-900/50 rounded border border-slate-700">
                <p className="text-sm text-red-400 font-mono">{testResult.error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="bg-slate-800/30 backdrop-blur rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-3">About Camera Testing</h3>
        <div className="space-y-2 text-sm text-slate-400">
          <p>This tool tests camera connectivity by attempting a real connection to the provided stream URL.</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>RTSP:</strong> Tests TCP connection (frame capture requires ffmpeg)</li>
            <li><strong>HLS:</strong> Validates playlist accessibility</li>
            <li><strong>WebRTC:</strong> Validates URL format (frame capture requires browser APIs)</li>
          </ul>
          <p className="mt-3 text-slate-500 text-xs">
            Note: This is a connectivity test only. Live streaming is available in the streaming viewer.
          </p>
        </div>
      </div>
    </div>
  );
}

