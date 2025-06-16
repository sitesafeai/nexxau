'use client';

import { useEffect, useState } from 'react';
import { BuildingOfficeIcon, WrenchScrewdriverIcon, TruckIcon, BoltIcon, FireIcon } from '@heroicons/react/24/outline';

const industries = [
  {
    name: 'Construction',
    description: 'Real-time monitoring of construction sites, equipment safety, and worker compliance.',
    icon: BuildingOfficeIcon,
    color: 'bg-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20'
  },
  {
    name: 'Manufacturing',
    description: 'Automated safety checks for machinery, production lines, and worker protection.',
    icon: WrenchScrewdriverIcon,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  },
  {
    name: 'Oil & Gas',
    description: 'Critical safety monitoring for drilling operations, pipeline integrity, and hazardous material handling.',
    icon: FireIcon,
    color: 'bg-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20'
  },
  {
    name: 'Logistics',
    description: 'Fleet safety monitoring, warehouse operations, and delivery route optimization.',
    icon: TruckIcon,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20'
  },
  {
    name: 'Energy',
    description: 'Critical infrastructure protection, hazardous material handling, and emergency response.',
    icon: BoltIcon,
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20'
  }
];

export default function Industries() {
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

    const element = document.getElementById('industries-section');
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
    <section id="industries-section" className="relative py-24 sm:py-32">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800/50 to-gray-900" />
      
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Industries We Serve
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            Nexxau's AI-powered safety solutions are tailored for high-risk industries that demand the highest standards of safety and compliance.
          </p>
        </div>

        <div className="mt-16">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {industries.map((industry, index) => (
              <div
                key={industry.name}
                className={`relative rounded-2xl ${industry.bgColor} p-8 shadow-lg transition-all duration-500 border ${industry.borderColor} ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`${industry.color} p-4 rounded-xl mb-6`}>
                    <industry.icon className="h-8 w-8 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">{industry.name}</h3>
                  <p className="text-base text-gray-300 leading-relaxed">{industry.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
} 