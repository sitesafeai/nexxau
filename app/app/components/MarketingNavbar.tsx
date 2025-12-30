'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Features', href: '/features' },
  { name: 'Industries', href: '/industries' },
  { name: 'For Insurance', href: '/partners/insurance' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
];

interface MarketingNavbarProps {
  variant?: 'light' | 'dark';
}

export default function MarketingNavbar({ variant = 'light' }: MarketingNavbarProps) {
  const pathname = usePathname();
  const isDark = variant === 'dark';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b ${
      isDark 
        ? 'bg-[#0a1628]/90 border-white/10' 
        : 'bg-gray-50/90 border-gray-200'
    }`}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <span className={`text-xl tracking-tight font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              NEXXAU
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm transition-colors ${
                  pathname === item.href
                    ? isDark 
                      ? 'text-white font-semibold' 
                      : 'text-gray-900 font-semibold'
                    : isDark
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
          <Link
            href="/demo"
            className={`px-4 py-2 rounded-lg transition-colors font-semibold text-sm ${
              isDark
                ? 'bg-white text-gray-900 hover:bg-white/90'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

