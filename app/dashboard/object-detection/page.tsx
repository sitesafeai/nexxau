'use client';

import { useState } from 'react';
import { CameraIcon } from '@heroicons/react/24/outline';
import VideoFeed from "@/src/components/dashboard/VideoFeed";
import Image from 'next/image';

interface Detection {
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export default function ObjectDetectionPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDetect = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('http://localhost:8000/api/detect', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Detection failed');
      }

      const data = await response.json();
      setDetections(data.detections);
      setPreview(`data:image/jpeg;base64,${data.image}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Object Detection Test</h1>
      
      <div className="grid grid-cols-1 gap-8">
        {/* Video Feed */}
        <VideoFeed />

        {/* Image Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Upload Image</h2>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <CameraIcon className="h-5 w-5 mr-2" />
                  Select Image
                </label>
              </div>
              
              <button
                onClick={handleDetect}
                disabled={!selectedFile || isLoading}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Detecting...' : 'Detect Objects'}
              </button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Preview</h2>
            {preview ? (
              <div className="relative">
                <Image
                  src={preview}
                  alt="Preview"
                  className="w-full h-auto rounded-lg"
                  width={500}
                  height={300}
                  objectFit="contain"
                />
                {detections.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Detections:</h3>
                    <ul className="space-y-2">
                      {detections.map((det, index) => (
                        <li key={index} className="text-sm">
                          {det.class} (Confidence: {(det.confidence * 100).toFixed(1)}%)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No image selected
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
} 