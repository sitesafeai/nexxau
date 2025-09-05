import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "./components/SessionProviderWrapper";
import Navigation from "./components/Navigation";
import ConditionalNavigation from "./components/ConditionalNavigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nexxau - AI-Powered Safety Monitoring",
  description: "Advanced safety monitoring and compliance management for construction and industrial sites",
  keywords: ["safety", "monitoring", "AI", "construction", "compliance", "workplace safety"],
  authors: [{ name: "Nexxau Team" }],
  creator: "Nexxau",
  publisher: "Nexxau",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://nexxau.com",
    title: "Nexxau - AI-Powered Safety Monitoring",
    description: "Advanced safety monitoring and compliance management for construction and industrial sites",
    siteName: "Nexxau",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexxau - AI-Powered Safety Monitoring",
    description: "Advanced safety monitoring and compliance management for construction and industrial sites",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3B82F6",
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
        <SessionProviderWrapper>
          <ConditionalNavigation />
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
