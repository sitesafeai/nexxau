import type { Metadata } from 'next';
import { HardHat, AlertTriangle, CheckCircle, Camera, Clock, FileText } from 'lucide-react';
import Link from 'next/link';
import MarketingNavbar from '../components/MarketingNavbar';

export const metadata: Metadata = {
  title: 'Hard Hat Detection Software for Construction Sites | Nexxau',
  description: 'Automated hard hat detection software for construction sites. Real-time detection of missing hardhats with instant alerts and video evidence logging. OSHA compliant.',
  keywords: ['hard hat detection software', 'hardhat detection', 'construction safety software', 'PPE detection'],
  openGraph: {
    title: 'Hard Hat Detection Software for Construction Sites | Nexxau',
    description: 'Automated hard hat detection software for construction sites. Real-time detection of missing hardhats with instant alerts.',
    url: 'https://nexxau.com/hard-hat-detection-software',
  },
  alternates: {
    canonical: 'https://nexxau.com/hard-hat-detection-software',
  },
};

export default function HardHatDetectionPage() {
  return (
    <div className="min-h-screen bg-[#0a1628]">
      <MarketingNavbar variant="dark" />

      <main className="pt-20">
        {/* Hero */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Hard Hat Detection Software for Construction Sites
            </h1>
            <p className="text-xl text-[#8b9bb1] mb-8">
              OSHA requires hardhats in areas where falling objects, electrical hazards, or head impact risks exist. Yet supervisors can't watch every worker, every moment. Violations go unnoticed until an incident occurs or an inspector arrives.
            </p>
          </div>
        </section>

        {/* OSHA Context */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">OSHA Hard Hat Requirements</h2>
            <p className="text-lg text-[#8b9bb1] mb-6">
              OSHA 29 CFR 1926.100 requires head protection when workers are exposed to falling objects, electrical hazards, or head impact risks. Construction sites, manufacturing floors, and industrial facilities must enforce hardhat compliance. Failure to do so results in citations, fines, and increased liability.
            </p>
            <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
              <h3 className="text-white font-semibold mb-3">Common Hard Hat Violations</h3>
              <ul className="space-y-2 text-[#8b9bb1]">
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span>Workers removing hardhats in break areas but forgetting to put them back on</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span>Subcontractors entering hardhat-required zones without proper head protection</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span>Workers in elevated areas without hardhats despite falling object risks</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Why Humans Miss */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">Why Human Supervision Misses Violations</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <Clock className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Can't Be Everywhere</h3>
                <p className="text-sm text-[#8b9bb1]">Supervisors can't monitor all workers simultaneously. A 50-worker site would need constant patrols to catch every violation.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <FileText className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">No Documentation</h3>
                <p className="text-sm text-[#8b9bb1]">When violations are caught manually, there's often no timestamped evidence. OSHA inspectors need proof of compliance efforts.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Nexxau Solution */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">How Nexxau Detects Missing Hardhats</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">
              Our AI analyzes video feeds from your existing cameras in real-time. When a worker enters a hardhat-required zone without proper head protection, the system detects it within 2 seconds.
            </p>
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Real-Time Detection</h3>
                  <p className="text-[#8b9bb1]">AI identifies workers without hardhats as they enter monitored zones. Detection latency is under 2 seconds from violation to alert.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Instant Alerts</h3>
                  <p className="text-[#8b9bb1]">Supervisors receive mobile push notifications, emails, or SMS alerts immediately when violations are detected. No waiting for the next patrol.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Evidence Logging + Timestamps</h3>
                  <p className="text-[#8b9bb1]">Every violation is logged with video evidence, precise timestamps, and location data. Exportable reports for OSHA inspections and insurance audits.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Zone-Based Enforcement</h3>
                  <p className="text-[#8b9bb1]">Configure hardhat requirements by zone. Workers in elevated areas, crane zones, or areas with overhead hazards are automatically monitored.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white mb-4">See Hard Hat Detection Live</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">Watch our AI detect missing hardhats in real-time during a 30-minute demo.</p>
            <Link href="/contact/sales" className="inline-block px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
              See Hard Hat Detection Live
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

