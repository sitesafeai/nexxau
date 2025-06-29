'use client';

import { useEffect, useState } from 'react';
import { ChartBarIcon, CurrencyDollarIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const stats = [
  {
    name: '83% Reduction in Safety Violations',
    value: '83%',
    description: 'AI-powered EHS platforms have achieved an 83% drop in violations among customers, with 15% lower insurance premiums and a 40% boost in EHS productivity.',
    icon: ShieldCheckIcon,
    color: 'bg-blue-500'
  },
  {
    name: '1:2-6 ROI on Safety Investment',
    value: '1:2-6',
    description: 'Studies from the American Society of Safety Professionals show that each $1 invested in safety saves $2-6 in avoided injuries and administrative costs.',
    icon: CurrencyDollarIcon,
    color: 'bg-green-500'
  },
  {
    name: '30% Fewer Injuries Using Predictive AI',
    value: '30%',
    description: 'Firms using AI risk-prediction saw injury rates drop by up to 30%, thanks to proactive interventions.',
    icon: ChartBarIcon,
    color: 'bg-red-500'
  }
];

export default function SiteStats() {
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

    const element = document.getElementById('site-stats-section');
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
    <section id="site-stats-section" className="relative py-24 sm:py-32">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 to-gray-900/60" />
      
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            ✅ Proven Impact: Real Numbers, Verified Sources
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            See how advanced EHS technologies are transforming safety management across high-risk industries like construction, oil & gas, and manufacturing.
          </p>
        </div>

        <div className="mt-16">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat, index) => (
              <div
                key={stat.name}
                className={`relative rounded-2xl bg-white/10 backdrop-blur-sm p-10 shadow-lg transition-all duration-500 border border-white/20 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`${stat.color} p-4 rounded-xl mb-6`}>
                    <stat.icon className="h-8 w-8 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">{stat.name}</h3>
                  <p className="text-5xl font-bold text-blue-400 mb-6">{stat.value}</p>
                  <p className="text-base text-gray-300 leading-relaxed">{stat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
} 