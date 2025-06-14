'use client';

import { useEffect, useState } from 'react';
import { BeakerIcon, ShieldCheckIcon, ChartBarIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const steps = [
  {
    name: 'AI-Powered Detection',
    description: 'Our advanced AI system continuously monitors your site, detecting safety violations in real-time.',
    icon: BeakerIcon,
    color: 'bg-blue-500',
    image: '/images/ai-detection.jpg',
    features: [
      'Real-time video analysis',
      'PPE violation detection',
      'Hazard identification',
      'Behavioral analysis'
    ]
  },
  {
    name: 'Instant Alerts',
    description: 'Get notified immediately when safety violations are detected, allowing for quick response.',
    icon: ShieldCheckIcon,
    color: 'bg-red-500',
    image: '/images/alerts.jpg',
    features: [
      'Push notifications',
      'Email alerts',
      'SMS notifications',
      'Custom alert rules'
    ]
  },
  {
    name: 'Compliance Tracking',
    description: 'Track and maintain compliance with safety regulations through detailed reporting and analytics.',
    icon: ChartBarIcon,
    color: 'bg-green-500',
    image: '/images/compliance.jpg',
    features: [
      'OSHA compliance reports',
      'Safety performance metrics',
      'Trend analysis',
      'Custom dashboards'
    ]
  },
];

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
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

    const element = document.getElementById('how-it-works');
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
    <div id="how-it-works" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            How SiteSafe Works
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Our comprehensive safety monitoring system combines cutting-edge AI technology with industry expertise to keep your site safe.
          </p>
        </div>

        <div className="mt-16 flow-root">
          <div className="relative">
            {/* Progress bar */}
            <div className="absolute left-1/2 top-0 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />

            {/* Steps */}
            <ul role="list" className="relative">
              {steps.map((step, index) => (
                <li key={step.name} className="mb-12">
                  <div className={`relative flex items-start ${
                    index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                  }`}>
                    {/* Content */}
                    <div className={`flex-1 ${index % 2 === 0 ? 'lg:pr-8' : 'lg:pl-8'}`}>
                      <div className={`relative rounded-2xl bg-white p-8 shadow-lg transition-all duration-500 ${
                        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                      }`}
                      style={{ transitionDelay: `${index * 200}ms` }}>
                        <div className="flex items-center gap-x-4">
                          <div className={`${step.color} p-3 rounded-lg`}>
                            <step.icon className="h-6 w-6 text-white" aria-hidden="true" />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900">{step.name}</h3>
                        </div>
                        <p className="mt-4 text-base text-gray-600">{step.description}</p>
                        
                        <div className="mt-6">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">Key Features</h4>
                          <ul className="grid grid-cols-2 gap-3">
                            {step.features.map((feature) => (
                              <li key={feature} className="flex items-center gap-x-2">
                                <div className="h-1.5 w-1.5 flex-none rounded-full bg-blue-500" />
                                <span className="text-sm text-gray-600">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-6">
                          <button
                            onClick={() => setActiveStep(index)}
                            className={`inline-flex items-center gap-x-2 text-sm font-semibold ${
                              activeStep === index ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
                            }`}
                          >
                            Learn more
                            <ArrowRightIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Image */}
                    <div className="flex-1">
                      <div className={`relative rounded-2xl overflow-hidden transition-all duration-500 ${
                        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                      }`}
                      style={{ transitionDelay: `${index * 200 + 100}ms` }}>
                        <div className="aspect-w-16 aspect-h-9">
                          <img
                            src={step.image}
                            alt={step.name}
                            className="object-cover rounded-2xl shadow-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Transition Section */}
      <div className="relative mt-24">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-50 to-gray-50" />
        <div className="relative">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-center gap-8">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 rounded-full bg-blue-300 animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 