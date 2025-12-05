'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface WorksiteFormProps {
  clientId: string;
  clientName: string;
}

interface NotificationContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'manager' | 'supervisor' | 'safety_officer' | 'emergency';
  notifications: {
    liveAlerts: boolean;
    snoozedReminders: boolean;
    dailyReports: boolean;
    criticalOnly: boolean;
    channel: 'email' | 'sms' | 'whatsapp' | 'all';
  };
}

export default function WorksiteForm({ clientId, clientName }: WorksiteFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Notification Contacts
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    cameraSystemType: 'milestone',
    config: {},
  });
  
  const [contacts, setContacts] = useState<NotificationContact[]>([]);
  const [newContact, setNewContact] = useState<Partial<NotificationContact>>({
    name: '',
    email: '',
    phone: '',
    role: 'manager',
    notifications: {
      liveAlerts: true,
      snoozedReminders: true,
      dailyReports: false,
      criticalOnly: false,
      channel: 'email',
    },
  });

  const addContact = () => {
    if (!newContact.name || (!newContact.email && !newContact.phone)) {
      alert('Please provide a name and at least an email or phone number');
      return;
    }
    setContacts([...contacts, { ...newContact, id: Date.now().toString() } as NotificationContact]);
    setNewContact({
      name: '',
      email: '',
      phone: '',
      role: 'manager',
      notifications: {
        liveAlerts: true,
        snoozedReminders: true,
        dailyReports: false,
        criticalOnly: false,
        channel: 'email',
      },
    });
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      setStep(2);
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch('/api/worksites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          clientId,
          notificationContacts: contacts,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create worksite');
      }

      const worksite = await response.json();
      router.push(`/worksites/${worksite.id}`);
    } catch (error) {
      console.error('Error creating worksite:', error);
      alert('Failed to create worksite. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Add Worksite for {clientName}
          </h3>
              <p className="text-sm text-gray-500 mt-1">
                Step {step} of 2: {step === 1 ? 'Basic Information' : 'Notification Contacts'}
              </p>
            </div>
            <div className="flex gap-2">
              <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-gray-300'}`} />
              <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-300'}`} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Worksite Name *
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Address *
              </label>
              <input
                type="text"
                name="address"
                id="address"
                required
                value={formData.address}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="cameraSystemType" className="block text-sm font-medium text-gray-700">
                Camera System Type
              </label>
              <select
                name="cameraSystemType"
                id="cameraSystemType"
                required
                value={formData.cameraSystemType}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="milestone">Milestone</option>
                <option value="cloud">Cloud</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Notification Contacts */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Add Notification Contact</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        value={newContact.name || ''}
                        onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                      <select
                        value={newContact.role || 'manager'}
                        onChange={(e) => setNewContact({ ...newContact, role: e.target.value as any })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="manager">Site Manager</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="safety_officer">Safety Officer</option>
                        <option value="emergency">Emergency Contact</option>
              </select>
            </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={newContact.email || ''}
                        onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="john@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Phone (SMS/WhatsApp)</label>
                      <input
                        type="tel"
                        value={newContact.phone || ''}
                        onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="+1 555-123-4567"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">Notification Channel</label>
                    <div className="flex gap-3">
                      {['email', 'sms', 'whatsapp', 'all'].map((channel) => (
                        <label key={channel} className="flex items-center">
                          <input
                            type="radio"
                            name="channel"
                            value={channel}
                            checked={newContact.notifications?.channel === channel}
                            onChange={(e) => setNewContact({
                              ...newContact,
                              notifications: { ...newContact.notifications!, channel: e.target.value as any }
                            })}
                            className="mr-1.5 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700 capitalize">{channel === 'all' ? 'All Channels' : channel.toUpperCase()}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-medium text-gray-700 mb-2">Notify For</label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newContact.notifications?.liveAlerts ?? true}
                          onChange={(e) => setNewContact({
                            ...newContact,
                            notifications: { ...newContact.notifications!, liveAlerts: e.target.checked }
                          })}
                          className="mr-2 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">Live Alerts (Video Clips)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newContact.notifications?.snoozedReminders ?? true}
                          onChange={(e) => setNewContact({
                            ...newContact,
                            notifications: { ...newContact.notifications!, snoozedReminders: e.target.checked }
                          })}
                          className="mr-2 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">Snoozed Alert Reminders</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newContact.notifications?.dailyReports ?? false}
                          onChange={(e) => setNewContact({
                            ...newContact,
                            notifications: { ...newContact.notifications!, dailyReports: e.target.checked }
                          })}
                          className="mr-2 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">Daily Summary Reports</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newContact.notifications?.criticalOnly ?? false}
                          onChange={(e) => setNewContact({
                            ...newContact,
                            notifications: { ...newContact.notifications!, criticalOnly: e.target.checked }
                          })}
                          className="mr-2 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">Critical/Emergency Only</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addContact}
                    className="mt-4 w-full py-2 px-4 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 text-sm font-medium"
                  >
                    + Add Contact
                  </button>
                </div>

                {/* Contact List */}
                {contacts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Added Contacts ({contacts.length})</h4>
                    <div className="space-y-2">
                      {contacts.map((contact) => (
                        <div key={contact.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                            <p className="text-xs text-gray-500">
                              {contact.role.replace('_', ' ')} • {contact.email || contact.phone} • {contact.notifications.channel.toUpperCase()}
                            </p>
                            <p className="text-xs text-gray-400">
                              {[
                                contact.notifications.liveAlerts && 'Live Alerts',
                                contact.notifications.snoozedReminders && 'Snooze Reminders',
                                contact.notifications.dailyReports && 'Daily Reports',
                                contact.notifications.criticalOnly && 'Critical Only',
                              ].filter(Boolean).join(' • ')}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeContact(contact.id)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {contacts.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No contacts added yet. Add at least one contact to receive alerts.
                  </p>
                )}
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-between pt-4 border-t border-gray-200">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  ← Back
                </button>
              ) : (
                <div />
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {step === 1 ? 'Next: Add Contacts →' : isLoading ? 'Creating...' : 'Create Worksite'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 