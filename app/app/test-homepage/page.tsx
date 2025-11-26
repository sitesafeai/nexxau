'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AlertTriangle, Eye, Shield, Camera, CheckCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface Detection {
  id: number;
  type: string;
  x: number;
  y: number;
}

export default function TestHomepage() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date().toLocaleTimeString());
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newDetection = {
        id: Date.now(),
        type: Math.random() > 0.5 ? 'hardhat' : 'vest',
        x: Math.random() * 70 + 15,
        y: Math.random() * 60 + 20,
      };
      setDetections(prev => [...prev.slice(-2), newDetection]);
      setTimeout(() => {
        setDetections(prev => prev.filter(d => d.id !== newDetection.id));
      }, 2500);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a1628]/90 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/test-homepage" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Image src="/nexxau-logo-resized.png" alt="Nexxau Logo" width={32} height={32} className="w-8 h-8 object-contain" />
              <span className="text-xl tracking-tight text-white font-bold">NEXXAU</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/test-homepage" className="text-[#8b9bb1] hover:text-white transition-colors text-sm">Home</Link>
              <Link href="/features" className="text-[#8b9bb1] hover:text-white transition-colors text-sm">Features</Link>
              <Link href="/industries" className="text-[#8b9bb1] hover:text-white transition-colors text-sm">Industries</Link>
              <Link href="/partners/insurance" className="text-[#8b9bb1] hover:text-white transition-colors text-sm">For Insurance</Link>
              <Link href="/about" className="text-[#8b9bb1] hover:text-white transition-colors text-sm">About</Link>
              <Link href="/contact" className="text-[#8b9bb1] hover:text-white transition-colors text-sm">Contact</Link>
            </nav>
            <Link href="/contact/sales" className="px-4 py-1.5 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
              Request Demo
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-20">
          <div className="scanline-effect absolute inset-0" />
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }} />
          </div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Content */}
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="space-y-6">
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
                  <Link href="/features" className="px-5 py-2.5 border border-white/20 text-white hover:bg-white/10 rounded-lg transition-colors font-semibold text-sm flex items-center gap-2">
                    See Features <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Pilot Badge */}
                <div className="pt-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#22c55e]/10 text-[#22c55e] text-xs font-medium rounded-full border border-[#22c55e]/30">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Now enrolling pilot partners — 30-day trial
                  </span>
                </div>
              </motion.div>

              {/* Right: Live Detection Demo */}
              <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="relative">
                <div className="relative aspect-[4/3] bg-[#1e3a5f] rounded-lg overflow-hidden border border-white/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] to-[#0a1628]">
                    <div className="absolute inset-0 opacity-30">
                      <Image src="https://images.unsplash.com/photo-1636790921342-cbdc4b783de6?w=800" alt="" fill className="object-cover blur-sm" />
                    </div>
                  </div>

                  {/* HUD Overlay */}
                  <div className="absolute inset-0 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse" />
                        <span className="text-xs text-white/60 font-mono">LIVE</span>
                      </div>
                      <span className="text-xs text-white/60 font-mono">{currentTime || '--:--:--'}</span>
                    </div>

                    {/* Detection boxes */}
                    {detections.map((detection) => (
                      <motion.div
                        key={detection.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute"
                        style={{ left: `${detection.x}%`, top: `${detection.y}%` }}
                      >
                        <div className={`w-16 h-16 ${detection.type === 'hardhat' ? 'border-[#fbbf24]' : 'border-[#ef4444]'} border-2 rounded`}>
                          <div className={`absolute -top-5 left-0 text-xs ${detection.type === 'hardhat' ? 'text-[#fbbf24]' : 'text-[#ef4444]'} whitespace-nowrap font-mono`}>
                            {detection.type === 'hardhat' ? 'NO HARDHAT' : 'NO VEST'}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Alert banner */}
                  <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ duration: 0.5, delay: 1 }} className="absolute bottom-0 left-0 right-0 bg-[#ef4444]/90 backdrop-blur-sm p-3">
                    <div className="flex items-center gap-2 text-white">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-mono">VIOLATION DETECTED • Alert sent to supervisor</span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Problem - Short */}
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

        {/* Solution - Short */}
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

        {/* Industries - Compact */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Built for High-Risk Environments</h2>
            </div>
            <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
              {['Construction', 'Manufacturing', 'Logistics', 'Oil & Gas', 'Energy'].map((industry) => (
                <div key={industry} className="px-5 py-2.5 bg-[#1e3a5f] rounded-lg border border-white/10 text-white text-sm">
                  {industry}
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/industries" className="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center gap-2">
                See industry-specific detection <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* For Insurance - Brief */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-blue-400 text-sm font-semibold mb-2">FOR INSURANCE</p>
                <h2 className="text-3xl font-bold text-white mb-4">Safety Data for Smarter Underwriting</h2>
                <p className="text-[#8b9bb1] mb-6">Objective risk scores. Video evidence. Violation trends. The data underwriters actually need.</p>
                <Link href="/partners/insurance" className="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center gap-2">
                  Learn about insurance partnerships <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#8b9bb1]">Site-level violation frequency and severity</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#8b9bb1]">Contractor comparison scoring</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#8b9bb1]">Pre-incident video evidence for claims</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#8b9bb1]">API access for actuarial models</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Pilot CTA */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Start With a 30-Day Pilot</h2>
              <p className="text-[#8b9bb1] mb-8">One site. Full functionality. You pay only if you proceed after the trial.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/contact/sales" className="px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
                  Request Demo
                </Link>
                <Link href="/contact" className="px-6 py-3 border border-white/20 text-white hover:bg-white/10 rounded-lg transition-colors font-semibold text-sm">
                  Talk to Sales
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#0a1628] border-t border-white/10 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Image src="/nexxau-logo-resized.png" alt="Nexxau Logo" width={24} height={24} className="w-6 h-6 object-contain" />
              <span className="text-white font-bold">NEXXAU</span>
            </div>
            <nav className="flex flex-wrap gap-6 text-sm text-[#8b9bb1]">
              <Link href="/features" className="hover:text-white">Features</Link>
              <Link href="/industries" className="hover:text-white">Industries</Link>
              <Link href="/partners/insurance" className="hover:text-white">Insurance</Link>
              <Link href="/about" className="hover:text-white">About</Link>
              <Link href="/contact" className="hover:text-white">Contact</Link>
            </nav>
            <p className="text-xs text-[#8b9bb1]">© 2025 Nexxau. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
