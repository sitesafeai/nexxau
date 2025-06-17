'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface WorksiteFormProps {
  clientId: string;
  clientName: string;
}

export default function WorksiteForm({ clientId, clientName }: WorksiteFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    cameraSystemType: 'milestone',
    config: {},
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Add Worksite for {clientName}
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Enter the details for the new worksite.</p>
          </div>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Worksite Name
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
                Address
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
              </select>
            </div>

            <div className="pt-5">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Worksite'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 