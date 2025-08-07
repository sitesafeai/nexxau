'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import { 
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  status: 'published' | 'draft' | 'archived';
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  featured: boolean;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setPosts([
        {
          id: '1',
          title: 'The Future of Safety Technology in Construction',
          slug: 'future-safety-technology-construction',
          excerpt: 'Exploring how AI and computer vision are revolutionizing safety protocols in the construction industry.',
          content: 'Full article content here...',
          author: 'John Smith',
          status: 'published',
          publishedAt: '2024-01-15',
          createdAt: '2024-01-10',
          updatedAt: '2024-01-15',
          tags: ['AI', 'Safety', 'Construction'],
          featured: true
        },
        {
          id: '2',
          title: 'Best Practices for Site Safety Management',
          slug: 'best-practices-site-safety-management',
          excerpt: 'A comprehensive guide to implementing effective safety management systems on construction sites.',
          content: 'Full article content here...',
          author: 'Sarah Johnson',
          status: 'published',
          publishedAt: '2024-01-20',
          createdAt: '2024-01-18',
          updatedAt: '2024-01-20',
          tags: ['Safety', 'Management', 'Guidelines'],
          featured: false
        },
        {
          id: '3',
          title: 'Understanding OSHA Compliance Requirements',
          slug: 'osha-compliance-requirements',
          excerpt: 'Everything you need to know about OSHA compliance and how to maintain safety standards.',
          content: 'Full article content here...',
          author: 'Mike Wilson',
          status: 'draft',
          publishedAt: '',
          createdAt: '2024-01-25',
          updatedAt: '2024-01-25',
          tags: ['OSHA', 'Compliance', 'Regulations'],
          featured: false
        },
        {
          id: '4',
          title: 'Case Study: Reducing Accidents by 60%',
          slug: 'case-study-reducing-accidents-60',
          excerpt: 'How one construction company achieved a 60% reduction in workplace accidents using Nexxau.',
          content: 'Full article content here...',
          author: 'Emily Davis',
          status: 'published',
          publishedAt: '2024-02-01',
          createdAt: '2024-01-28',
          updatedAt: '2024-02-01',
          tags: ['Case Study', 'Success Story', 'Safety'],
          featured: true
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    
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
            <h1 className="text-3xl font-bold text-gray-900">Blog Management</h1>
            <p className="text-gray-600">Manage your blog posts and content</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" />
            New Post
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Posts</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title, excerpt, or author..."
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
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPosts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg shadow border hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
                    <p className="text-gray-600 text-sm mb-3">{post.excerpt}</p>
                  </div>
                  {post.featured && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Featured
                    </span>
                  )}
                </div>
                
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <UserIcon className="h-4 w-4 mr-1" />
                  <span className="mr-4">{post.author}</span>
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  <span>{post.publishedAt || post.createdAt}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(post.status)}`}>
                      {post.status}
                    </span>
                    <div className="flex space-x-1">
                      {post.tags.slice(0, 2).map((tag, index) => (
                        <span key={index} className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          {tag}
                        </span>
                      ))}
                      {post.tags.length > 2 && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          +{post.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-900" title="View Post">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button className="text-indigo-600 hover:text-indigo-900" title="Edit Post">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900" title="Delete Post">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <DocumentTextIcon className="h-12 w-12" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No blog posts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating your first blog post.'
              }
            </p>
            <div className="mt-6">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center mx-auto">
                <PlusIcon className="h-5 w-5 mr-2" />
                New Post
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Blog Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{posts.length}</div>
              <div className="text-sm text-gray-500">Total Posts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {posts.filter(p => p.status === 'published').length}
              </div>
              <div className="text-sm text-gray-500">Published</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {posts.filter(p => p.status === 'draft').length}
              </div>
              <div className="text-sm text-gray-500">Drafts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {posts.filter(p => p.featured).length}
              </div>
              <div className="text-sm text-gray-500">Featured</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 