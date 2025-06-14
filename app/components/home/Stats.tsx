'use client';

import { useEffect, useState } from 'react';
import { ChartBarIcon, CurrencyDollarIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const stats = [
  {
    name: '83% Reduction in Safety Violations',
    description: 'AI-powered EHS platforms have achieved an 83% drop in violations among customers, with 15% lower insurance premiums and a 40% boost in EHS productivity.',
    icon: ShieldCheckIcon,
    color: 'bg-blue-500',
    sources: ['benchmarkgensuite.com', 'evotix.com', 'reddit.com', 'visionify.ai', 'intenseye.com']
  },
  {
    name: '1:2-6 ROI on Safety Investment',
    description: 'Studies from the American Society of Safety Professionals show that each $1 invested in safety saves $2-6 in avoided injuries and administrative costs.',
    icon: CurrencyDollarIcon,
    color: 'bg-green-500',
    sources: ['visionify.ai', 'evotix.com', 'osha.gov']
  },
  {
    name: '30% Fewer Injuries Using Predictive AI',
    description: 'Firms using AI risk-prediction saw injury rates drop by up to 30%, thanks to proactive interventions and real-time monitoring.',
    icon: ChartBarIcon,
    color: 'bg-red-500',
    sources: ['reddit.com', 'dailysafetymoment.com', 'visionify.ai']
  }
];

export default function Stats() {
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

    const element = document.getElementById('stats');
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
    <div id="stats" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            ✅ Proven Impact
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            See how advanced EHS technologies are transforming safety management across high-risk industries like construction, oil & gas, and manufacturing.
          </p>
        </div>

        <div className="mt-16">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat, index) => (
              <div
                key={stat.name}
                className={`relative rounded-2xl bg-white p-8 shadow-lg transition-all duration-500 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div className="flex items-center gap-x-4">
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{stat.name}</h3>
                </div>
                <p className="mt-4 text-base text-gray-600">{stat.description}</p>
                <div className="mt-6">
                  <div className="flex flex-wrap gap-2">
                    {stat.sources.map((source) => (
                      <span
                        key={source}
                        className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600"
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 