'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Image, Download, Tag, Check, X, Loader2, Upload, AlertTriangle, Video, FileText, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../../lib/use-auth';
import { formatRoleLabel } from '../../lib/roles';

type TabType = 'training' | 'false-positives' | 'true-positives';

interface FalsePositiveReport {
  id: string;
  alertId: string | null;
  detectionId: string | null;
  worksite: {
    id: string;
    name: string;
    company: {
      id: string;
      name: string;
    };
  } | null;
  camera: {
    id: string;
    name: string;
  } | null;
  description: string | null;
  incidentType: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  timestamp: string | null;
  reviewed: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
  trainingNotes: string | null;
  createdAt: string;
}

interface TruePositiveReport {
  id: string;
  alertId: string | null;
  detectionId: string | null;
  worksite: {
    id: string;
    name: string;
    company: {
      id: string;
      name: string;
    };
  } | null;
  camera: {
    id: string;
    name: string;
  } | null;
  description: string | null;
  incidentType: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  timestamp: string | null;
  reviewed: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
  trainingNotes: string | null;
  createdAt: string;
}

export default function AITrainingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const worksiteParam = searchParams.get('worksite');
  const { userRole, isLoading } = useAuth({ requiredRole: 'SUPER_ADMIN' });
  
  const [activeTab, setActiveTab] = useState<TabType>('training');
  
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
  
  // False Positives state
  const [falsePositives, setFalsePositives] = useState<FalsePositiveReport[]>([]);
  const [loadingFalsePositives, setLoadingFalsePositives] = useState(true);
  const [selectedFalsePositive, setSelectedFalsePositive] = useState<FalsePositiveReport | null>(null);
  const [falsePositiveNotes, setFalsePositiveNotes] = useState('');
  const [falsePositiveFilter, setFalsePositiveFilter] = useState<'all' | 'reviewed' | 'unreviewed'>('all');
  const [overrideExplanation, setOverrideExplanation] = useState('');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  
  // True Positives state
  const [truePositives, setTruePositives] = useState<TruePositiveReport[]>([]);
  const [loadingTruePositives, setLoadingTruePositives] = useState(true);
  const [selectedTruePositive, setSelectedTruePositive] = useState<TruePositiveReport | null>(null);
  const [truePositiveNotes, setTruePositiveNotes] = useState('');
  const [truePositiveFilter, setTruePositiveFilter] = useState<'all' | 'reviewed' | 'unreviewed'>('all');

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

  useEffect(() => {
    if (activeTab === 'false-positives' && userRole === 'SUPER_ADMIN') {
      loadFalsePositives();
    }
    if (activeTab === 'true-positives' && userRole === 'SUPER_ADMIN') {
      loadTruePositives();
    }
  }, [activeTab, falsePositiveFilter, truePositiveFilter, userRole, worksiteParam]);

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

  const loadFalsePositives = async () => {
    try {
      console.log('[Frontend] Loading false positives...');
      console.log('[Frontend] Filter:', falsePositiveFilter);
      setLoadingFalsePositives(true);
      const params = new URLSearchParams();
      if (falsePositiveFilter === 'reviewed') {
        params.append('reviewed', 'true');
      } else if (falsePositiveFilter === 'unreviewed') {
        params.append('reviewed', 'false');
      }
      // Don't filter by worksite by default - show all false positives
      // if (worksiteParam) {
      //   params.append('worksiteId', worksiteParam);
      // }
      const url = `/api/false-positives?${params.toString()}`;
      console.log('[Frontend] Fetching:', url);
      const response = await fetch(url);
      console.log('[Frontend] Response status:', response.status, response.statusText);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Frontend] ❌ Response error:', errorText);
        throw new Error(`Failed to load false positives: ${response.status}`);
      }
      const data = await response.json();
      console.log('[Frontend] Response data:', data);
      if (data.success) {
        console.log(`[Frontend] ✅ Loaded ${data.data?.length || 0} false positives`);
        setFalsePositives(data.data || []);
      } else {
        console.error('[Frontend] ❌ API returned error:', data.error);
        setFalsePositives([]);
      }
    } catch (error) {
      console.error('[Frontend] ❌ Error loading false positives:', error);
      if (error instanceof Error) {
        console.error('[Frontend] Error message:', error.message);
        console.error('[Frontend] Error stack:', error.stack);
      }
      setFalsePositives([]);
    } finally {
      setLoadingFalsePositives(false);
    }
  };

  const loadTruePositives = async () => {
    try {
      console.log('[Frontend] Loading true positives...');
      console.log('[Frontend] Filter:', truePositiveFilter);
      setLoadingTruePositives(true);
      const params = new URLSearchParams();
      if (truePositiveFilter === 'reviewed') {
        params.append('reviewed', 'true');
      } else if (truePositiveFilter === 'unreviewed') {
        params.append('reviewed', 'false');
      }
      const url = `/api/true-positives?${params.toString()}`;
      console.log('[Frontend] Fetching:', url);
      const response = await fetch(url);
      console.log('[Frontend] Response status:', response.status, response.statusText);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Frontend] ❌ Response error:', errorText);
        throw new Error(`Failed to load true positives: ${response.status}`);
      }
      const data = await response.json();
      console.log('[Frontend] Response data:', data);
      if (data.success) {
        console.log(`[Frontend] ✅ Loaded ${data.data?.length || 0} true positives`);
        setTruePositives(data.data || []);
      } else {
        console.error('[Frontend] ❌ API returned error:', data.error);
        setTruePositives([]);
      }
    } catch (error) {
      console.error('[Frontend] ❌ Error loading true positives:', error);
      if (error instanceof Error) {
        console.error('[Frontend] Error message:', error.message);
        console.error('[Frontend] Error stack:', error.stack);
      }
      setTruePositives([]);
    } finally {
      setLoadingTruePositives(false);
    }
  };

  const updateFalsePositive = async (id: string, updates: { reviewed?: boolean; trainingNotes?: string; overrideToConfirmed?: boolean; overrideExplanation?: string }) => {
    try {
      console.log('[Frontend] Updating false positive:', id, updates);
      const response = await fetch(`/api/false-positives/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      console.log('[Frontend] Update response status:', response.status);
      const data = await response.json();
      console.log('[Frontend] Update response data:', data);
      if (data.success) {
        await loadFalsePositives();
        if (selectedFalsePositive?.id === id) {
          setSelectedFalsePositive(data.data);
        }
        if (updates.overrideToConfirmed) {
          setShowOverrideModal(false);
          setOverrideExplanation('');
        }
      } else {
        console.error('[Frontend] ❌ Update failed:', data.error);
      }
    } catch (error) {
      console.error('[Frontend] ❌ Error updating false positive:', error);
      if (error instanceof Error) {
        console.error('[Frontend] Error message:', error.message);
      }
    }
  };

  const updateTruePositive = async (id: string, updates: { reviewed?: boolean; trainingNotes?: string }) => {
    try {
      const response = await fetch(`/api/true-positives/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (data.success) {
        await loadTruePositives();
        if (selectedTruePositive?.id === id) {
          setSelectedTruePositive(data.data);
        }
      }
    } catch (error) {
      console.error('Error updating true positive:', error);
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('training')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'training'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Training Images
          </button>
          <button
            onClick={() => setActiveTab('false-positives')}
            className={`px-6 py-3 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'false-positives'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            False Positives
            {falsePositives.filter((fp) => !fp.reviewed).length > 0 && (
              <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-xs">
                {falsePositives.filter((fp) => !fp.reviewed).length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'false-positives' ? (
          <FalsePositivesSection
            reports={falsePositives}
            loading={loadingFalsePositives}
            filter={falsePositiveFilter}
            onFilterChange={setFalsePositiveFilter}
            selectedReport={selectedFalsePositive}
            onSelectReport={(report) => {
              setSelectedFalsePositive(report);
              setFalsePositiveNotes(report?.trainingNotes || '');
            }}
            trainingNotes={falsePositiveNotes}
            onTrainingNotesChange={setFalsePositiveNotes}
            onUpdate={updateFalsePositive}
            onRefresh={loadFalsePositives}
            overrideExplanation={overrideExplanation}
            onOverrideExplanationChange={setOverrideExplanation}
            showOverrideModal={showOverrideModal}
            onShowOverrideModal={setShowOverrideModal}
          />
        ) : activeTab === 'true-positives' ? (
          <TruePositivesSection
            reports={truePositives}
            loading={loadingTruePositives}
            filter={truePositiveFilter}
            onFilterChange={setTruePositiveFilter}
            selectedReport={selectedTruePositive}
            onSelectReport={setSelectedTruePositive}
            trainingNotes={truePositiveNotes}
            onTrainingNotesChange={setTruePositiveNotes}
            onUpdate={updateTruePositive}
            onRefresh={loadTruePositives}
          />
        ) : (
          <>
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
        </>
        )}
      </div>
    </div>
  );
}

// False Positives Section Component
function FalsePositivesSection({
  reports,
  loading,
  filter,
  onFilterChange,
  selectedReport,
  onSelectReport,
  trainingNotes,
  onTrainingNotesChange,
  onUpdate,
  onRefresh,
  overrideExplanation,
  onOverrideExplanationChange,
  showOverrideModal,
  onShowOverrideModal,
}: {
  reports: FalsePositiveReport[];
  loading: boolean;
  filter: 'all' | 'reviewed' | 'unreviewed';
  onFilterChange: (filter: 'all' | 'reviewed' | 'unreviewed') => void;
  selectedReport: FalsePositiveReport | null;
  onSelectReport: (report: FalsePositiveReport | null) => void;
  trainingNotes: string;
  onTrainingNotesChange: (notes: string) => void;
  onUpdate: (id: string, updates: { reviewed?: boolean; trainingNotes?: string; overrideToConfirmed?: boolean; overrideExplanation?: string }) => Promise<void>;
  onRefresh: () => void;
  overrideExplanation: string;
  onOverrideExplanationChange: (explanation: string) => void;
  showOverrideModal: boolean;
  onShowOverrideModal: (show: boolean) => void;
}) {
  const filteredReports = reports.filter((report) => {
    if (filter === 'reviewed') return report.reviewed;
    if (filter === 'unreviewed') return !report.reviewed;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400">Filter:</label>
          {['all', 'unreviewed', 'reviewed'].map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <button
            onClick={onRefresh}
            className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
          <AlertTriangle className="h-16 w-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No False Positives Yet</h3>
          <p className="text-gray-400">
            False positive reports will appear here when users mark alerts as incorrect
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className={`bg-gray-800 rounded-xl p-6 border ${
                !report.reviewed ? 'border-yellow-500' : 'border-gray-700'
              } hover:border-gray-600 transition-all cursor-pointer`}
              onClick={() => {
                onSelectReport(report);
                onTrainingNotesChange(report.trainingNotes || '');
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {!report.reviewed && (
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    )}
                    <h3 className="text-lg font-semibold text-white">
                      {report.worksite?.name || 'Unknown Worksite'}
                    </h3>
                    {report.camera && (
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                        {report.camera.name}
                      </span>
                    )}
                    {report.incidentType && (
                      <span className="px-2 py-1 bg-red-600/20 text-red-300 rounded text-xs">
                        {report.incidentType}
                      </span>
                    )}
                  </div>
                  {report.description && (
                    <p className="text-gray-300 mb-2">{report.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    {report.timestamp && (
                      <span>
                        Occurred: {new Date(report.timestamp).toLocaleString()}
                      </span>
                    )}
                    <span>
                      Reported: {new Date(report.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {report.videoUrl && (
                    <a
                      href={report.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      title="View video"
                    >
                      <Video className="h-4 w-4 text-blue-400" />
                    </a>
                  )}
                  {report.imageUrl && (
                    <a
                      href={report.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      title="View image"
                    >
                      <Image className="h-4 w-4 text-blue-400" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">False Positive Report</h2>
                <p className="text-gray-400 mt-1">
                  {selectedReport.worksite?.name} • {selectedReport.camera?.name || 'Unknown Camera'}
                </p>
              </div>
              <button
                onClick={() => onSelectReport(null)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Worksite</label>
                  <p className="text-white">{selectedReport.worksite?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Camera</label>
                  <p className="text-white">{selectedReport.camera?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Incident Type</label>
                  <p className="text-white">{selectedReport.incidentType || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Status</label>
                  <p className="text-white">
                    {selectedReport.reviewed ? 'Reviewed' : 'Pending Review'}
                  </p>
                </div>
              </div>

              {selectedReport.description && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <div className="bg-gray-800 rounded-lg p-4 text-white whitespace-pre-wrap">
                    {selectedReport.description}
                  </div>
                </div>
              )}

              {(selectedReport.videoUrl || selectedReport.imageUrl) && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Media</label>
                  <div className="flex gap-4">
                    {selectedReport.videoUrl && (
                      <a
                        href={selectedReport.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        <Video className="h-4 w-4" />
                        View Video
                      </a>
                    )}
                    {selectedReport.imageUrl && (
                      <a
                        href={selectedReport.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        <Image className="h-4 w-4" />
                        View Image
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-1">Training Notes</label>
                <textarea
                  value={trainingNotes}
                  onChange={(e) => onTrainingNotesChange(e.target.value)}
                  onBlur={() => {
                    if (trainingNotes !== selectedReport.trainingNotes) {
                      onUpdate(selectedReport.id, { trainingNotes });
                    }
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={6}
                  placeholder="Add notes for the training team about this false positive..."
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-700">
                <button
                  onClick={() => {
                    onUpdate(selectedReport.id, { reviewed: !selectedReport.reviewed });
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    selectedReport.reviewed
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {selectedReport.reviewed ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Mark as Unreviewed
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Mark as Reviewed
                    </>
                  )}
                </button>
                  
                  {selectedReport.alertId && (
                    <button
                      onClick={() => onShowOverrideModal(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Override to Confirmed
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Override to Confirmed Modal */}
      {showOverrideModal && selectedReport && selectedReport.alertId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-gray-700 bg-gray-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Override to Confirmed</h3>
              <button
                onClick={() => {
                  onShowOverrideModal(false);
                  onOverrideExplanationChange('');
                }}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <p className="text-gray-400 mb-4">
              This will change the alert status from FALSE_POSITIVE to OVERRIDDEN_CONFIRMED_BY_TEAM.
              Please provide an explanation for why this false positive should be considered a confirmed violation.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Explanation (Required)</label>
                <textarea
                  value={overrideExplanation}
                  onChange={(e) => onOverrideExplanationChange(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Explain why this false positive should be overridden and confirmed as a real violation..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    onShowOverrideModal(false);
                    onOverrideExplanationChange('');
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!overrideExplanation.trim()) {
                      alert('Please provide an explanation');
                      return;
                    }
                    onUpdate(selectedReport.id, {
                      overrideToConfirmed: true,
                      overrideExplanation: overrideExplanation.trim(),
                    });
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Confirm Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// True Positives Section Component
function TruePositivesSection({
  reports,
  loading,
  filter,
  onFilterChange,
  selectedReport,
  onSelectReport,
  trainingNotes,
  onTrainingNotesChange,
  onUpdate,
  onRefresh,
}: {
  reports: TruePositiveReport[];
  loading: boolean;
  filter: 'all' | 'reviewed' | 'unreviewed';
  onFilterChange: (filter: 'all' | 'reviewed' | 'unreviewed') => void;
  selectedReport: TruePositiveReport | null;
  onSelectReport: (report: TruePositiveReport | null) => void;
  trainingNotes: string;
  onTrainingNotesChange: (notes: string) => void;
  onUpdate: (id: string, updates: { reviewed?: boolean; trainingNotes?: string }) => Promise<void>;
  onRefresh: () => void;
}) {
  const filteredReports = reports.filter((report) => {
    if (filter === 'reviewed') return report.reviewed;
    if (filter === 'unreviewed') return !report.reviewed;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400">Filter:</label>
          {['all', 'unreviewed', 'reviewed'].map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <button
            onClick={onRefresh}
            className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-green-400" />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
          <CheckCircle className="h-16 w-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No True Positives Yet</h3>
          <p className="text-gray-400">
            True positive reports will appear here when users confirm detections as correct
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className={`bg-gray-800 rounded-xl p-6 border ${
                !report.reviewed ? 'border-green-500' : 'border-gray-700'
              } hover:border-gray-600 transition-all cursor-pointer`}
              onClick={() => {
                onSelectReport(report);
                onTrainingNotesChange(report.trainingNotes || '');
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {!report.reviewed && (
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                    )}
                    <h3 className="text-lg font-semibold text-white">
                      {report.worksite?.name || 'Unknown Worksite'}
                    </h3>
                    {report.camera && (
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                        {report.camera.name}
                      </span>
                    )}
                    {report.incidentType && (
                      <span className="px-2 py-1 bg-green-600/20 text-green-300 rounded text-xs">
                        {report.incidentType}
                      </span>
                    )}
                  </div>
                  {report.description && (
                    <p className="text-gray-300 mb-2">{report.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    {report.timestamp && (
                      <span>
                        Occurred: {new Date(report.timestamp).toLocaleString()}
                      </span>
                    )}
                    <span>
                      Reported: {new Date(report.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {report.videoUrl && (
                    <a
                      href={report.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      title="View video"
                    >
                      <Video className="h-4 w-4 text-blue-400" />
                    </a>
                  )}
                  {report.imageUrl && (
                    <a
                      href={report.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      title="View image"
                    >
                      <Image className="h-4 w-4 text-blue-400" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">True Positive Report</h2>
                <p className="text-gray-400 mt-1">
                  {selectedReport.worksite?.name} • {selectedReport.camera?.name || 'Unknown Camera'}
                </p>
              </div>
              <button
                onClick={() => onSelectReport(null)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Worksite</label>
                  <p className="text-white">{selectedReport.worksite?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Camera</label>
                  <p className="text-white">{selectedReport.camera?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Incident Type</label>
                  <p className="text-white">{selectedReport.incidentType || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Status</label>
                  <p className="text-white">
                    {selectedReport.reviewed ? 'Reviewed' : 'Pending Review'}
                  </p>
                </div>
              </div>

              {selectedReport.description && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <div className="bg-gray-800 rounded-lg p-4 text-white whitespace-pre-wrap">
                    {selectedReport.description}
                  </div>
                </div>
              )}

              {(selectedReport.videoUrl || selectedReport.imageUrl) && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Media</label>
                  <div className="flex gap-4">
                    {selectedReport.videoUrl && (
                      <a
                        href={selectedReport.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        <Video className="h-4 w-4" />
                        View Video
                      </a>
                    )}
                    {selectedReport.imageUrl && (
                      <a
                        href={selectedReport.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        <Image className="h-4 w-4" />
                        View Image
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-1">Training Notes</label>
                <textarea
                  value={trainingNotes}
                  onChange={(e) => onTrainingNotesChange(e.target.value)}
                  onBlur={() => {
                    if (trainingNotes !== selectedReport.trainingNotes) {
                      onUpdate(selectedReport.id, { trainingNotes });
                    }
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={6}
                  placeholder="Add notes for the training team about this true positive..."
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-700">
                <button
                  onClick={() => {
                    onUpdate(selectedReport.id, { reviewed: !selectedReport.reviewed });
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    selectedReport.reviewed
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {selectedReport.reviewed ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Mark as Unreviewed
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Mark as Reviewed
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

