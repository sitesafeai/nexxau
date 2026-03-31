import type { Metadata } from 'next';
import { Shield, AlertTriangle, CheckCircle, FileText, Clock, Building2 } from 'lucide-react';
import MarketingNavbar from '../components/MarketingNavbar';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'OSHA PPE Compliance Software for Construction & Industry | Nexxau',
  description: 'OSHA PPE compliance software for construction and industrial sites. Automated detection, documentation, and reporting for OSHA inspections. Reduce violations by 80%+.',
  keywords: ['OSHA PPE compliance software', 'OSHA compliance software', 'PPE compliance software', 'OSHA inspection software'],
  openGraph: {
    title: 'OSHA PPE Compliance Software for Construction & Industry | Nexxau',
    description: 'OSHA PPE compliance software for construction and industrial sites. Automated detection, documentation, and reporting for OSHA inspections.',
    url: 'https://nexxau.com/osha-ppe-compliance-software',
  },
  alternates: {
    canonical: 'https://nexxau.com/osha-ppe-compliance-software',
  },
};

export default function OSHAPPEPage() {
  return (
    <div className="min-h-screen bg-[#0a1628]">
      <MarketingNavbar variant="dark" />

      <main className="pt-20">
        {/* Hero */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              OSHA PPE Compliance Software for Construction & Industry
            </h1>
            <p className="text-xl text-[#8b9bb1] mb-8">
              OSHA inspections are unannounced. When inspectors arrive, you need documented proof of PPE compliance efforts. Manual audits don't provide timestamped evidence. Self-reported compliance data isn't credible. You need objective, automated documentation.
            </p>
          </div>
        </section>

        {/* OSHA Enforcement Reality */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">OSHA Enforcement Reality</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">
              OSHA conducts unannounced inspections. When inspectors find PPE violations, citations and fines follow. Each violation can cost $15,000+. Repeat violations can result in work stoppages and increased insurance premiums.
            </p>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <AlertTriangle className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Citations & Fines</h3>
                <p className="text-sm text-[#8b9bb1]">OSHA citations for PPE violations average $15,000+ per violation. Repeat violations can result in willful violation penalties of $150,000+.</p>
              </div>
              <div className="bg-[#1e3a5f] rounded-lg p-6 border border-white/10">
                <Building2 className="h-8 w-8 text-red-400 mb-4" />
                <h3 className="text-white font-semibold mb-2">Work Stoppages</h3>
                <p className="text-sm text-[#8b9bb1]">Serious violations can result in work stoppages until compliance is achieved. Lost productivity and project delays cost far more than fines.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Documentation & Evidence */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">Documentation & Evidence Importance</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">
              When OSHA inspectors arrive, they want to see documented proof of compliance efforts. Manual audit logs aren't credible. Self-reported data isn't objective. You need timestamped video evidence and automated compliance reports.
            </p>
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Timestamped Evidence</h3>
                  <p className="text-[#8b9bb1]">Every PPE violation is logged with precise timestamps, video evidence, and location data. Exportable reports show continuous compliance monitoring efforts.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Automated Reports</h3>
                  <p className="text-[#8b9bb1]">Generate compliance reports on demand. Show inspectors documented proof of PPE enforcement, violation response times, and continuous monitoring efforts.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Objective Data</h3>
                  <p className="text-[#8b9bb1]">AI-powered detection provides objective, unbiased compliance data. No human error, no subjective enforcement, no credibility questions.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Nexxau Compliance Support */}
        <section className="py-20 bg-[#0d1f35]">
          <div className="container mx-auto px-6 max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">Nexxau Compliance Support</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">
              Nexxau provides the documentation and evidence you need for OSHA inspections. Automated detection, real-time alerts, and comprehensive reporting help you demonstrate continuous compliance efforts.
            </p>
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Real-Time Detection</h3>
                  <p className="text-[#8b9bb1]">Detects PPE violations as they occur. Supervisors receive instant alerts, allowing immediate correction before violations become incidents.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Compliance Logging</h3>
                  <p className="text-[#8b9bb1]">Every violation is logged with video evidence, timestamps, location data, and supervisor response times. Exportable reports for OSHA inspections.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Inspection Reports</h3>
                  <p className="text-[#8b9bb1]">Generate compliance reports on demand. Show inspectors documented proof of PPE enforcement, violation trends, and continuous monitoring efforts.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-6 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Prepare for Your Next Inspection</h2>
            <p className="text-lg text-[#8b9bb1] mb-8">See how Nexxau provides the documentation and evidence you need for OSHA inspections.</p>
            <Link href="/contact/sales" className="inline-block px-6 py-3 bg-white text-[#0a1628] hover:bg-white/90 rounded-lg transition-colors font-semibold text-sm">
              Prepare for Your Next Inspection
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

