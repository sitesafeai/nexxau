'use client';

import Image from 'next/image';

export default function CameraFeed({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <div className="relative w-full h-64 bg-gray-200 rounded-md overflow-hidden">
      {/* Using a placeholder image for now */}
      <Image
        src={src || '/placeholder-camera.png'} // Use provided src or a default placeholder
        alt={alt || 'Camera Feed Placeholder'}
        layout="fill"
        objectFit="cover"
      />
       {/* Optional: Add an overlay or controls here */}
    </div>
  );
} 