'use client';

import { useEffect, useState } from 'react';
import { ShieldCheckIcon, ChartBarIcon, BellIcon, CameraIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const features = [
  {
    title: 'AI-Powered Risk Detection',
    description: 'Our advanced AI continuously monitors your site, identifying potential hazards before they become incidents.',
    icon: ShieldCheckIcon,
    color: 'bg-blue-500',
    alignment: 'left'
  },
  {
    title: 'Real-Time Analytics',
    description: 'Get instant insights into safety metrics and trends with our advanced analytics dashboard.',
    icon: ChartBarIcon,
    color: 'bg-green-500',
    alignment: 'right'
  },
  {
    title: 'Smart Alerts',
    description: 'Receive immediate notifications about safety concerns and required actions.',
    icon: BellIcon,
    color: 'bg-red-500',
    alignment: 'left'
  },
  {
    title: 'Automated Documentation',
    description: 'Let AI handle the paperwork while you focus on keeping your team safe.',
    icon: CameraIcon,
    color: 'bg-purple-500',
    alignment: 'right'
  },
  {
    title: 'Compliance Tracking',
    description: 'Stay compliant with automated tracking and reporting of safety regulations.',
    icon: CheckCircleIcon,
    color: 'bg-yellow-500',
    alignment: 'left'
  },
  {
    title: 'Incident Prevention',
    description: 'Proactively prevent incidents with predictive analytics and early warning systems.',
    icon: ExclamationTriangleIcon,
    color: 'bg-orange-500',
    alignment: 'right'
  }
];

export default function Features() {
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

    const element = document.getElementById('features-section');
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
    <section id="features-section" className="relative py-24 sm:py-32">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900" />
      
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Powerful Features
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            Discover how Nexxau's comprehensive suite of features transforms safety management.
          </p>
        </div>

        <div className="mt-16">
          <div className="space-y-24">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`relative flex flex-col ${
                  feature.alignment === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row'
                } items-center gap-12`}
              >
                {/* Icon Card */}
                <div
                  className={`relative w-full lg:w-1/3 ${
                    isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                  } transition-all duration-500`}
                  style={{ transitionDelay: `${index * 200}ms` }}
                >
                  <div className={`${feature.color} p-8 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300`}>
                    <feature.icon className="h-12 w-12 text-white" aria-hidden="true" />
                  </div>
                </div>

                {/* Content */}
                <div
                  className={`w-full lg:w-2/3 ${
                    isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                  } transition-all duration-500`}
                  style={{ transitionDelay: `${index * 200 + 100}ms` }}
                >
                  <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10">
                    <h3 className="text-2xl font-semibold text-white mb-4">{feature.title}</h3>
                    <p className="text-lg text-gray-300 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
} 