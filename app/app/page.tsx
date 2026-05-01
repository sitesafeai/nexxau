import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { AlertTriangle, Eye, Shield, Camera, CheckCircle, ArrowRight } from 'lucide-react';
import MarketingNavbar from './components/MarketingNavbar';
import HomePageBanner from './components/HomePageBanner';

export const metadata: Metadata = {
  title: 'AI-Powered PPE Compliance Monitoring for Construction Sites | Nexxau',
  description: 'Automated PPE violation detection for construction and industrial sites. Hardhat, safety vest, and zone compliance monitoring with real-time alerts. Reduce violations by 80%+ with existing cameras.',
  keywords: ['PPE compliance', 'construction safety monitoring', 'hardhat detection', 'safety violation detection', 'OSHA compliance software'],
  openGraph: {
    title: 'AI-Powered PPE Compliance Monitoring for Construction Sites | Nexxau',
    description: 'Automated PPE violation detection for construction and industrial sites. Hardhat, safety vest, and zone compliance monitoring with real-time alerts.',
    url: 'https://nexxau.com',
    siteName: 'Nexxau',
    type: 'website',
  },
  alternates: {
    canonical: 'https://nexxau.com',
  },
};

/** Hero mock detection overlays — positions are % of the image card */
const heroDetectionBoxes: {
  key: string;
  left: string;
  bottom: string;
  label: string;
  tone: 'alert' | 'ok';
  /** Optional; default min(14%, 4.5rem) */
  height?: string;
  /** Extra classes on the label (e.g. nudge position) */
  labelClassName?: string;
}[] = [
  {
    key: 'vest',
    left: '84%',
    bottom: '12%',
    label: 'NO VEST',
    tone: 'alert',
    /* Extra height so top clears head (was ~nose); extends upward */
    height: 'min(36%, 11.5rem)',
  },
  { key: 'clear-center', left: '53%', bottom: '17%', label: 'NO ALERTS', tone: 'ok', height: 'min(16%, 5.25rem)' },
  {
    key: 'compliant-a',
    left: '4%',
    bottom: '20%',
    label: 'NO ALERTS',
    tone: 'ok',
    height: 'min(24%, 7.5rem)',
    labelClassName: '-translate-x-1',
  },
  { key: 'compliant-b', left: '36%', bottom: '19%', label: 'NO ALERTS', tone: 'ok', height: 'min(20%, 6.25rem)' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a1628]">
      <MarketingNavbar variant="dark" />
      <HomePageBanner />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-20">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }} />
          </div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl tracking-tight text-white leading-[1.1]">
                  PPE Violations Caught in Under 2 Seconds
                </h1>
                <p className="text-lg text-[#8b9bb1] max-w-xl">
                  Your existing cameras become safety monitors. Hardhat missing? Zone breached? You know immediately — not after an incident report.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Link href="/contact/sales" className="px-5 py-2.5 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
                    Request Demo
                  </Link>
                  <Link href="/ppe-compliance-monitoring" className="px-5 py-2.5 border border-white/20 text-white hover:bg-white/10 rounded-lg transition-colors font-semibold text-sm flex items-center gap-2">
                    See How It Works <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="pt-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#22c55e]/10 text-[#22c55e] text-xs font-medium rounded-full border border-[#22c55e]/30">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Now enrolling pilot partners — 30-day trial
                  </span>
                </div>
              </div>

              <div className="relative">
                <div className="relative aspect-[4/3] bg-[#1e3a5f] rounded-lg overflow-visible border border-white/20">
                  <div className="absolute inset-0 rounded-lg overflow-hidden bg-gradient-to-br from-[#1e3a5f] to-[#0a1628]">
                    <div className="absolute inset-0 opacity-30">
                      <Image src="https://images.unsplash.com/photo-1636790921342-cbdc4b783de6?w=800" alt="Construction site safety monitoring" fill className="object-cover" />
                    </div>
                  </div>
                  {/* Camera recording indicator (top-right) */}
                  <div
                    className="absolute top-3 right-3 z-[7] flex items-center gap-1.5 pointer-events-none select-none"
                    aria-hidden
                  >
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/40" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500 animate-rec-led ring-1 ring-red-400/90" />
                    </span>
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                      Rec
                    </span>
                  </div>
                  {heroDetectionBoxes.map((box) => {
                    const isAlert = box.tone === 'alert';
                    return (
                      <div
                        key={box.key}
                        className={`absolute z-[5] pointer-events-none rounded-sm border-2 border-dashed shadow-[0_0_0_1px_rgba(0,0,0,0.35)] ${
                          isAlert ? 'border-red-500' : 'border-emerald-400'
                        }`}
                        style={{
                          left: box.left,
                          bottom: box.bottom,
                          width: 'min(8%, 3.5rem)',
                          height: box.height ?? 'min(14%, 4.5rem)',
                          transform: 'translateX(-50%)',
                        }}
                        aria-hidden
                      >
                        <span
                          className={`absolute top-full left-1/2 mt-1 -translate-x-1/2 text-[9px] font-mono px-1 py-0.5 rounded whitespace-nowrap max-w-[90vw] text-center leading-tight bg-black/80 ${
                            isAlert
                              ? 'text-red-300 border border-red-500/70'
                              : 'text-emerald-300 border border-emerald-500/70'
                          } ${box.labelClassName ?? ''}`}
                        >
                          {box.label}
                        </span>
                      </div>
                    );
                  })}
                  <div className="absolute inset-0 z-[6] flex items-center justify-center pointer-events-none">
                    <p className="text-white text-sm font-mono tracking-wide drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
                      Live Detection Active
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">The Problem With Manual Safety Checks</h2>
              <p className="text-[#8b9bb1]">Random patrols catch maybe 5% of violations. The rest go undocumented — until something goes wrong.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10 text-center">
                <Eye className="h-8 w-8 text-red-400 mx-auto mb-3" />
                <p className="text-white font-semibold mb-2">Inconsistent</p>
                <p className="text-sm text-[#8b9bb1]">Enforcement varies by shift and who's walking the site</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10 text-center">
                <Camera className="h-8 w-8 text-red-400 mx-auto mb-3" />
                <p className="text-white font-semibold mb-2">No Evidence</p>
                <p className="text-sm text-[#8b9bb1]">When incidents happen, there's no documented history</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10 text-center">
                <Shield className="h-8 w-8 text-red-400 mx-auto mb-3" />
                <p className="text-white font-semibold mb-2">No Data</p>
                <p className="text-sm text-[#8b9bb1]">Insurers get nothing but self-reported audits</p>
              </div>
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">How Nexxau Fixes This</h2>
              <p className="text-[#8b9bb1]">Connect your existing IP cameras. We handle detection, alerts, and documentation.</p>
            </div>
            <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Camera className="h-6 w-6 text-blue-400" />
                </div>
                <p className="text-white font-semibold text-sm">Connect Cameras</p>
                <p className="text-xs text-[#8b9bb1] mt-1">RTSP feed, no new hardware</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Eye className="h-6 w-6 text-blue-400" />
                </div>
                <p className="text-white font-semibold text-sm">AI Detects</p>
                <p className="text-xs text-[#8b9bb1] mt-1">PPE, zones, proximity</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-6 w-6 text-blue-400" />
                </div>
                <p className="text-white font-semibold text-sm">Alerts Sent</p>
                <p className="text-xs text-[#8b9bb1] mt-1">Mobile, email, SMS</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-blue-400" />
                </div>
                <p className="text-white font-semibold text-sm">Data Logged</p>
                <p className="text-xs text-[#8b9bb1] mt-1">Video + metrics for insurers</p>
              </div>
            </div>
          </div>
        </section>

        {/* Industries Section */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Built for High-Risk Environments</h2>
            </div>
            <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
              {['Construction', 'Manufacturing', 'Logistics', 'Oil & Gas', 'Energy'].map((industry) => (
                <Link key={industry} href={`/industries/${industry.toLowerCase().replace(' & ', '-').replace(' ', '-')}`} className="px-5 py-2.5 bg-[#1e3a5f] rounded-lg border border-white/10 text-white text-sm hover:bg-[#1e3a5f]/80 transition-colors">
                  {industry}
                </Link>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/industries/construction" className="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center gap-2">
                See industry-specific detection <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Start With a 30-Day Pilot</h2>
              <p className="text-[#8b9bb1] mb-8">One site. Full functionality. You pay only if you proceed after the trial.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/contact/sales" className="px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
                  Request Demo
                </Link>
                <Link href="/pricing" className="px-6 py-3 border border-white/20 text-white hover:bg-white/10 rounded-lg transition-colors font-semibold text-sm">
                  View Pricing
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#0a1628] border-t border-white/10 py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image src="/nexxau-logo.png" alt="Nexxau Logo" width={24} height={24} className="w-6 h-6 object-contain" />
                <span className="text-white font-bold">NEXXAU</span>
              </div>
              <p className="text-sm text-[#8b9bb1]">AI-powered safety monitoring for construction and industrial sites.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4 text-sm">Solutions</h3>
              <ul className="space-y-2 text-sm text-[#8b9bb1]">
                <li><Link href="/ppe-compliance-monitoring" className="hover:text-white">PPE Compliance</Link></li>
                <li><Link href="/hard-hat-detection-software" className="hover:text-white">Hard Hat Detection</Link></li>
                <li><Link href="/high-visibility-vest-detection" className="hover:text-white">Vest Detection</Link></li>
                <li><Link href="/osha-ppe-compliance-software" className="hover:text-white">OSHA Compliance</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4 text-sm">Resources</h3>
              <ul className="space-y-2 text-sm text-[#8b9bb1]">
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/demo" className="hover:text-white">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4 text-sm">Company</h3>
              <ul className="space-y-2 text-sm text-[#8b9bb1]">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center">
            <p className="text-xs text-[#8b9bb1]">© 2025 Nexxau. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

