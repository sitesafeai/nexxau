'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from "../../../../components/AdminLayout";
import { CldImage } from 'next-cloudinary';
import { CalendarIcon, UserIcon, TagIcon, ArrowLeftIcon, LinkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Head from 'next/head';

interface BlogPost {
  id: string;
  title: string;
  description: string;
  content: string;
  featuredImage: string;
  category: string;
  tags: string[];
  author: {
    name: string;
  };
  publishedAt: string | null;
  status: string;
}

export default function PreviewBlogPost({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [params.id]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/blog/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch post');
      const data = await response.json();
      setPost(data);
    } catch (err) {
      setError('Failed to load post');
      console.error('Error fetching post:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyPreviewLink = async () => {
    const previewUrl = `${window.location.origin}/admin/blog/preview/${params.id}`;
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!post) {
    return (
      <AdminLayout>
        <div className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {error || 'Post not found'}
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>{post.title} - Preview</title>
        <meta name="description" content={post.description} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:image" content={post.featuredImage} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.description} />
        <meta name="twitter:image" content={post.featuredImage} />
      </Head>

      <AdminLayout>
        <div className="min-h-screen bg-gray-50">
          {/* Back to Blog and Copy Link */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link
                href="/admin/blog"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back to Blog
              </Link>
              <button
                onClick={copyPreviewLink}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                {copySuccess ? 'Link Copied!' : 'Copy Preview Link'}
              </button>
            </div>
          </div>

          {/* Article Header */}
          <article className="relative isolate">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
              <div className="mx-auto max-w-2xl">
                {/* Article Metadata */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-8">
                  <span className="inline-flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Draft'}
                  </span>
                  <span className="inline-flex items-center">
                    <UserIcon className="h-4 w-4 mr-1" />
                    {post.author.name}
                  </span>
                  <span className="inline-flex items-center">
                    <TagIcon className="h-4 w-4 mr-1" />
                    {post.category}
                  </span>
                </div>

                {/* Article Title */}
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                  {post.title}
                </h1>

                {/* Article Description */}
                <p className="mt-6 text-xl text-gray-600">
                  {post.description}
                </p>

                {/* Featured Image */}
                <div className="mt-8 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-gray-100">
                  <CldImage
                    src={post.featuredImage}
                    alt={post.title}
                    width={1200}
                    height={630}
                    className="h-full w-full object-cover"
                    priority
                  />
                </div>

                {/* Article Content */}
                <div 
                  className="mt-12 prose prose-lg prose-blue mx-auto"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />

                {/* Tags */}
                <div className="mt-12 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600 ring-1 ring-inset ring-blue-600/10"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Status Badge */}
                <div className="mt-8">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                      post.status === 'published'
                        ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                        : 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
                    }`}
                  >
                    {post.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </AdminLayout>
    </>
  );
} 