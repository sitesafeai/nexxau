import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nexxau",
  description: "Your comprehensive solution for site safety and security management.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      {
        url: "/nexxau-logo.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/nexxau-logo.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/nexxau-logo.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    title: "Nexxau",
    description: "Your comprehensive solution for site safety and security management.",
    url: "https://nexxau.com",
    siteName: "Nexxau",
    images: [
      {
        url: "/nexxau-logo.png",
        width: 1200,
        height: 630,
        alt: "Nexxau Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexxau",
    description: "Your comprehensive solution for site safety and security management.",
    images: ["/nexxau-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code", // Replace with your actual Google verification code
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
              {children}
      </body>
    </html>
  );
}
