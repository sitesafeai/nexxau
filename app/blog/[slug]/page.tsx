import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Link from 'next/link';
import { CalendarIcon, UserIcon, TagIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { CloudinaryImage } from '../../lib/cloudinary';
import { prisma } from '@/lib/prisma';

// This would typically come from your CMS or database
const getBlogPost = async (slug: string) => {
  // Simulated blog post data - replace with actual data fetching
  const posts = {
    'ai-safety-monitoring': {
      title: 'The Future of AI in Construction Safety',
      description: 'Discover how artificial intelligence is revolutionizing safety protocols in the construction industry.',
      content: '...', // Full blog post content
      author: 'Sarah Johnson',
      date: '2024-03-15',
      category: 'Technology',
      readTime: '5 min read',
      image: 'blog/ai-construction', // Cloudinary public ID
      keywords: ['AI safety', 'construction safety', 'safety monitoring', 'artificial intelligence', 'workplace safety'],
      slug: 'ai-safety-monitoring',
    },
    // Add more blog posts here
  };

  return posts[slug as keyof typeof posts];
};

// Generate metadata for the blog post
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getBlogPost(params.slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.keywords,
      images: [
        {
          url: post.image,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [post.image],
    },
    alternates: {
      canonical: `https://sitesafe.com/blog/${post.slug}`,
    },
  };
}

interface BlogPostProps {
  params: { slug: string };
}

export default async function BlogPost({ params }: BlogPostProps) {
  const post = await prisma.blogPost.findUnique({
    where: { slug: params.slug },
    include: { author: { select: { name: true } } },
  });

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/blog" className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-8">
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Blog
        </Link>
        <h1 className="text-4xl font-bold mb-4 text-gray-900">{post.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
          <span className="inline-flex items-center">
            <CalendarIcon className="h-4 w-4 mr-1" />
            {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}
          </span>
          <span className="inline-flex items-center">
            <UserIcon className="h-4 w-4 mr-1" />
            {post.author?.name || 'SiteSafe Team'}
          </span>
          <span className="inline-flex items-center">
            <TagIcon className="h-4 w-4 mr-1" />
            {post.category}
          </span>
        </div>
        {post.featuredImage && (
          <div className="mb-8">
            <CloudinaryImage
              src={post.featuredImage}
              alt={post.title}
              width={800}
              height={400}
              className="rounded-lg w-full object-cover"
            />
          </div>
        )}
        <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900 prose-a:text-blue-600 prose-li:text-gray-800 prose-blockquote:text-gray-800" dangerouslySetInnerHTML={{ __html: post.content }} />
      </div>
    </div>
  );
} 