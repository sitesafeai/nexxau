import type { Metadata } from 'next';
import { Shield, AlertTriangle, CheckCircle, Camera, Clock, FileText } from 'lucide-react';
import MarketingNavbar from '../components/MarketingNavbar';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Automated PPE Compliance Monitoring for Active Worksites | Nexxau',
  description: 'Automated PPE compliance monitoring detects missing hardhats, safety vests, and other required equipment in real-time. Reduce violations by 80%+ with existing cameras.',
  keywords: ['PPE compliance monitoring', 'automated PPE detection', 'safety compliance software', 'PPE violation detection'],
  openGraph: {
    title: 'Automated PPE Compliance Monitoring for Active Worksites | Nexxau',
    description: 'Automated PPE compliance monitoring detects missing hardhats, safety vests, and other required equipment in real-time.',
    url: 'https://nexxau.com/ppe-compliance-monitoring',
  },
  alternates: {
    canonical: 'https://nexxau.com/ppe-compliance-monitoring',
  },
};

export default function PPECompliancePage() {
  return (
    <div className="min-h-screen bg-[#0a1628]">
      <MarketingNavbar variant="dark" />

      <main className="pt-20">
        {/* Hero */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Automated PPE Compliance Monitoring for Active Worksites
            </h1>
            <p className="text-xl text-[#8b9bb1] mb-8">
              Manual safety audits miss 95% of PPE violations. Random patrols can't cover every worker, every shift, every zone. When OSHA shows up or an incident occurs, you're left with incomplete documentation and preventable violations.
            </p>
            <p className="text-lg text-[#8b9bb1] mb-8">
              Nexxau turns your existing cameras into 24/7 compliance monitors. Every hardhat, every safety vest, every required piece of PPE is detected automatically. Violations trigger instant alerts to supervisors. Every incident is logged with video evidence and timestamps.
            </p>
          </div>
        </section>

        {/* Compliance Risk */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">The Compliance Risk You're Not Seeing</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <AlertTriangle className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">OSHA Violations Cost $15,000+</h3>
                <p className="text-sm text-[#8b9bb1]">Each PPE violation can result in fines, work stoppages, and increased insurance premiums. Most violations go undetected until it's too late.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <FileText className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">No Evidence When You Need It</h3>
                <p className="text-sm text-[#8b9bb1]">When incidents occur or inspections happen, you need documented proof of compliance efforts. Manual audits don't provide timestamped evidence.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Solution */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">How Nexxau Monitors PPE Compliance</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">
              Connect your existing IP cameras via RTSP. Our AI analyzes every frame in real-time, detecting PPE violations as they happen.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Detects Missing PPE</h3>
                  <p className="text-[#8b9bb1]">Hardhats, safety vests, eye protection, and other required equipment. Detection happens in under 2 seconds.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Sends Real-Time Alerts</h3>
                  <p className="text-[#8b9bb1]">Supervisors receive mobile, email, or SMS alerts immediately when violations are detected. No waiting for the next patrol.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Logs Violations Automatically</h3>
                  <p className="text-[#8b9bb1]">Every violation is recorded with video evidence, timestamps, and location data. Exportable reports for OSHA inspections and insurance audits.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Works With Existing Cameras</h3>
                  <p className="text-[#8b9bb1]">No new hardware required. Connect via RTSP feed. Setup typically takes 2-5 business days depending on site complexity.</p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white mb-4">See PPE Compliance Monitoring in Action</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">Request a 30-minute demo to see how Nexxau detects PPE violations on your worksite.</p>
            <Link href="/contact/sales" className="inline-block px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
              Request a Demo
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

