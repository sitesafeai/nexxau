'use client';

import { useEffect, useState } from 'react';
import { ChartBarIcon, CurrencyDollarIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const stats = [
  {
    name: 'Compliance Rate',
    value: '98%',
    description: 'in first 30 days',
    icon: ShieldCheckIcon,
    color: 'bg-blue-500'
  },
  {
    name: 'Active Worksites',
    value: '50+',
    description: 'monitored daily',
    icon: ChartBarIcon,
    color: 'bg-green-500'
  },
  {
    name: 'Cost Savings',
    value: '$2.5M',
    description: 'in injury-related costs',
    icon: CurrencyDollarIcon,
    color: 'bg-red-500'
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
    <section id="site-stats-section" className="bg-white py-24 sm:py-32 relative z-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Proven Impact
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
                <div className="mt-4">
                  <p className="text-4xl font-bold text-gray-900">{stat.value}</p>
                  <p className="mt-2 text-base text-gray-600">{stat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
} 