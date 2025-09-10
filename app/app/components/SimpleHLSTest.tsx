import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';

const SimpleHLSTest: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (videoRef.current) {
      const video = videoRef.current;
      const streamUrl = 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8';
      
      console.log('=== Starting Simple HLS Test ===');
      console.log('HLS supported:', Hls.isSupported());
      console.log('Stream URL:', streamUrl);
      
      if (Hls.isSupported()) {
        const hls = new Hls({
          debug: true,
          enableWorker: true,
        });
        
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('✅ Media attached successfully');
        });
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('✅ Manifest parsed successfully');
          video.play().catch(e => console.log('Play prevented:', e));
        });
        
        hls.on(Hls.Events.LEVEL_LOADED, () => {
          console.log('✅ Level loaded');
        });
        
        hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
          console.log('✅ Fragment loaded:', data.frag.url);
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('❌ HLS Error:', data);
        });
        
        console.log('Loading source...');
        hls.loadSource(streamUrl);
        
        console.log('Attaching media...');
        hls.attachMedia(video);
        
        return () => {
          console.log('Cleaning up simple test');
          hls.destroy();
        };
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('Using native HLS support');
        video.src = streamUrl;
        video.play().catch(e => console.log('Native play prevented:', e));
      } else {
        console.error('HLS not supported');
      }
    }
  }, []);

  if (!mounted) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Simple HLS Test</h2>
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Simple HLS Test</h2>
      <video
        ref={videoRef}
        controls
        muted
        playsInline
        style={{
          width: '100%',
          maxWidth: '600px',
          backgroundColor: '#000'
        }}
        onLoadStart={() => console.log('📹 Video load started')}
        onLoadedData={() => console.log('📹 Video data loaded')}
        onCanPlay={() => console.log('📹 Video can play')}
        onPlay={() => console.log('📹 Video playing')}
        onError={(e) => console.error('📹 Video error:', e)}
      />
      <div className="mt-4 text-sm">
        <p>Check console for detailed logs</p>
        <p>Stream: https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8</p>
      </div>
    </div>
  );
};

export default SimpleHLSTest;
