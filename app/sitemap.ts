import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://sitesafe.com';

  // Static routes
  const routes = [
    '',
    '/blog',
    '/industries',
    '/solutions',
    '/about',
    '/contact',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Blog posts (this would typically come from your CMS or database)
  const blogPosts = [
    {
      slug: 'ai-safety-monitoring',
      lastModified: new Date('2024-03-15'),
    },
    // Add more blog posts here
  ].map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.lastModified,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...routes, ...blogPosts];
} 