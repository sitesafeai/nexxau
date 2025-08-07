'use client';

import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface CameraFeedProps {
  streamUrl: string;
}

const isMjpeg = (url: string) =>
  url.endsWith('/video_feed') || url.endsWith('.mjpg') || url.endsWith('.mjpeg');

const CameraFeed: React.FC<CameraFeedProps> = ({ streamUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!streamUrl) {
    return <div className="text-gray-400">No stream URL</div>;
  }

  if (isMjpeg(streamUrl)) {
    return (
      <img
        src={streamUrl}
        alt="MJPEG Stream"
        style={{ width: '100%', height: 'auto', borderRadius: 8 }}
        crossOrigin="anonymous"
      />
    );
  }

  // HLS.js logic for .m3u8 streams
  useEffect(() => {
    if (!streamUrl.endsWith('.m3u8')) return;
    let hls: Hls | null = null;
    const video = videoRef.current;
    if (video && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          hls?.destroy();
        }
      });
    } else if (video) {
      video.src = streamUrl;
    }
    return () => {
      hls?.destroy();
    };
  }, [streamUrl]);

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      muted
      style={{ width: '100%', height: 'auto', borderRadius: 8 }}
    />
  );
};

export default CameraFeed; 