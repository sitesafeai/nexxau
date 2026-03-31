import type { Metadata } from 'next';
import { Shield, AlertTriangle, CheckCircle, Camera, Clock, Users } from 'lucide-react';
import MarketingNavbar from '../components/MarketingNavbar';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Construction Site Safety Monitoring Without Manual Patrols | Nexxau',
  description: 'Automated construction site safety monitoring using existing cameras. Real-time PPE violation detection, zone breach alerts, and compliance logging. Reduce incidents by 80%+.',
  keywords: ['construction site safety monitoring', 'construction safety software', 'site safety monitoring', 'construction PPE compliance'],
  openGraph: {
    title: 'Construction Site Safety Monitoring Without Manual Patrols | Nexxau',
    description: 'Automated construction site safety monitoring using existing cameras. Real-time PPE violation detection and compliance logging.',
    url: 'https://nexxau.com/construction-site-safety-monitoring',
  },
  alternates: {
    canonical: 'https://nexxau.com/construction-site-safety-monitoring',
  },
};

export default function ConstructionSiteSafetyPage() {
  return (
    <div className="min-h-screen bg-[#0a1628]">
      <MarketingNavbar variant="dark" />

      <main className="pt-20">
        {/* Hero */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Construction Site Safety Monitoring Without Manual Patrols
            </h1>
            <p className="text-xl text-[#8b9bb1] mb-8">
              Manual safety patrols can't cover every worker, every zone, every shift. Supervisors miss 95% of PPE violations. When incidents occur or OSHA inspectors arrive, you're left without documented evidence of compliance efforts.
            </p>
          </div>
        </section>

        {/* Manual Patrol Limitations */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">Manual Patrol Limitations</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <Users className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Can't Monitor Everyone</h3>
                <p className="text-sm text-[#8b9bb1]">A single supervisor can't watch 50+ workers simultaneously. Violations occur when supervisors aren't present, and they go undocumented.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <Clock className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Inconsistent Enforcement</h3>
                <p className="text-sm text-[#8b9bb1]">Enforcement varies by shift, supervisor, and time of day. Workers learn which supervisors are lenient, leading to inconsistent compliance.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <AlertTriangle className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">No Evidence</h3>
                <p className="text-sm text-[#8b9bb1]">When incidents occur or OSHA inspections happen, you need timestamped evidence of compliance efforts. Manual patrols don't provide this.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <Camera className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Reactive, Not Proactive</h3>
                <p className="text-sm text-[#8b9bb1]">Manual patrols catch violations after they occur. By then, the risk has already been present. Prevention requires constant monitoring.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Always-On Monitoring */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">Always-On Monitoring</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">
              Nexxau turns your existing cameras into 24/7 safety monitors. Every worker, every zone, every moment is monitored automatically. Violations trigger instant alerts. Every incident is logged with video evidence.
            </p>
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">PPE Violation Detection</h3>
                  <p className="text-[#8b9bb1]">Detects missing hardhats, safety vests, eye protection, and other required PPE in real-time. Detection latency is under 2 seconds.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Zone Breach Alerts</h3>
                  <p className="text-[#8b9bb1]">Monitors restricted zones, crane areas, and elevated work platforms. Alerts supervisors when unauthorized personnel enter restricted areas.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Compliance Logging</h3>
                  <p className="text-[#8b9bb1]">Every violation is logged with video evidence, timestamps, and location data. Exportable reports for OSHA inspections and insurance audits.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Works With Existing Cameras */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">Works With Existing Cameras</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">
              No new hardware required. Connect your existing IP cameras via RTSP feed. Setup typically takes 2-5 business days depending on site complexity and number of cameras.
            </p>
            <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
              <h3 className="text-white font-semibold mb-4">Setup Process</h3>
              <ul className="space-y-3 text-[#8b9bb1]">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>Day 1-2: Camera integration and RTSP feed configuration</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>Day 3-4: Zone configuration and detection threshold calibration</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>Day 5: Live monitoring and supervisor training</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Talk to a Safety Specialist</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">Schedule a 30-minute call to discuss how Nexxau can monitor your construction site.</p>
            <Link href="/contact/sales" className="inline-block px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
              Talk to a Safety Specialist
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

