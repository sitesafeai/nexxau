'use client';

import { 
  EyeIcon,
  BellAlertIcon,
  ChartBarIcon,
  DevicePhoneMobileIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import MarketingNavbar from '../components/MarketingNavbar';

export default function FeaturesPage() {
  return (
    <div className="bg-gray-900 min-h-screen">
      <MarketingNavbar variant="dark" />

      {/* Hero */}
      <div className="relative pt-32 pb-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Features That Cut Violations Before They Become Injuries
            </h1>
            <p className="mt-6 text-lg text-gray-300">
              Detection accuracy 95%+. Alert latency under 2 seconds. Built for construction, not conferences.
            </p>
          </div>
        </div>
      </div>

      {/* Core Suite */}
      <div className="bg-gray-800 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-10 text-center">Core Enforcement Suite</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
              <EyeIcon className="h-8 w-8 text-blue-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Detection</h3>
              <p className="text-sm text-gray-400">PPE violations, zone breaches, unsafe proximity — detected in under 2 seconds via your existing cameras.</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
              <BellAlertIcon className="h-8 w-8 text-blue-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Alerts</h3>
              <p className="text-sm text-gray-400">Mobile push, email, SMS. Severity-based routing. Escalation rules if unresolved after X minutes.</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
              <ChartBarIcon className="h-8 w-8 text-blue-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Analytics</h3>
              <p className="text-sm text-gray-400">Violation heatmaps, contractor rankings, shift comparisons, trend analysis — exportable for insurers.</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
              <DevicePhoneMobileIcon className="h-8 w-8 text-blue-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Mobile</h3>
              <p className="text-sm text-gray-400">Supervisors get alerts on their phones. Acknowledge, escalate, or mark resolved — from anywhere.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Copilot - Concrete */}
      <div className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <CpuChipIcon className="h-8 w-8 text-blue-400" />
                  <h2 className="text-2xl font-bold text-white">Nexxau Copilot</h2>
                </div>
                <p className="text-gray-300 mb-6">
                  Not a chatbot. A safety analyst that flags patterns you'd miss and surfaces them before they escalate.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircleIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>"Site B's 3rd-shift violations spiked 40% this week"</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircleIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>"Contractor X has 3x the hardhat violations of average"</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircleIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>"Zone 4 breach frequency suggests signage issue"</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">What Copilot Does</p>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>→ Flags problem shifts, subcontractors, zones</li>
                  <li>→ Auto-generates weekly summaries</li>
                  <li>→ Tunes detection thresholds based on site conditions</li>
                  <li>→ Predicts violation spikes before they happen</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Differentiator */}
      <div className="bg-gray-800 py-20 border-y border-gray-700">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">Why This Beats Manual Patrols</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-red-400 mb-3">Traditional Approach</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Random patrols catch maybe 5% of violations</li>
                  <li>• No evidence if incident occurs</li>
                  <li>• Subjective enforcement varies by shift</li>
                  <li>• No trend data for insurers</li>
                </ul>
              </div>
              <div className="bg-gray-900 rounded-lg p-6 border border-blue-500/50">
                <h3 className="text-lg font-semibold text-blue-400 mb-3">With Nexxau</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Every camera is a 24/7 safety monitor</li>
                  <li>• Video evidence for every violation</li>
                  <li>• Consistent detection, every shift</li>
                  <li>• Structured data for underwriting</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Setup */}
      <div className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-white mb-6">Setup in Days, Not Months</h2>
            <p className="text-gray-400 mb-8">
              We connect to your existing IP cameras via RTSP. No new hardware. Configuration and calibration typically take 2-5 business days depending on site complexity.
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <p className="text-2xl font-bold text-white">Day 1-2</p>
                <p className="text-xs text-gray-400">Camera integration</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <p className="text-2xl font-bold text-white">Day 3-4</p>
                <p className="text-xs text-gray-400">Zone configuration</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <p className="text-2xl font-bold text-white">Day 5</p>
                <p className="text-xs text-gray-400">Live + training</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-gray-800 py-16 border-t border-gray-700">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheckIcon className="h-6 w-6 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Security & Privacy</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-gray-400"><span className="text-white">TLS 1.3</span> in transit</div>
              <div className="text-gray-400"><span className="text-white">AES-256</span> at rest</div>
              <div className="text-gray-400"><span className="text-white">Role-based</span> access</div>
              <div className="text-gray-400"><span className="text-white">Configurable</span> retention</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-white mb-4">See It Detect Violations Live</h2>
            <p className="text-gray-400 mb-8">30-minute demo on your schedule.</p>
            <Link href="/contact/sales" className="inline-block rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500">
              Request Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
