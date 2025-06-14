import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | SiteSafe Blog',
    default: 'SiteSafe Blog - Industrial Safety Insights & Best Practices',
  },
  description: 'Expert insights, industry news, and best practices for industrial safety. Learn about AI-powered safety monitoring, compliance, and workplace protection.',
  keywords: ['industrial safety', 'workplace safety', 'safety monitoring', 'AI safety', 'construction safety', 'manufacturing safety', 'safety compliance', 'safety best practices'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://sitesafe.com/blog',
    siteName: 'SiteSafe Blog',
    title: 'SiteSafe Blog - Industrial Safety Insights & Best Practices',
    description: 'Expert insights, industry news, and best practices for industrial safety. Learn about AI-powered safety monitoring, compliance, and workplace protection.',
    images: [
      {
        url: '/images/blog-og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'SiteSafe Blog',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SiteSafe Blog - Industrial Safety Insights & Best Practices',
    description: 'Expert insights, industry news, and best practices for industrial safety. Learn about AI-powered safety monitoring, compliance, and workplace protection.',
    images: ['/images/blog-og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-site-verification', // Replace this with your actual verification code from Google Search Console
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Google Search Console Verification */}
      <meta name="google-site-verification" content="your-google-site-verification" />
      {children}
    </>
  );
} 