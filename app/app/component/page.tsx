import type { Metadata } from 'next';
import MarketingNavbar from '../components/MarketingNavbar';
import DetectionFlowDemo from './DetectionFlowDemo';

export const metadata: Metadata = {
  title: 'Detection to resolution flow | Nexxau',
  description:
    'Interactive walkthrough: from camera ingest and AI PPE detection through notifications, audit logging, dashboard, and resolution.',
  robots: { index: false, follow: false },
};

export default function ComponentShowcasePage() {
  return (
    <div className="min-h-screen bg-[#0a1628]">
      <MarketingNavbar variant="dark" />
      <DetectionFlowDemo />
    </div>
  );
}
