'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface AcknowledgeAlertModalProps {
  alert: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AcknowledgeAlertModal({ alert: alertData, onClose, onSuccess }: AcknowledgeAlertModalProps) {
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    note: '',
    actionTaken: '',
    severity: alertData.severity || 'MEDIUM',
    requiresFollowUp: false,
    followUpDate: '',
    notifyOthers: false,
    notificationList: []
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/alerts/${alertData.id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess();
        onClose();
      } else {
        alert(`Failed to acknowledge alert: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      alert('Failed to acknowledge alert. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold text-white">Acknowledge Alert</h3>
            <p className="text-sm text-gray-400 mt-1">Step {step} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-gray-900">
          <div className="flex items-center">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= stepNum ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    step > stepNum ? 'bg-blue-600' : 'bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>Details</span>
            <span>Assessment</span>
            <span>Follow-up</span>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Alert Summary */}
          <div className="bg-gray-900 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Alert Information</h4>
            <p className="text-white font-medium">{alertData.title}</p>
            <p className="text-gray-300 text-sm mt-1">{alertData.description}</p>
            <div className="flex items-center gap-3 mt-3 text-sm">
              <span className="text-gray-400">📍 {alertData.location}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                alertData.severity === 'CRITICAL' ? 'bg-red-900 text-red-300' :
                alertData.severity === 'HIGH' ? 'bg-orange-900 text-orange-300' :
                alertData.severity === 'MEDIUM' ? 'bg-yellow-900 text-yellow-300' :
                'bg-blue-900 text-blue-300'
              }`}>
                {alertData.severity}
              </span>
            </div>
          </div>

          {/* Step 1: Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Acknowledgment Note *
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the situation and any immediate observations..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Action Taken *
                </label>
                <textarea
                  value={formData.actionTaken}
                  onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What action did you take in response to this alert?"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Acknowledged By
                </label>
                <input
                  type="text"
                  value={session?.user?.name || 'Unknown'}
                  disabled
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-400"
                />
              </div>
            </div>
          )}

          {/* Step 2: Assessment */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Severity Assessment
                </label>
                <p className="text-sm text-gray-400 mb-3">
                  Reassess the severity based on your investigation
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((severity) => (
                    <button
                      key={severity}
                      onClick={() => setFormData({ ...formData, severity })}
                      className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                        formData.severity === severity
                          ? severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                            severity === 'HIGH' ? 'bg-orange-600 text-white' :
                            severity === 'MEDIUM' ? 'bg-yellow-600 text-white' :
                            'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {severity}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-300">Assessment Impact</p>
                    <p className="text-sm text-yellow-200/80 mt-1">
                      Your severity assessment will be logged and may trigger additional workflows or notifications.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Follow-up */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requiresFollowUp"
                  checked={formData.requiresFollowUp}
                  onChange={(e) => setFormData({ ...formData, requiresFollowUp: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="requiresFollowUp" className="ml-2 text-sm font-medium text-gray-300">
                  This alert requires follow-up action
                </label>
              </div>

              {formData.requiresFollowUp && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Follow-up Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notifyOthers"
                  checked={formData.notifyOthers}
                  onChange={(e) => setFormData({ ...formData, notifyOthers: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="notifyOthers" className="ml-2 text-sm font-medium text-gray-300">
                  Notify other team members
                </label>
              </div>

              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-300">Audit Trail</p>
                    <p className="text-sm text-blue-200/80 mt-1">
                      Your acknowledgment will be logged with timestamp, user details, and all actions taken. This creates a complete audit trail for compliance and review.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-900 flex justify-between">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            {step < 3 ? (
              <button
                onClick={nextStep}
                disabled={step === 1 && (!formData.note || !formData.actionTaken)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || (formData.requiresFollowUp && !formData.followUpDate)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Acknowledge Alert'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

