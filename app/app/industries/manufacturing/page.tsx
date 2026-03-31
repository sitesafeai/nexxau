import type { Metadata } from 'next';
import { WrenchScrewdriverIcon, ShieldCheckIcon, ChartBarIcon, BellAlertIcon, CogIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import MarketingNavbar from '../../components/MarketingNavbar';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Manufacturing Safety Monitoring with AI Detection | Nexxau',
  description: 'Manufacturing safety monitoring with automated PPE detection, machine zone monitoring, and LOTO compliance tracking. Reduce manufacturing safety violations by 80%+.',
  keywords: ['manufacturing safety monitoring', 'manufacturing safety software', 'machine safety monitoring', 'LOTO compliance'],
  openGraph: {
    title: 'Manufacturing Safety Monitoring with AI Detection | Nexxau',
    description: 'Manufacturing safety monitoring with automated PPE detection, machine zone monitoring, and LOTO compliance tracking.',
    url: 'https://nexxau.com/industries/manufacturing',
  },
  alternates: {
    canonical: 'https://nexxau.com/industries/manufacturing',
  },
};

export default function ManufacturingPage() {
  return (
    <div className="bg-[#0a1628] min-h-screen">
      <MarketingNavbar variant="dark" />

      <main className="pt-20">
        {/* Hero */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Manufacturing Safety Monitoring with AI Detection
            </h1>
            <p className="text-xl text-[#8b9bb1] mb-8">
              Manufacturing floors have unique hazards: machine guarding failures, LOTO violations, forklift proximity risks, and restricted zone breaches. Manual supervision can't monitor every machine, every worker, every moment. Nexxau provides 24/7 automated monitoring using your existing cameras.
            </p>
          </div>
        </section>

        {/* Manufacturing Hazards */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">Manufacturing Floor Hazards</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <CogIcon className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Machine Guarding Failures</h3>
                <p className="text-sm text-[#8b9bb1]">Workers entering restricted machine zones without proper authorization. Zone breach detection monitors machine perimeters.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">LOTO Violations</h3>
                <p className="text-sm text-[#8b9bb1]">Workers entering locked-out equipment zones. Detection monitors LOTO compliance and alerts supervisors to violations.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <WrenchScrewdriverIcon className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Forklift Proximity Hazards</h3>
                <p className="text-sm text-[#8b9bb1]">Workers too close to operating forklifts. High-visibility vest detection helps prevent struck-by incidents.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <ShieldCheckIcon className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">PPE Compliance</h3>
                <p className="text-sm text-[#8b9bb1]">Missing eye protection, hearing protection, or other required PPE in machine areas. Automated detection ensures consistent enforcement.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Nexxau Features for Manufacturing */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">How Nexxau Maps to Manufacturing Risks</h2>
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <BellAlertIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Restricted Machine Zone Monitoring</h3>
                  <p className="text-[#8b9bb1]">Monitors machine perimeters and restricted zones. Alerts supervisors when unauthorized personnel enter machine areas.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <ShieldCheckIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">LOTO Procedure Compliance</h3>
                  <p className="text-[#8b9bb1]">Monitors locked-out equipment zones. Detects workers entering LOTO-protected areas without proper authorization.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <ChartBarIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Forklift Proximity Detection</h3>
                  <p className="text-[#8b9bb1]">Monitors workers in forklift traffic areas. High-visibility vest detection helps prevent struck-by incidents.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <WrenchScrewdriverIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">PPE Compliance in Traffic Areas</h3>
                  <p className="text-[#8b9bb1]">Detects missing high-visibility vests, eye protection, and hearing protection in areas with moving equipment.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Request Industry Demo</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">See how Nexxau monitors manufacturing floors with industry-specific detection rules.</p>
            <Link href="/contact/sales" className="inline-block px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
              Request Industry Demo
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
