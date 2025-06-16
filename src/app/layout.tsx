import { Inter } from 'next/font/google';
import './globals.css';
import { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Nexxau - AI-Powered Safety Solutions',
  description: 'Nexxau provides AI-powered safety solutions for high-risk industries.',
  icons: {
    icon: '/nexxau-logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/nexxau-logo.png" type="image/png" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
