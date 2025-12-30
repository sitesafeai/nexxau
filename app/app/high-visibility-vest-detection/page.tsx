import type { Metadata } from 'next';
import { Shield, AlertTriangle, CheckCircle, Camera, Users } from 'lucide-react';
import MarketingNavbar from '../components/MarketingNavbar';

export const metadata: Metadata = {
  title: 'High-Visibility Vest Detection in Real Time | Nexxau',
  description: 'Automated high-visibility vest detection for construction and industrial sites. Real-time detection of missing safety vests with instant alerts and compliance logging.',
  keywords: ['high visibility vest detection', 'safety vest detection', 'hi-vis detection', 'PPE detection software'],
  openGraph: {
    title: 'High-Visibility Vest Detection in Real Time | Nexxau',
    description: 'Automated high-visibility vest detection for construction and industrial sites. Real-time detection of missing safety vests.',
    url: 'https://nexxau.com/high-visibility-vest-detection',
  },
  alternates: {
    canonical: 'https://nexxau.com/high-visibility-vest-detection',
  },
};

export default function HighVisibilityVestPage() {
  return (
    <div className="min-h-screen bg-[#0a1628]">
      <MarketingNavbar variant="dark" />

      <main className="pt-20">
        {/* Hero */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              High-Visibility Vest Detection in Real Time
            </h1>
            <p className="text-xl text-[#8b9bb1] mb-8">
              Low-visibility incidents are preventable. Workers without high-visibility vests in traffic areas, loading zones, or around heavy equipment are at risk of being struck by vehicles or machinery. Manual supervision can't monitor every worker in every zone, every moment.
            </p>
          </div>
        </section>

        {/* Risk Section */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">The Risk of Low-Visibility Incidents</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <AlertTriangle className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Struck-by Accidents</h3>
                <p className="text-sm text-[#8b9bb1]">Workers without high-visibility vests in traffic areas are 2x more likely to be struck by vehicles or heavy equipment. These incidents are often fatal.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <Users className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">OSHA Requirements</h3>
                <p className="text-sm text-[#8b9bb1]">OSHA requires high-visibility apparel in areas where workers are exposed to traffic or moving equipment. Non-compliance results in citations and fines.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Camera-Based Detection */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">Camera-Based Detection</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">
              Nexxau uses your existing IP cameras to detect workers without high-visibility vests in real-time. Our AI analyzes video feeds continuously, identifying violations as they occur.
            </p>
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Real-Time Detection</h3>
                  <p className="text-[#8b9bb1]">AI identifies workers without high-visibility vests within 2 seconds of entering monitored zones. Detection works in various lighting conditions and camera angles.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Zone Configuration</h3>
                  <p className="text-[#8b9bb1]">Configure high-visibility vest requirements by zone. Traffic areas, loading docks, and areas with heavy equipment can have different enforcement rules.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Works With Existing Cameras</h3>
                  <p className="text-[#8b9bb1]">No new hardware required. Connect via RTSP feed. Setup typically takes 2-5 business days depending on site complexity and number of cameras.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Real-Time Alerts */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">Real-Time Alerts</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">
              When a worker enters a high-visibility vest-required zone without proper apparel, supervisors are notified immediately.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Mobile Push Notifications</h3>
                  <p className="text-[#8b9bb1]">Supervisors receive instant alerts on their mobile devices with violation details, location, and timestamp.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Email & SMS Alerts</h3>
                  <p className="text-[#8b9bb1]">Configure alert routing by severity, zone, or time of day. Escalation rules ensure critical violations reach the right person immediately.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Compliance Logging</h3>
                  <p className="text-[#8b9bb1]">Every violation is logged with video evidence, timestamps, and location data. Exportable reports for OSHA inspections and insurance audits.</p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white mb-4">See High-Visibility Vest Detection in Action</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">Request a demo to see how Nexxau detects missing safety vests on your worksite.</p>
            <Link href="/contact/sales" className="inline-block px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
              Book a Demo
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

