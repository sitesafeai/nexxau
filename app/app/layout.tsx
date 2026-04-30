import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "./components/SessionProviderWrapper";
import Navigation from "./components/Navigation";
import ConditionalNavigation from "./components/ConditionalNavigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nexxau — AI PPE Compliance Monitoring",
  description:
    "Real-time hard hat and vest detection via your existing site cameras. Prevent OSHA fines and reduce workers' comp claims.",
  metadataBase: new URL("https://nexxau.com"),
  icons: {
    icon: "/nexxau-logo.png",
    apple: "/nexxau-logo.png",
  },
  openGraph: {
    title: "Nexxau — AI PPE Compliance Monitoring",
    description:
      "Real-time hard hat and vest detection via your existing site cameras. Prevent OSHA fines and reduce workers' comp claims.",
    url: "https://nexxau.com",
    siteName: "Nexxau",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Nexxau PPE Compliance Monitoring",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexxau — AI PPE Compliance Monitoring",
    description:
      "Real-time hard hat and vest detection via your existing site cameras. Prevent OSHA fines and reduce workers' comp claims.",
    images: ["/og-image.svg"],
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
