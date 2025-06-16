'use client';

import { useEffect, useState } from 'react';
import { UserGroupIcon, BuildingOfficeIcon, ShieldCheckIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';

const roles = [
  {
    title: 'Safety Managers',
    description: 'Streamline safety protocols and reduce administrative burden with AI-powered automation.',
    icon: ShieldCheckIcon,
    color: 'bg-blue-500'
  },
  {
    title: 'Site Supervisors',
    description: 'Monitor multiple sites simultaneously and respond to safety concerns in real-time.',
    icon: BuildingOfficeIcon,
    color: 'bg-green-500'
  },
  {
    title: 'Workforce',
    description: 'Work confidently with AI-powered safety monitoring and real-time hazard alerts.',
    icon: UserGroupIcon,
    color: 'bg-red-500'
  },
  {
    title: 'Insurance Companies',
    description: 'Reduce risk exposure and claims by partnering with companies using AI-powered safety monitoring.',
    icon: BuildingLibraryIcon,
    color: 'bg-purple-500'
  }
];

export default function WhoItsFor() {
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

    const element = document.getElementById('who-its-for-section');
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
    <section id="who-its-for-section" className="relative py-24 sm:py-32">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 to-gray-900/60" />
      
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Who Benefits from Nexxau?
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            Our AI-powered safety platform is designed to support everyone involved in maintaining a safe work environment.
          </p>
        </div>

        <div className="mt-16">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((role, index) => (
              <div
                key={role.title}
                className={`relative rounded-2xl bg-white/10 backdrop-blur-sm p-8 shadow-lg transition-all duration-500 border border-white/20 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`${role.color} p-4 rounded-xl mb-6`}>
                    <role.icon className="h-8 w-8 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-4">{role.title}</h3>
                  <p className="text-base text-gray-300 leading-relaxed">{role.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
} 