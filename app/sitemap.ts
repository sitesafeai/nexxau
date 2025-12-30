import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://nexxau.com';

  // Static routes
  const routes = [
    '',
    '/ppe-compliance-monitoring',
    '/hard-hat-detection-software',
    '/high-visibility-vest-detection',
    '/construction-site-safety-monitoring',
    '/osha-ppe-compliance-software',
    '/industries/construction',
    '/industries/manufacturing',
    '/industries/logistics',
    '/industries/oil-and-gas',
    '/pricing',
    '/blog',
    '/demo',
    '/contact',
    '/about',
    '/terms',
    '/privacy',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  return routes;
}
