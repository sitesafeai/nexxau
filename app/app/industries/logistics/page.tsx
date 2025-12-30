import type { Metadata } from 'next';
import { TruckIcon, ShieldCheckIcon, ChartBarIcon, BellAlertIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import MarketingNavbar from '../../components/MarketingNavbar';

export const metadata: Metadata = {
  title: 'Logistics & Warehouse Safety Monitoring | Nexxau',
  description: 'Logistics and warehouse safety monitoring with automated PPE detection, dock door safety monitoring, and forklift proximity alerts. Reduce warehouse safety violations by 80%+.',
  keywords: ['logistics safety monitoring', 'warehouse safety software', 'dock door safety', 'forklift safety monitoring'],
  openGraph: {
    title: 'Logistics & Warehouse Safety Monitoring | Nexxau',
    description: 'Logistics and warehouse safety monitoring with automated PPE detection, dock door safety monitoring, and forklift proximity alerts.',
    url: 'https://nexxau.com/industries/logistics',
  },
  alternates: {
    canonical: 'https://nexxau.com/industries/logistics',
  },
};

export default function LogisticsPage() {
  return (
    <div className="bg-[#0a1628] min-h-screen">
      <MarketingNavbar variant="dark" />

      <main className="pt-20">
        {/* Hero */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Logistics & Warehouse Safety Monitoring
            </h1>
            <p className="text-xl text-[#8b9bb1] mb-8">
              Warehouses and logistics facilities have unique hazards: forklift collisions, dock door accidents, blind corner incidents, and high-visibility vest compliance failures. Manual supervision can't monitor every dock, every aisle, every moment. Nexxau provides 24/7 automated monitoring using your existing cameras.
            </p>
          </div>
        </section>

        {/* Logistics Hazards */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">Logistics & Warehouse Hazards</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <TruckIcon className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Forklift Collisions</h3>
                <p className="text-sm text-[#8b9bb1]">Workers struck by forklifts in blind corners, narrow aisles, or loading zones. High-visibility vest detection helps prevent incidents.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Dock Door Accidents</h3>
                <p className="text-sm text-[#8b9bb1]">Workers entering dock areas without proper safety protocols. Zone breach detection monitors dock door safety.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <ArrowPathIcon className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Blind Corner Incidents</h3>
                <p className="text-sm text-[#8b9bb1]">Workers in blind corners without high-visibility vests are at risk of being struck by forklifts. Detection ensures compliance.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <ShieldCheckIcon className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">High-Visibility Compliance</h3>
                <p className="text-sm text-[#8b9bb1]">OSHA requires high-visibility apparel in areas with vehicle traffic. Automated detection ensures consistent enforcement.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Nexxau Features for Logistics */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">How Nexxau Maps to Logistics Risks</h2>
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <BellAlertIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Blind Corner Proximity Alerts</h3>
                  <p className="text-[#8b9bb1]">Monitors workers in blind corners and narrow aisles. High-visibility vest detection helps prevent forklift collisions.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <ShieldCheckIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Dock Door Safety Monitoring</h3>
                  <p className="text-[#8b9bb1]">Monitors dock door areas for unauthorized entry and safety protocol violations. Alerts supervisors immediately.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <ChartBarIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">High-Visibility Vest Compliance</h3>
                  <p className="text-[#8b9bb1]">Detects missing high-visibility vests in traffic areas, loading zones, and areas with forklift operations.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <TruckIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Loading Zone Hazards</h3>
                  <p className="text-[#8b9bb1]">Monitors loading zones for safety protocol violations and unauthorized personnel. Reduces dock door accidents.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Request Industry Demo</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">See how Nexxau monitors warehouses and logistics facilities with industry-specific detection rules.</p>
            <Link href="/contact/sales" className="inline-block px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
              Request Industry Demo
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
