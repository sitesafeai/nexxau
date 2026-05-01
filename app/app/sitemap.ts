import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.nexxau.com";
  const lastModified = new Date();

  return [
    {
      url: baseUrl,
      lastModified,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/features`,
      lastModified,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/features`,
      lastModified,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/industries`,
      lastModified,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/industries/construction`,
      lastModified,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/industries/manufacturing`,
      lastModified,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/industries/logistics`,
      lastModified,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/industries/oil-gas`,
      lastModified,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/industries/energy`,
      lastModified,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/ppe-compliance-monitoring`,
      lastModified,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/hard-hat-detection-software`,
      lastModified,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/high-visibility-vest-detection`,
      lastModified,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/osha-ppe-compliance-software`,
      lastModified,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/partners/insurance`,
      lastModified,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/demo`,
      lastModified,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/about`,
      lastModified,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified,
      priority: 0.6,
    },
  ];
}

