'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/app/components/DashboardHeader';
import { ArrowLeft, ArrowRight, Check, Camera, MapPin, AlertTriangle, Users } from 'lucide-react';

interface WorksiteFormData {
  // Step 1: Basic Info
  name: string;
  location: string;
  address: string;
  cameraSystemType: string;
  
  // Step 2: Cameras
  cameras: Array<{
    name: string;
    streamUrl: string;
    cameraType: string;
    location: string;
    // Alert configuration for this camera
    alerts: Array<{
      name: string;
      type: string;
      severity: string;
    }>;
  }>;
  
  // Step 4: Team (to be invited after creation)
  teamMembers: Array<{
    email: string;
    role: string;
  }>;
}

export default function CreateWorksitePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<WorksiteFormData>({
    name: '',
    location: '',
    address: '',
    cameraSystemType: 'mixed',
    cameras: [],
    teamMembers: []
  });

  // Camera form for Step 2
  const [newCamera, setNewCamera] = useState({
    name: '',
    streamUrl: '',
    cameraType: 'IP',
    location: '',
    alerts: [] as Array<{ name: string; type: string; severity: string; }>
  });

  // Alert form for Step 3 (camera-specific)
  const [selectedCameraIndex, setSelectedCameraIndex] = useState<number | null>(null);
  const [newAlert, setNewAlert] = useState({
    name: '',
    type: 'PPE_VIOLATION',
    severity: 'MEDIUM'
  });

  // Team member form for Step 4
  const [newTeamMember, setNewTeamMember] = useState({
    email: '',
    role: 'WORKER'
  });

  const steps = [
    { number: 1, title: 'Basic Info', icon: MapPin },
    { number: 2, title: 'Cameras', icon: Camera },
    { number: 3, title: 'Alerts', icon: AlertTriangle },
    { number: 4, title: 'Team', icon: Users }
  ];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addCamera = () => {
    if (newCamera.name && newCamera.streamUrl) {
      setFormData({
        ...formData,
        cameras: [...formData.cameras, { ...newCamera, alerts: [] }]
      });
      setNewCamera({ name: '', streamUrl: '', cameraType: 'IP', location: '', alerts: [] });
    }
  };

  const removeCamera = (index: number) => {
    setFormData({
      ...formData,
      cameras: formData.cameras.filter((_, i) => i !== index)
    });
  };

  const addAlertToCamera = () => {
    if (selectedCameraIndex !== null && newAlert.name) {
      const updatedCameras = [...formData.cameras];
      updatedCameras[selectedCameraIndex].alerts.push({ ...newAlert });
      setFormData({
        ...formData,
        cameras: updatedCameras
      });
      setNewAlert({ name: '', type: 'PPE_VIOLATION', severity: 'MEDIUM' });
    }
  };

  const removeAlertFromCamera = (cameraIndex: number, alertIndex: number) => {
    const updatedCameras = [...formData.cameras];
    updatedCameras[cameraIndex].alerts = updatedCameras[cameraIndex].alerts.filter((_, i) => i !== alertIndex);
    setFormData({
      ...formData,
      cameras: updatedCameras
    });
  };

  const addTeamMember = () => {
    if (newTeamMember.email) {
      setFormData({
        ...formData,
        teamMembers: [...formData.teamMembers, { ...newTeamMember }]
      });
      setNewTeamMember({ email: '', role: 'WORKER' });
    }
  };

  const removeTeamMember = (index: number) => {
    setFormData({
      ...formData,
      teamMembers: formData.teamMembers.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Create worksite
      const worksiteRes = await fetch('/api/worksites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          location: formData.location,
          address: formData.address,
          cameraSystemType: formData.cameraSystemType,
          companyId: (session?.user as any).companyId
        })
      });

      const worksiteData = await worksiteRes.json();
      
      if (!worksiteData.success) {
        throw new Error(worksiteData.error || 'Failed to create worksite');
      }

      const worksiteId = worksiteData.data.id;

      // Step 2: Create cameras
      for (const camera of formData.cameras) {
        const cameraPayload = {
          name: camera.name,
          type: camera.cameraType,
          streamUrl: camera.streamUrl,
          location: camera.location,
          worksiteId,
          status: 'active', // lowercase to match database
          // Set the appropriate URL field based on stream type
          ...(camera.streamUrl.includes('rtsp://') 
            ? { rtspPath: camera.streamUrl }
            : { hlsUrl: camera.streamUrl }
          )
        };

        const cameraRes = await fetch('/api/cameras', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cameraPayload)
        });

        const cameraData = await cameraRes.json();
        if (!cameraData.success) {
          console.error('Failed to create camera:', camera.name, cameraData.error);
        } else {
          console.log('✅ Camera created:', camera.name);
        }
      }

      // Step 3: Send invitations to team members
      for (const member of formData.teamMembers) {
        const inviteRes = await fetch('/api/invitations/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: member.email,
            role: member.role,
            worksiteId,
            companyId: (session?.user as any).companyId,
            invitedBy: (session?.user as any).id
          })
        });
        
        const inviteData = await inviteRes.json();
        if (!inviteData.success) {
          console.error('Failed to send invitation to:', member.email, inviteData.error);
        } else {
          console.log('✅ Invitation sent to:', member.email);
        }
      }

      // Success! Redirect to worksite
      router.push(`/company/worksites/${worksiteId}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) {
      return formData.name && formData.location;
    }
    return true; // Other steps are optional
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <DashboardHeader />
      
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-300 hover:text-white mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Company Dashboard
            </button>
            <h1 className="text-4xl font-bold text-white mb-2">Create New Worksite</h1>
            <p className="text-slate-300">Set up your worksite with cameras, zones, and team members</p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center flex-1">
                  <div className={`flex items-center gap-3 ${currentStep >= step.number ? 'text-blue-500' : 'text-slate-500'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                      currentStep > step.number
                        ? 'bg-blue-500 border-blue-500'
                        : currentStep === step.number
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-slate-600 bg-slate-800'
                    }`}>
                      {currentStep > step.number ? (
                        <Check className="h-6 w-6 text-white" />
                      ) : (
                        <step.icon className="h-6 w-6" />
                      )}
                    </div>
                    <span className="hidden sm:block font-semibold">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      currentStep > step.number ? 'bg-blue-500' : 'bg-slate-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-8 border border-slate-700">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-4">Basic Information</h2>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Worksite Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Downtown Construction Site"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., New York, NY"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Full Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="123 Construction Ave, New York, NY 10001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Camera System Type
                  </label>
                  <select
                    value={formData.cameraSystemType}
                    onChange={(e) => setFormData({ ...formData, cameraSystemType: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="mixed">Mixed</option>
                    <option value="ip">IP Cameras Only</option>
                    <option value="analog">Analog Cameras Only</option>
                    <option value="ptz">PTZ Cameras</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Cameras */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-4">Add Cameras</h2>
                <p className="text-slate-400 mb-6">Add cameras to monitor this worksite (you can also add them later)</p>

                {/* Add Camera Form */}
                <div className="bg-slate-700/30 p-6 rounded-lg space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Camera Name</label>
                      <input
                        type="text"
                        value={newCamera.name}
                        onChange={(e) => setNewCamera({ ...newCamera, name: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="e.g., Main Entrance"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
                      <input
                        type="text"
                        value={newCamera.location}
                        onChange={(e) => setNewCamera({ ...newCamera, location: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="e.g., North Gate"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Stream URL</label>
                    <input
                      type="text"
                      value={newCamera.streamUrl}
                      onChange={(e) => setNewCamera({ ...newCamera, streamUrl: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="rtsp://... or http://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Camera Type</label>
                    <select
                      value={newCamera.cameraType}
                      onChange={(e) => setNewCamera({ ...newCamera, cameraType: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="IP">IP Camera</option>
                      <option value="PTZ">PTZ Camera</option>
                      <option value="Analog">Analog Camera</option>
                    </select>
                  </div>

                  <button
                    onClick={addCamera}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Add Camera
                  </button>
                </div>

                {/* Camera List */}
                {formData.cameras.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Added Cameras ({formData.cameras.length})</h3>
                    {formData.cameras.map((camera, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{camera.name}</p>
                          <p className="text-sm text-slate-400">{camera.location} • {camera.cameraType}</p>
                        </div>
                        <button
                          onClick={() => removeCamera(index)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Camera Alerts */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-4">Configure Camera Alerts</h2>
                <p className="text-slate-400 mb-6">Set up alerts for each camera (optional)</p>

                {formData.cameras.length === 0 ? (
                  <div className="p-8 bg-slate-700/30 rounded-lg text-center">
                    <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Cameras Added Yet</h3>
                    <p className="text-slate-400">
                      Go back to Step 2 to add cameras before configuring alerts.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Select Camera */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Select Camera</label>
                      <select
                        value={selectedCameraIndex ?? ''}
                        onChange={(e) => setSelectedCameraIndex(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      >
                        <option value="">Choose a camera to configure alerts</option>
                        {formData.cameras.map((cam, index) => (
                          <option key={index} value={index}>
                            {cam.name} ({cam.location})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Add Alert Form */}
                    {selectedCameraIndex !== null && (
                      <div className="bg-slate-700/30 p-6 rounded-lg space-y-4">
                        <h3 className="text-lg font-semibold text-white">
                          Add Alert for: {formData.cameras[selectedCameraIndex].name}
                        </h3>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Alert Name</label>
                          <input
                            type="text"
                            value={newAlert.name}
                            onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                            placeholder="e.g., Hard Hat Detection"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Alert Type</label>
                            <select
                              value={newAlert.type}
                              onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value })}
                              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                            >
                              <option value="PPE_VIOLATION">PPE Violation</option>
                              <option value="RESTRICTED_AREA">Restricted Area Entry</option>
                              <option value="FALL_DETECTION">Fall Detection</option>
                              <option value="FIRE_SMOKE">Fire/Smoke Detection</option>
                              <option value="VEHICLE_DETECTION">Unauthorized Vehicle</option>
                              <option value="PERSON_COUNT">Person Count Exceeded</option>
                              <option value="LOITERING">Loitering Detection</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Severity</label>
                            <select
                              value={newAlert.severity}
                              onChange={(e) => setNewAlert({ ...newAlert, severity: e.target.value })}
                              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                            >
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HIGH">High</option>
                              <option value="CRITICAL">Critical</option>
                            </select>
                          </div>
                        </div>

                        <button
                          onClick={addAlertToCamera}
                          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          Add Alert to {formData.cameras[selectedCameraIndex].name}
                        </button>
                      </div>
                    )}

                    {/* Show alerts for all cameras */}
                    <div className="space-y-4">
                      {formData.cameras.map((camera, camIndex) => (
                        camera.alerts.length > 0 && (
                          <div key={camIndex} className="bg-slate-700/30 p-4 rounded-lg">
                            <h4 className="text-white font-semibold mb-3">
                              {camera.name} - {camera.alerts.length} {camera.alerts.length === 1 ? 'Alert' : 'Alerts'}
                            </h4>
                            <div className="space-y-2">
                              {camera.alerts.map((alert, alertIndex) => (
                                <div key={alertIndex} className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                                  <div>
                                    <p className="text-white text-sm font-medium">{alert.name}</p>
                                    <p className="text-xs text-slate-400">{alert.type.replace(/_/g, ' ')} • {alert.severity}</p>
                                  </div>
                                  <button
                                    onClick={() => removeAlertFromCamera(camIndex, alertIndex)}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-sm text-blue-300">
                        💡 <strong>Tip:</strong> You can fine-tune detection parameters and add zone boundaries after worksite creation in the dashboard.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 4: Team Members */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-4">Invite Team Members</h2>
                <p className="text-slate-400 mb-6">Invite people to access this worksite (optional)</p>

                {/* Add Team Member Form */}
                <div className="bg-slate-700/30 p-6 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={newTeamMember.email}
                      onChange={(e) => setNewTeamMember({ ...newTeamMember, email: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="user@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                    <select
                      value={newTeamMember.role}
                      onChange={(e) => setNewTeamMember({ ...newTeamMember, role: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="SITE_ADMIN">Site Admin</option>
                      <option value="SUPERVISOR">Supervisor</option>
                      <option value="WORKER">Worker</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </div>

                  <button
                    onClick={addTeamMember}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Add Team Member
                  </button>
                </div>

                {/* Team Member List */}
                {formData.teamMembers.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Team Members to Invite ({formData.teamMembers.length})</h3>
                    {formData.teamMembers.map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{member.email}</p>
                          <p className="text-sm text-slate-400">{member.role}</p>
                        </div>
                        <button
                          onClick={() => removeTeamMember(index)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-slate-700">
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                onClick={handleNext}
                disabled={!canProceed() || loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>Creating...</>
                ) : currentStep === 4 ? (
                  <>
                    <Check className="h-4 w-4" />
                    Create Worksite
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

