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
  // MUST match the host that actually serves the site. nexxau.com 301s to
  // www.nexxau.com (Vercel domain setting), but this used to be the non-www host, so
  // every page emitted <link rel="canonical" href="https://nexxau.com/...">. Google
  // indexed the homepage under the non-www hostname, then found nothing there but a
  // redirect — and since Google scopes one favicon per *hostname*, read off that
  // hostname's home page, the root result fell back to the default globe while www
  // subpages kept the real icon.
  metadataBase: new URL("https://www.nexxau.com"),
  alternates: {
    canonical: "/",
  },
  // Explicit rather than a single shorthand: Google accepts rel="icon" and
  // rel="shortcut icon", and declaring sizes lets it pick the 500x500 source instead
  // of the .ico. Relative paths are fine — Google's docs state the href "can be a
  // relative path or absolute path", so absolute URLs buy nothing here.
  icons: {
    icon: [
      { url: "/nexxau-logo.png", type: "image/png", sizes: "500x500" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/nexxau-logo.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Nexxau — AI PPE Compliance Monitoring",
    description:
      "Real-time hard hat and vest detection via your existing site cameras. Prevent OSHA fines and reduce workers' comp claims.",
    url: "https://www.nexxau.com",
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
