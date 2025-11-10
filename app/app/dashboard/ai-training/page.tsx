'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Image, Download, Tag, Check, X, Loader2, Upload } from 'lucide-react';
import { useAuth } from '../../lib/use-auth';
import { formatRoleLabel } from '../../lib/roles';

export default function AITrainingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const worksiteParam = searchParams.get('worksite');
  const { userRole, isLoading } = useAuth({ requiredRole: 'SUPER_ADMIN' });
  
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'labeled' | 'unlabeled'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<string>('unlabeled');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (userRole === 'SUPER_ADMIN' && !isLoading) {
      loadImages();
    }
  }, [worksiteParam, filter, categoryFilter, userRole, isLoading]);

  useEffect(() => {
    if (userRole === 'SUPER_ADMIN' && worksiteParam) {
      loadCameras();
    }
  }, [userRole, worksiteParam]);

  const loadImages = async () => {
    if (userRole !== 'SUPER_ADMIN') return;
    try {
      setLoading(true);
      let url = '/api/training/snapshots?';
      if (worksiteParam) url += `worksiteId=${worksiteParam}&`;
      if (filter !== 'all') url += `labeled=${filter === 'labeled'}&`;
      if (categoryFilter !== 'all') url += `category=${categoryFilter}&`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setImages(data.data || []);
      }
    } catch (error) {
      console.error('Error loading training images:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCameras = async () => {
    try {
      let url = '/api/cameras?';
      if (worksiteParam) {
        url += `worksiteId=${worksiteParam}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load cameras');
      const data = await res.json();
      const list = data.data || [];
      setAvailableCameras(list);
      if (list.length > 0) {
        setSelectedCameraId(list[0].id);
      }
    } catch (error) {
      console.error('Error loading cameras for upload:', error);
      setAvailableCameras([]);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadError(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!selectedCameraId) {
      setUploadError('Select a camera to associate the training image with.');
      return;
    }
    if (!selectedFile) {
      setUploadError('Choose an image file to upload.');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);

      const base64 = await fileToBase64(selectedFile);
      const res = await fetch('/api/training/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cameraId: selectedCameraId,
          imageData: base64,
          category: uploadCategory === 'unlabeled' ? undefined : uploadCategory,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.error || 'Failed to upload image');
      }

      setSelectedFile(null);
      setUploadCategory('unlabeled');
      await loadImages();
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const categories = ['all', 'hardhat', 'safety_vest', 'person', 'forklift', 'vehicle', 'unlabeled'];

  const updateImage = async (id: string, updates: Record<string, any>) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/training/snapshots/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        await loadImages();
      } else {
        alert('Failed to update training image');
      }
    } catch (error) {
      console.error('Error updating training image:', error);
      alert('Error updating training image');
    } finally {
      setUpdating(null);
    }
  };

  const exportDataset = async () => {
    try {
      setExporting(true);
      let url = '/api/training/export?';
      if (worksiteParam) url += `worksiteId=${worksiteParam}&`;
      if (filter !== 'all') url += `labeled=${filter === 'labeled'}&`;
      if (categoryFilter !== 'all') url += `category=${categoryFilter}&`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to export dataset');

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `training-dataset-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export dataset');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700">
                <Image className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">AI Training Data</h1>
                <p className="text-gray-400 mt-1">
                  Manage images for training custom AI models • {images.length} images collected
                </p>
              </div>
            </div>

            <button
              onClick={exportDataset}
              disabled={exporting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export Dataset
                </>
              )}
            </button>
          </div>
        </div>

        {/* Upload Panel */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Training Images
              </h2>
              <p className="text-sm text-gray-400">
                Only SUPER_ADMIN can upload training data. You are logged in as {formatRoleLabel(userRole)}.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm text-gray-300">Camera</label>
              <select
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableCameras.length === 0 && (
                  <option value="">No cameras available for this worksite</option>
                )}
                {availableCameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.name} • {camera.worksite?.name || 'Worksite'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-gray-300">Category</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {['unlabeled', 'hardhat', 'safety_vest', 'person', 'forklift', 'vehicle'].map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="text-sm text-gray-300"
            />
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !selectedCameraId}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Image
                </>
              )}
            </button>
          </div>
          {selectedFile && (
            <p className="mt-2 text-xs text-gray-400">
              Selected file: {selectedFile.name} · {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          )}
          {uploadError && (
            <p className="mt-2 text-sm text-red-400">
              {uploadError}
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Status</label>
              <div className="flex gap-2">
                {['all', 'labeled', 'unlabeled'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Image className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{images.length}</div>
            <div className="text-sm text-gray-400">Total Images</div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Check className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {images.filter(i => i.labeled).length}
            </div>
            <div className="text-sm text-gray-400">Labeled</div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <X className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {images.filter(i => !i.labeled).length}
            </div>
            <div className="text-sm text-gray-400">Unlabeled</div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Tag className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {new Set(images.map(i => i.category)).size}
            </div>
            <div className="text-sm text-gray-400">Categories</div>
          </div>
        </div>

        {/* Images Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading images...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
            <Image className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Training Images Yet</h3>
            <p className="text-gray-400 mb-6">
              Use the camera icon on camera feeds to save snapshots for AI training
            </p>
            <button
              onClick={() => router.push(`/dashboard?tab=monitoring&worksite=${worksiteParam}`)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Go to Camera Monitoring
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-all group"
              >
                <div className="aspect-video bg-gray-900 relative">
                  <img
                    src={image.imageUrl}
                    alt={`Training image from ${image.camera?.name || 'camera'}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
                      e.currentTarget.alt = 'Image not available';
                    }}
                  />
                  {image.labeled && (
                    <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                      Labeled
                    </div>
                  )}
                </div>
                
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium text-sm truncate">
                      {image.camera?.name || 'Unknown Camera'}
                    </span>
                    <select
                      value={image.category || 'unlabeled'}
                      onChange={(e) => updateImage(image.id, { category: e.target.value })}
                      disabled={updating === image.id}
                      className="bg-gray-700 border border-gray-600 rounded text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {['unlabeled', 'hardhat', 'safety_vest', 'person', 'forklift', 'vehicle'].map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-gray-400 text-xs">
                    {new Date(image.createdAt).toLocaleString()}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => updateImage(image.id, { labeled: !image.labeled })}
                      disabled={updating === image.id}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        image.labeled
                          ? 'bg-green-600 text-white hover:bg-green-500'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {image.labeled ? 'Mark Unlabeled' : 'Mark Labeled'}
                    </button>

                    {updating === image.id && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-900/20 border border-blue-700/50 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-2">💡 About AI Training</h3>
          <div className="text-blue-200 text-sm space-y-2">
            <p>• Collect <strong>500-2,000 images</strong> for good model accuracy</p>
            <p>• Label images using <strong>Roboflow</strong> (free tier available)</p>
            <p>• Train custom YOLOv8 model on <strong>Google Colab</strong> (free GPU)</p>
            <p>• Expected timeline: 2-4 weeks collection + 1 day training</p>
            <p>• Result: 90-95% accuracy on construction safety detection</p>
          </div>
          <div className="mt-4 flex gap-3">
            <a
              href="https://roboflow.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
            >
              Open Roboflow →
            </a>
            <a
              href="https://colab.research.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              Open Google Colab →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

