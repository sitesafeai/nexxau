import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manufacturing Industry Solutions | SiteSafe',
  description: 'Enhance manufacturing safety with automated monitoring and predictive analytics. Reduce incidents and improve compliance.',
};

export default function ManufacturingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 