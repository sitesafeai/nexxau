'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import { 
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';

interface Site {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'inactive' | 'maintenance';
  cameras: number;
  alerts: number;
  lastActivity: string;
  safetyScore: number;
  manager: string;
  createdAt: string;
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setSites([
        {
          id: '1',
          name: 'Downtown Construction Site',
          address: '123 Main St, Downtown, NY',
          status: 'active',
          cameras: 8,
          alerts: 2,
          lastActivity: '2 hours ago',
          safetyScore: 85,
          manager: 'John Smith',
          createdAt: '2024-01-15'
        },
        {
          id: '2',
          name: 'Industrial Warehouse',
          address: '456 Industrial Blvd, Queens, NY',
          status: 'active',
          cameras: 12,
          alerts: 0,
          lastActivity: '1 hour ago',
          safetyScore: 92,
          manager: 'Sarah Johnson',
          createdAt: '2024-02-01'
        },
        {
          id: '3',
          name: 'Highway Bridge Project',
          address: '789 Bridge Rd, Brooklyn, NY',
          status: 'maintenance',
          cameras: 6,
          alerts: 1,
          lastActivity: '30 minutes ago',
          safetyScore: 78,
          manager: 'Mike Wilson',
          createdAt: '2024-01-20'
        },
        {
          id: '4',
          name: 'Shopping Center Renovation',
          address: '321 Mall Ave, Bronx, NY',
          status: 'inactive',
          cameras: 4,
          alerts: 0,
          lastActivity: '1 day ago',
          safetyScore: 65,
          manager: 'Emily Davis',
          createdAt: '2024-01-10'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredSites = sites.filter(site => {
    const matchesSearch = site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         site.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         site.manager.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || site.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sites Management</h1>
            <p className="text-gray-600">Manage construction sites and facilities</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Site
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Sites</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, address, or manager..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sites Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSites.map((site) => (
            <div key={site.id} className="bg-white rounded-lg shadow border hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{site.name}</h3>
                    <div className="flex items-center text-gray-500 text-sm mb-2">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      <span>{site.address}</span>
                    </div>
                    <p className="text-sm text-gray-600">Manager: {site.manager}</p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(site.status)}`}>
                    {site.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center">
                      <VideoCameraIcon className="h-4 w-4 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500">Cameras</p>
                        <p className="text-lg font-semibold text-gray-900">{site.cameras}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center">
                      <BuildingOfficeIcon className="h-4 w-4 text-red-600 mr-2" />
                      <div>
                        <p className="text-sm text-gray-500">Alerts</p>
                        <p className="text-lg font-semibold text-gray-900">{site.alerts}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className={`h-2 rounded-full ${site.safetyScore >= 90 ? 'bg-green-600' : site.safetyScore >= 70 ? 'bg-yellow-600' : 'bg-red-600'}`}
                        style={{ width: `${site.safetyScore}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-900">{site.safetyScore}% Safety</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-900" title="View Details">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button className="text-indigo-600 hover:text-indigo-900" title="Edit Site">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900" title="Delete Site">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-3 text-xs text-gray-500">
                  Last activity: {site.lastActivity} • Created: {site.createdAt}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredSites.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <BuildingOfficeIcon className="h-12 w-12" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No sites found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first site.'
              }
            </p>
            <div className="mt-6">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center mx-auto">
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Site
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Site Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{sites.length}</div>
              <div className="text-sm text-gray-500">Total Sites</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {sites.filter(s => s.status === 'active').length}
              </div>
              <div className="text-sm text-gray-500">Active Sites</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {sites.filter(s => s.status === 'maintenance').length}
              </div>
              <div className="text-sm text-gray-500">In Maintenance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {sites.reduce((sum, site) => sum + site.cameras, 0)}
              </div>
              <div className="text-sm text-gray-500">Total Cameras</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 