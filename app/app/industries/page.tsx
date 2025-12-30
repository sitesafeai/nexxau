'use client';

import { 
  BuildingOfficeIcon, 
  WrenchScrewdriverIcon, 
  TruckIcon, 
  BoltIcon, 
  FireIcon,
  XCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import MarketingNavbar from '../components/MarketingNavbar';

const industries = [
  {
    name: 'Construction',
    icon: BuildingOfficeIcon,
    color: 'bg-orange-500',
    hazards: 'Falls, struck-by incidents, confined spaces',
    detects: ['Hardhat compliance', 'Fall-protection zone violations', 'Crane operation zone breaches', 'Subcontractor violation patterns'],
  },
  {
    name: 'Manufacturing',
    icon: WrenchScrewdriverIcon,
    color: 'bg-blue-500',
    hazards: 'Machine guarding, LOTO failures, forklift incidents',
    detects: ['Restricted machine zone entry', 'LOTO procedure compliance', 'Forklift proximity hazards', 'High-visibility PPE in traffic areas'],
  },
  {
    name: 'Logistics',
    icon: TruckIcon,
    color: 'bg-purple-500',
    hazards: 'Forklift collisions, dock accidents, warehouse falls',
    detects: ['Blind-corner proximity alerts', 'Dock-door safety violations', 'High-visibility vest compliance', 'Loading zone hazards'],
  },
  {
    name: 'Oil & Gas',
    icon: FireIcon,
    color: 'bg-red-500',
    hazards: 'Fire/explosion risks, H2S exposure, FR PPE failures',
    detects: ['Flame-resistant clothing compliance', 'H2S zone entry detection', 'Gas detection zone violations', 'Heavy equipment proximity'],
  },
  {
    name: 'Energy',
    icon: BoltIcon,
    color: 'bg-yellow-500',
    hazards: 'Arc-flash incidents, high-voltage exposure, substation access',
    detects: ['Arc-flash PPE compliance', 'Substation unauthorized entry', 'High-voltage perimeter breaches', 'Lone worker zone tracking'],
  }
];

export default function IndustriesPage() {
  return (
    <div className="bg-gray-900 min-h-screen">
      <MarketingNavbar variant="dark" />

      {/* Hero */}
      <div className="relative pt-32 pb-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Safety AI for High-Risk Environments
            </h1>
            <p className="mt-6 text-lg text-gray-300">
              Different industries. Different hazards. Same goal: catch violations before they become injuries.
            </p>
          </div>
        </div>
      </div>

      {/* Who We Don't Serve - MOVED UP */}
      <div className="bg-gray-800 py-12 border-y border-gray-700">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-start gap-4">
              <XCircleIcon className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Not a Fit For</h3>
                <p className="text-gray-400 text-sm">
                  Office environments, retail, remote work, or any space where the primary risk isn't physical. We focus exclusively on sites where PPE compliance and zone violations are life-or-death concerns.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Industries Grid - Compact */}
      <div className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries.map((industry) => (
              <div key={industry.name} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500/50 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`${industry.color} p-2 rounded-lg`}>
                    <industry.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{industry.name}</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">Primary hazards: {industry.hazards}</p>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">What We Detect</p>
                  <ul className="space-y-1.5">
                    {industry.detects.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckCircleIcon className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Table - Visual */}
      <div className="bg-gray-800 py-20 border-t border-gray-700">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-10 text-center">How Detection Priorities Differ</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Industry</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Primary Focus</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Unique Detection</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 text-white">Construction</td>
                  <td className="py-3 px-4 text-gray-300">Falls, struck-by</td>
                  <td className="py-3 px-4 text-gray-300">Scaffold zones, crane areas, subcontractor tracking</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 text-white">Manufacturing</td>
                  <td className="py-3 px-4 text-gray-300">Machine safety, LOTO</td>
                  <td className="py-3 px-4 text-gray-300">Machine zones, LOTO verification, forklift proximity</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 text-white">Logistics</td>
                  <td className="py-3 px-4 text-gray-300">Vehicle collisions</td>
                  <td className="py-3 px-4 text-gray-300">Blind corners, dock doors, high-vis compliance</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 text-white">Oil & Gas</td>
                  <td className="py-3 px-4 text-gray-300">Fire/explosion, H2S</td>
                  <td className="py-3 px-4 text-gray-300">FR clothing, gas zone compliance, H2S monitoring</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-white">Energy</td>
                  <td className="py-3 px-4 text-gray-300">Arc-flash, high-voltage</td>
                  <td className="py-3 px-4 text-gray-300">Arc-flash PPE, substation access, perimeter zones</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-white mb-4">See How It Works for Your Industry</h2>
            <p className="text-gray-400 mb-8">We'll show you detection examples specific to your hazard profile.</p>
            <Link href="/contact/sales" className="inline-block rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500">
              Request Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
