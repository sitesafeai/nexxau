'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface DetectionFeedbackProps {
  detectionId: string;
  currentFeedback?: string | null;
  onFeedbackSubmitted?: () => void;
  compact?: boolean;
}

export default function DetectionFeedback({
  detectionId,
  currentFeedback,
  onFeedbackSubmitted,
  compact = false,
}: DetectionFeedbackProps) {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(currentFeedback || null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFeedback = async (feedbackType: 'true_positive' | 'false_positive' | 'needs_review') => {
    if (submitting) return;
    
    console.log('[DetectionFeedback] Starting feedback submission:', { detectionId, feedbackType, note });
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const url = `/api/detections/${detectionId}/feedback`;
      console.log('[DetectionFeedback] Fetching:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback: feedbackType,
          note: note.trim() || undefined,
        }),
      });

      console.log('[DetectionFeedback] Response status:', response.status);
      const data = await response.json();
      console.log('[DetectionFeedback] Response data:', data);

      if (!response.ok || !data.success) {
        console.error('[DetectionFeedback] ❌ API error:', data);
        throw new Error(data.error || 'Failed to submit feedback');
      }

      console.log('[DetectionFeedback] ✅ Feedback submitted successfully');
      setFeedback(feedbackType);
      setSuccess(true);
      setShowNoteInput(false);
      setNote('');
      
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }

      // Clear success message after 2 seconds
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      console.error('[DetectionFeedback] ❌ Error:', err);
      console.error('[DetectionFeedback] Error details:', err.message, err.stack);
      setError(err?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {feedback === 'true_positive' && (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Confirmed
          </span>
        )}
        {feedback === 'false_positive' && (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            False Positive
          </span>
        )}
        {feedback === 'needs_review' && (
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Needs Review
          </span>
        )}
        {!feedback && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleFeedback('true_positive')}
              disabled={submitting}
              className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
              title="Mark as true positive"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleFeedback('false_positive')}
              disabled={submitting}
              className="p-1 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              title="Mark as false positive"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}
        {submitting && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
          {error}
        </div>
      )}
      
      {success && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2 text-xs text-emerald-200">
          Feedback submitted successfully!
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleFeedback('true_positive')}
          disabled={submitting || feedback === 'true_positive'}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            feedback === 'true_positive'
              ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-200'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-200'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <CheckCircle2 className="h-3 w-3" />
          True Positive
        </button>

        <button
          onClick={() => handleFeedback('false_positive')}
          disabled={submitting || feedback === 'false_positive'}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            feedback === 'false_positive'
              ? 'border-red-500/60 bg-red-500/20 text-red-200'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-red-500/40 hover:text-red-200'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <XCircle className="h-3 w-3" />
          False Positive
        </button>

        <button
          onClick={() => handleFeedback('needs_review')}
          disabled={submitting || feedback === 'needs_review'}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            feedback === 'needs_review'
              ? 'border-amber-500/60 bg-amber-500/20 text-amber-200'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-500/40 hover:text-amber-200'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <AlertCircle className="h-3 w-3" />
          Needs Review
        </button>

        {submitting && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>

      {(feedback || showNoteInput) && (
        <div className="space-y-2">
          <button
            onClick={() => setShowNoteInput(!showNoteInput)}
            className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            {showNoteInput ? 'Hide note' : 'Add note (optional)'}
          </button>
          
          {showNoteInput && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any additional context..."
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          )}
        </div>
      )}
    </div>
  );
}

