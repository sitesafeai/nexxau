'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Company {
  id: string;
  name: string;
  companyUsername: string;
  email: string;
  phone?: string;
  address?: string;
  worksites: Worksite[];
}

interface Worksite {
  id: string;
  name: string;
  worksiteName: string;
  address: string;
  cameraSystemType: string;
  workers: Worker[];
}

interface Worker {
  id: string;
  name: string;
  email: string;
  role: string;
  isClaimed: boolean;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedWorksite, setSelectedWorksite] = useState<Worksite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('companies');

  // Form states
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showWorksiteForm, setShowWorksiteForm] = useState(false);
  const [showWorkerForm, setShowWorkerForm] = useState(false);

  const [companyForm, setCompanyForm] = useState({
    name: '',
    companyUsername: '',
    email: '',
    phone: '',
    address: ''
  });

  const [worksiteForm, setWorksiteForm] = useState({
    name: '',
    worksiteName: '',
    address: '',
    cameraSystemType: 'standard'
  });

  const [workerForm, setWorkerForm] = useState({
    name: '',
    email: '',
    role: 'worker'
  });

  // Check authentication and admin role
  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    fetchCompanies();
  }, [session, status, router]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/admin/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyForm)
      });

      if (response.ok) {
        setShowCompanyForm(false);
        setCompanyForm({ name: '', companyUsername: '', email: '', phone: '', address: '' });
        fetchCompanies();
      }
    } catch (error) {
      console.error('Error creating company:', error);
    }
  };

  const handleCreateWorksite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    try {
      const response = await fetch('/api/admin/worksites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...worksiteForm,
          companyId: selectedCompany.id
        })
      });

      if (response.ok) {
        setShowWorksiteForm(false);
        setWorksiteForm({ name: '', worksiteName: '', address: '', cameraSystemType: 'standard' });
        fetchCompanies();
      }
    } catch (error) {
      console.error('Error creating worksite:', error);
    }
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorksite) return;

    try {
      const response = await fetch('/api/admin/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...workerForm,
          worksiteId: selectedWorksite.id
        })
      });

      if (response.ok) {
        setShowWorkerForm(false);
        setWorkerForm({ name: '', email: '', role: 'worker' });
        fetchCompanies();
      }
    } catch (error) {
      console.error('Error adding worker:', error);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold text-white">Nexxau Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Welcome, {session?.user?.name}</span>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-400 hover:text-white"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 mb-8">
          {[
            { id: 'companies', name: 'Companies' },
            { id: 'worksites', name: 'Worksites' },
            { id: 'workers', name: 'Workers' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Companies</h2>
              <button
                onClick={() => setShowCompanyForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Company
              </button>
            </div>

            <div className="grid gap-6">
              {companies.map((company) => (
                <div key={company.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{company.name}</h3>
                      <p className="text-gray-400">Username: {company.companyUsername}</p>
                      <p className="text-gray-400">{company.email}</p>
                      <p className="text-gray-400">{company.worksites.length} worksites</p>
                    </div>
                    <button
                      onClick={() => setSelectedCompany(company)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Worksites Tab */}
        {activeTab === 'worksites' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Worksites</h2>
              <button
                onClick={() => setShowWorksiteForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Worksite
              </button>
            </div>

            <div className="grid gap-6">
              {companies.flatMap(company => 
                company.worksites.map(worksite => (
                  <div key={worksite.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{worksite.name}</h3>
                        <p className="text-gray-400">Worksite ID: {worksite.worksiteName}</p>
                        <p className="text-gray-400">Company: {company.name}</p>
                        <p className="text-gray-400">{worksite.workers.length} workers</p>
                      </div>
                      <button
                        onClick={() => setSelectedWorksite(worksite)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        View Workers
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Workers Tab */}
        {activeTab === 'workers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Workers</h2>
              <button
                onClick={() => setShowWorkerForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Worker
              </button>
            </div>

            <div className="grid gap-4">
              {companies.flatMap(company => 
                company.worksites.flatMap(worksite => 
                  worksite.workers.map(worker => (
                    <div key={worker.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-white font-medium">{worker.name}</h3>
                          <p className="text-gray-400">{worker.email}</p>
                          <p className="text-gray-400">Role: {worker.role}</p>
                          <p className="text-gray-400">Worksite: {worksite.name}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            worker.isClaimed 
                              ? 'bg-green-900 text-green-300' 
                              : 'bg-yellow-900 text-yellow-300'
                          }`}>
                            {worker.isClaimed ? 'Claimed' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        )}

        {/* Modals */}
        {showCompanyForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-white mb-4">Add Company</h3>
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Company Username</label>
                  <input
                    type="text"
                    required
                    value={companyForm.companyUsername}
                    onChange={(e) => setCompanyForm({...companyForm, companyUsername: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCompanyForm(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showWorksiteForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-white mb-4">Add Worksite</h3>
              <form onSubmit={handleCreateWorksite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Worksite Name</label>
                  <input
                    type="text"
                    required
                    value={worksiteForm.name}
                    onChange={(e) => setWorksiteForm({...worksiteForm, name: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Worksite ID</label>
                  <input
                    type="text"
                    required
                    value={worksiteForm.worksiteName}
                    onChange={(e) => setWorksiteForm({...worksiteForm, worksiteName: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                  <input
                    type="text"
                    required
                    value={worksiteForm.address}
                    onChange={(e) => setWorksiteForm({...worksiteForm, address: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowWorksiteForm(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showWorkerForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-white mb-4">Add Worker</h3>
              <form onSubmit={handleAddWorker} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={workerForm.name}
                    onChange={(e) => setWorkerForm({...workerForm, name: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={workerForm.email}
                    onChange={(e) => setWorkerForm({...workerForm, email: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                  <select
                    value={workerForm.role}
                    onChange={(e) => setWorkerForm({...workerForm, role: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="worker">Worker</option>
                    <option value="site-manager">Site Manager</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowWorkerForm(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 