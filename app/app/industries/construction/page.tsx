import type { Metadata } from 'next';
import { BuildingOfficeIcon, ShieldCheckIcon, ChartBarIcon, ClockIcon, VideoCameraIcon, WrenchScrewdriverIcon, BellAlertIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import MarketingNavbar from '../../components/MarketingNavbar';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AI Safety Monitoring Built for Construction Sites | Nexxau',
  description: 'Construction site safety monitoring with automated PPE detection, zone breach alerts, and compliance logging. Reduce construction safety violations by 80%+ with existing cameras.',
  keywords: ['construction safety monitoring', 'construction site safety', 'construction PPE compliance', 'construction safety software'],
  openGraph: {
    title: 'AI Safety Monitoring Built for Construction Sites | Nexxau',
    description: 'Construction site safety monitoring with automated PPE detection, zone breach alerts, and compliance logging.',
    url: 'https://nexxau.com/industries/construction',
  },
  alternates: {
    canonical: 'https://nexxau.com/industries/construction',
  },
};

export default function ConstructionPage() {
  return (
    <div className="bg-[#0a1628] min-h-screen">
      <MarketingNavbar variant="dark" />

      <main className="pt-20">
        {/* Hero */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              AI Safety Monitoring Built for Construction Sites
            </h1>
            <p className="text-xl text-[#8b9bb1] mb-8">
              Construction sites have unique hazards: falls, struck-by incidents, crane zones, elevated work platforms. Manual safety patrols can't monitor every worker, every zone, every moment. Nexxau provides 24/7 automated monitoring using your existing cameras.
            </p>
          </div>
        </section>

        {/* Industry-Specific Hazards */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">Construction Site Hazards</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <BuildingOfficeIcon className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Falls from Height</h3>
                <p className="text-sm text-[#8b9bb1]">Workers on scaffolds, roofs, and elevated platforms without proper fall protection. Detection zones can monitor elevated work areas.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <WrenchScrewdriverIcon className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Struck-by Incidents</h3>
                <p className="text-sm text-[#8b9bb1]">Workers struck by falling objects, cranes, or heavy equipment. High-visibility vest detection helps prevent vehicle-related incidents.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <ShieldCheckIcon className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Crane Operation Zones</h3>
                <p className="text-sm text-[#8b9bb1]">Unauthorized personnel entering crane swing radius or load path. Zone breach detection alerts supervisors immediately.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <BellAlertIcon className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Subcontractor Compliance</h3>
                <p className="text-sm text-[#8b9bb1]">Different subcontractors have varying compliance standards. Automated monitoring ensures consistent enforcement across all crews.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Nexxau Features for Construction */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">How Nexxau Maps to Construction Risks</h2>
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <VideoCameraIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Hard Hat Detection</h3>
                  <p className="text-[#8b9bb1]">Detects missing hardhats in areas with falling object risks, electrical hazards, or head impact dangers. Required by OSHA 29 CFR 1926.100.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <ShieldCheckIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">High-Visibility Vest Detection</h3>
                  <p className="text-[#8b9bb1]">Monitors workers in traffic areas, loading zones, and areas with heavy equipment. Reduces struck-by vehicle incidents.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <BellAlertIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Zone Breach Detection</h3>
                  <p className="text-[#8b9bb1]">Monitors restricted zones including crane swing radius, elevated work platforms, and areas with overhead hazards. Alerts supervisors when unauthorized personnel enter.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <ChartBarIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Subcontractor Tracking</h3>
                  <p className="text-[#8b9bb1]">Tracks violation frequency by subcontractor. Identify crews with compliance issues before they become incidents.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Request Industry Demo</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">See how Nexxau monitors construction sites with industry-specific detection rules.</p>
            <Link href="/contact/sales" className="inline-block px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
              Request Industry Demo
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
