'use client';

import { useEffect, useState } from 'react';
import { ShieldCheckIcon, ChartBarIcon, BellIcon, CameraIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const steps = [
  {
    title: 'AI-Powered Risk Detection',
    description: 'Our AI continuously monitors your site, identifying potential hazards before they become incidents.',
    icon: ShieldCheckIcon,
    color: 'bg-blue-500'
  },
  {
    title: 'Real-Time Analytics',
    description: 'Get instant insights into safety metrics and trends with our advanced analytics dashboard.',
    icon: ChartBarIcon,
    color: 'bg-green-500'
  },
  {
    title: 'Smart Alerts',
    description: 'Receive immediate notifications about safety concerns and required actions.',
    icon: BellIcon,
    color: 'bg-red-500'
  },
  {
    title: 'Automated Documentation',
    description: 'Let AI handle the paperwork while you focus on keeping your team safe.',
    icon: CameraIcon,
    color: 'bg-purple-500'
  }
];

export default function HowItWorks() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById('how-it-works-section');
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  return (
    <section id="how-it-works-section" className="relative py-24 sm:py-32">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 to-gray-900/60" />
      
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How Nexxau Works
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            Our AI-powered platform transforms safety management into a proactive, data-driven process.
          </p>
        </div>

        <div className="mt-16">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className={`relative rounded-2xl bg-white/10 backdrop-blur-sm p-8 shadow-lg transition-all duration-500 border border-white/20 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`${step.color} p-4 rounded-xl mb-6`}>
                    <step.icon className="h-8 w-8 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">{step.title}</h3>
                  <p className="text-base text-gray-300 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
} 