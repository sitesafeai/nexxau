'use client';

import { useState, useEffect } from 'react';
import { CldUploadWidget } from 'next-cloudinary';
import { PhotoIcon } from '@heroicons/react/24/outline';

interface ImageUploadProps {
    onUploadComplete: (url: string) => void;
    folder?: string;
}

export default function ImageUpload({ onUploadComplete, folder = 'blog' }: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [cloudName, setCloudName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        if (!cloudName) {
            setError('Cloudinary configuration is missing');
            return;
        }
        setCloudName(cloudName);
    }, []);

    if (error) {
        return (
            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-red-300 px-6 py-10">
                <div className="text-center">
                    <PhotoIcon className="mx-auto h-12 w-12 text-red-300" aria-hidden="true" />
                    <div className="mt-4 flex text-sm leading-6 text-red-600">
                        <p>{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <CldUploadWidget
            uploadPreset="nexxau"
            options={{
                maxFiles: 1,
                resourceType: 'image',
                folder,
                showAdvancedOptions: false,
                sources: ['local', 'url'],
                styles: {
                    palette: {
                        window: '#FFFFFF',
                        windowBorder: '#90A0B3',
                        tabIcon: '#0078FF',
                        menuIcons: '#5A616A',
                        textDark: '#000000',
                        textLight: '#FFFFFF',
                        link: '#0078FF',
                        action: '#FF620C',
                        inactiveTabIcon: '#0E2F5A',
                        error: '#F44235',
                        inProgress: '#0078FF',
                        complete: '#20B832',
                        sourceBg: '#E4EBF1',
                    },
                    fonts: {
                        default: {
                            active: true,
                        },
                    },
                },
            }}
            onUpload={(result: any) => {
                if (result.event === 'success') {
                    onUploadComplete(result.info.secure_url);
                } else if (result.event === 'error') {
                    setError('Failed to upload image. Please try again.');
                }
                setIsUploading(false);
            }}
            onOpen={() => {
                setIsUploading(true);
                setError(null);
            }}
        >
            {({ open }) => (
                <div
                    onClick={() => open()}
                    className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10 cursor-pointer hover:bg-gray-50"
                >
                    <div className="text-center">
                        <PhotoIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                        <div className="mt-4 flex text-sm leading-6 text-gray-600">
                            <span className="relative rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500">
                                {isUploading ? 'Uploading...' : 'Upload a file'}
                            </span>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs leading-5 text-gray-600">PNG, JPG, GIF up to 10MB</p>
                    </div>
                </div>
            )}
        </CldUploadWidget>
    );
} 