import type { Metadata } from 'next';
import AboutClient from './AboutClient';

export const metadata: Metadata = {
  title: 'About | Nexxau',
  description: 'Learn about Nexxau\'s mission, vision, and the team dedicated to revolutionizing construction safety through AI technology.',
};

export default function AboutPage() {
  return <AboutClient />;
} 