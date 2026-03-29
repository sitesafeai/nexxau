'use client';

import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

const STEPS = ['Basic Info', 'Zone & Location', 'Detection Rules'];
const PPE_OPTIONS = [
  { value: 'helmet', label: 'Hard Hat / Helmet' },
  { value: 'vest', label: 'High-Vis Vest' },
];

interface AddCameraWizardProps {
  worksiteId: string;
  onSuccess: (camera: any) => void;
  onClose: () => void;
}

export default function AddCameraWizard({
  worksiteId,
  onSuccess,
  onClose,
}: AddCameraWizardProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [rtspUrl, setRtspUrl] = useState('');
  const [zone, setZone] = useState('');
  const [requiredPpe, setRequiredPpe] = useState<string[]>([]);
  const [skipValidation, setSkipValidation] = useState(false);

  function togglePpe(val: string) {
    setRequiredPpe((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/worksites/${worksiteId}/cameras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          rtspUrl,
          location: zone || undefined,
          skipValidation,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.details || data.error || data.message || 'Failed to add camera';
        const hint = data.hint ? ` ${data.hint}` : '';
        throw new Error(msg + hint);
      }
      onSuccess(data.data);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-white">Add Camera</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  i < step
                    ? 'bg-blue-600 text-white'
                    : i === step
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                }`}
              >
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span
                className={`text-xs ${
                  i === step ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-400'
                }`}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-px ${i < step ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="px-6 py-6 min-h-[200px]">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Camera Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Entry Gate Camera"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  RTSP URL
                </label>
                <input
                  value={rtspUrl}
                  onChange={(e) => setRtspUrl(e.target.value)}
                  placeholder="rtsp://username:password@192.168.1.x:554/stream"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-mono bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Found on your camera&apos;s settings page or manufacturer documentation.
                </p>
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipValidation}
                    onChange={(e) => setSkipValidation(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Skip RTSP validation (test streams, e.g. test.rtsp.stream)
                  </span>
                </label>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Zone / Location
                </label>
                <input
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  placeholder="e.g. Entry Gate, Zone A, Roof Level"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Required PPE in this zone
                </label>
                <div className="space-y-2">
                  {PPE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={requiredPpe.includes(opt.value)}
                        onChange={() => togglePpe(opt.value)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Predefined detection rules (No Helmet, No Vest) will be created
                automatically and can only be disabled with a reason.
              </p>
              {[
                {
                  name: 'No Helmet Violation',
                  desc: 'IF person detected AND no helmet → SMS + WhatsApp',
                },
                {
                  name: 'No Vest Violation',
                  desc: 'IF person detected AND no vest → SMS + WhatsApp',
                },
              ].map((rule) => (
                <div
                  key={rule.name}
                  className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <Check size={10} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {rule.name}
                    </p>
                    <p className="text-xs text-slate-500">{rule.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={() => (step > 0 ? setStep((s) => s - 1) : onClose())}
            className="flex items-center gap-1 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft size={16} />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && (!name.trim() || !rtspUrl.trim())}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {loading ? 'Adding...' : 'Add Camera'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
