'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  CheckCircle,
  XCircle,
  Archive,
  Eye,
  EyeOff,
  MessageSquare,
  Clock,
  User,
  Building2,
  Filter,
  Search,
  Loader2,
} from 'lucide-react';

interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  company: string | null;
  industry: string | null;
  message: string;
  sourcePage: string | null;
  status: 'UNREAD' | 'READ' | 'REPLIED' | 'RESOLVED' | 'ARCHIVED';
  isRead: boolean;
  repliedAt: string | null;
  resolvedAt: string | null;
  notes: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ContactInquiriesTab() {
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'UNREAD' | 'READ' | 'REPLIED' | 'RESOLVED' | 'ARCHIVED'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiry | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadInquiries();
  }, [filter]);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }
      const response = await fetch(`/api/admin/inquiries?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load inquiries' }));
        console.error('[ContactInquiriesTab] API Error Response:', errorData);
        const errorMsg = errorData.details || errorData.error || `Failed to load inquiries: ${response.status}`;
        if (errorData.debug) {
          console.error('[ContactInquiriesTab] Debug info:', errorData.debug);
        }
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      if (data.success) {
        setInquiries(data.data || []);
      } else {
        setError(data.error || 'Failed to load inquiries');
        setInquiries([]);
      }
    } catch (error) {
      console.error('Error loading inquiries:', error);
      setError(error instanceof Error ? error.message : 'Failed to load inquiries');
      setInquiries([]);
    } finally {
      setLoading(false);
    }
  };

  const updateInquiry = async (id: string, updates: Partial<ContactInquiry>) => {
    try {
      setUpdating(id);
      const response = await fetch(`/api/admin/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update inquiry' }));
        throw new Error(errorData.error || `Failed to update inquiry: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        await loadInquiries();
        if (selectedInquiry?.id === id) {
          setSelectedInquiry(data.data);
        }
      } else {
        console.error('Update failed:', data.error);
      }
    } catch (error) {
      console.error('Error updating inquiry:', error);
      alert(error instanceof Error ? error.message : 'Failed to update inquiry');
    } finally {
      setUpdating(null);
    }
  };

  const filteredInquiries = inquiries.filter((inquiry) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        inquiry.name.toLowerCase().includes(search) ||
        inquiry.email.toLowerCase().includes(search) ||
        (inquiry.company && inquiry.company.toLowerCase().includes(search)) ||
        inquiry.message.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const unreadCount = inquiries.filter((i) => !i.isRead).length;
  const statusCounts = {
    UNREAD: inquiries.filter((i) => i.status === 'UNREAD').length,
    READ: inquiries.filter((i) => i.status === 'READ').length,
    REPLIED: inquiries.filter((i) => i.status === 'REPLIED').length,
    RESOLVED: inquiries.filter((i) => i.status === 'RESOLVED').length,
    ARCHIVED: inquiries.filter((i) => i.status === 'ARCHIVED').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Contact Inquiries</h2>
          <p className="text-gray-400 mt-1">
            Manage demo requests and messages from website visitors
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-semibold">
              {unreadCount} unread
            </span>
          )}
          <button
            onClick={loadInquiries}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search inquiries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All', count: inquiries.length },
              { key: 'UNREAD', label: 'Unread', count: statusCounts.UNREAD },
              { key: 'REPLIED', label: 'Replied', count: statusCounts.REPLIED },
              { key: 'RESOLVED', label: 'Resolved', count: statusCounts.RESOLVED },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {f.label} {f.count > 0 && `(${f.count})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inquiries List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      ) : error ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center border border-red-700">
          <XCircle className="h-16 w-16 mx-auto text-red-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Error Loading Inquiries</h3>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={loadInquiries}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
          <Mail className="h-16 w-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Inquiries Found</h3>
          <p className="text-gray-400">
            {searchTerm ? 'Try adjusting your search terms' : 'No contact inquiries yet'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredInquiries.map((inquiry) => (
            <div
              key={inquiry.id}
              className={`bg-gray-800 rounded-xl p-6 border ${
                !inquiry.isRead ? 'border-blue-500' : 'border-gray-700'
              } hover:border-gray-600 transition-all cursor-pointer`}
              onClick={() => {
                setSelectedInquiry(inquiry);
                setNotes(inquiry.notes || '');
                if (!inquiry.isRead) {
                  updateInquiry(inquiry.id, { isRead: true, status: 'READ' });
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {!inquiry.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                    <h3 className="text-lg font-semibold text-white">{inquiry.name}</h3>
                    <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                      {inquiry.status}
                    </span>
                    {inquiry.sourcePage && (
                      <span className="px-2 py-1 bg-purple-600/20 text-purple-300 rounded text-xs">
                        {inquiry.sourcePage}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {inquiry.email}
                    </span>
                    {inquiry.company && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {inquiry.company}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(inquiry.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-300 line-clamp-2">{inquiry.message}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateInquiry(inquiry.id, {
                        isRead: !inquiry.isRead,
                        status: inquiry.isRead ? 'UNREAD' : 'READ',
                      });
                    }}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title={inquiry.isRead ? 'Mark as unread' : 'Mark as read'}
                  >
                    {inquiry.isRead ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-blue-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedInquiry.name}</h2>
                <p className="text-gray-400 mt-1">{selectedInquiry.email}</p>
              </div>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <XCircle className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Company</label>
                  <p className="text-white">{selectedInquiry.company || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Industry</label>
                  <p className="text-white">{selectedInquiry.industry || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Source Page</label>
                  <p className="text-white">{selectedInquiry.sourcePage || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Status</label>
                  <p className="text-white">{selectedInquiry.status}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Message</label>
                <div className="bg-gray-800 rounded-lg p-4 text-white whitespace-pre-wrap">
                  {selectedInquiry.message}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Admin Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => {
                    if (notes !== selectedInquiry.notes) {
                      updateInquiry(selectedInquiry.id, { notes });
                    }
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Add notes about this inquiry..."
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-700">
                <button
                  onClick={() => {
                    updateInquiry(selectedInquiry.id, { status: 'REPLIED' });
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Mark as Replied
                </button>
                <button
                  onClick={() => {
                    updateInquiry(selectedInquiry.id, { status: 'RESOLVED' });
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark as Resolved
                </button>
                <button
                  onClick={() => {
                    updateInquiry(selectedInquiry.id, { status: 'ARCHIVED' });
                    setSelectedInquiry(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
