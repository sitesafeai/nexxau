'use client';

import { useEffect, useState } from 'react';
import { BeakerIcon, ShieldCheckIcon, ChartBarIcon, ArrowRightIcon, VideoCameraIcon, CpuChipIcon, ServerIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

const steps = [
  {
    name: 'Video Capture',
    description: 'High-definition cameras continuously monitor your worksite, capturing real-time footage of all activities.',
    icon: VideoCameraIcon,
    color: 'bg-blue-500',
    features: [
      '24/7 continuous recording',
      'HD video quality',
      'Wide-angle coverage',
      'Night vision capability'
    ],
    animation: 'capture'
  },
  {
    name: 'AI Processing',
    description: 'Our advanced AI algorithms analyze the video feed in real-time, detecting safety violations and potential hazards.',
    icon: CpuChipIcon,
    color: 'bg-purple-500',
    features: [
      'Real-time analysis',
      'PPE detection',
      'Behavioral analysis',
      'Hazard identification'
    ],
    animation: 'process'
  },
  {
    name: 'Server Processing',
    description: 'Processed data is securely transmitted to our cloud servers for further analysis and alert generation.',
    icon: ServerIcon,
    color: 'bg-green-500',
    features: [
      'Secure transmission',
      'Cloud processing',
      'Data encryption',
      'Redundant storage'
    ],
    animation: 'server'
  },
  {
    name: 'Dashboard Display',
    description: 'Results are instantly displayed on your dashboard with real-time alerts and comprehensive reporting.',
    icon: ComputerDesktopIcon,
    color: 'bg-orange-500',
    features: [
      'Real-time alerts',
      'Live dashboard',
      'Detailed reports',
      'Mobile notifications'
    ],
    animation: 'display'
  },
];

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [animatedSteps, setAnimatedSteps] = useState<number[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Animate steps sequentially
          steps.forEach((_, index) => {
            setTimeout(() => {
              setAnimatedSteps(prev => [...prev, index]);
            }, index * 800);
          });
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

  const getAnimationClass = (stepIndex: number, animationType: string) => {
    if (!animatedSteps.includes(stepIndex)) return '';
    
    switch (animationType) {
      case 'capture':
        return 'animate-pulse';
      case 'process':
        return 'animate-spin';
      case 'server':
        return 'animate-bounce';
      case 'display':
        return 'animate-ping';
      default:
        return '';
    }
  };

  return (
    <div id="how-it-works" className="bg-gray-900 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How Nexxau Works
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            Our comprehensive safety monitoring system combines cutting-edge AI technology with industry expertise to keep your site safe.
          </p>
        </div>

        <div className="mt-16 flow-root">
          <div className="relative">
            {/* Animated Progress Line */}
            <div className="absolute left-1/2 top-0 -ml-px h-full w-1 bg-gradient-to-b from-blue-500 via-purple-500 via-green-500 to-orange-500">
              <div className={`h-full w-full bg-gradient-to-b from-blue-500 via-purple-500 via-green-500 to-orange-500 transition-all duration-2000 ${
                isVisible ? 'opacity-100' : 'opacity-0'
              }`} />
            </div>

            {/* Steps */}
            <ul role="list" className="relative">
              {steps.map((step, index) => (
                <li key={step.name} className="mb-16">
                  <div className={`relative flex items-start ${
                    index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                  }`}>
                    {/* Content */}
                    <div className={`flex-1 ${index % 2 === 0 ? 'lg:pr-12' : 'lg:pl-12'}`}>
                      <div className={`relative rounded-2xl bg-gray-800 p-8 shadow-lg transition-all duration-1000 border border-gray-700 ${
                        animatedSteps.includes(index) ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95'
                      }`}
                      style={{ transitionDelay: `${index * 200}ms` }}>
                        
                        {/* Animated Icon */}
                        <div className="flex items-center gap-x-4 mb-6">
                          <div className={`${step.color} p-4 rounded-xl ${getAnimationClass(index, step.animation)}`}>
                            <step.icon className="h-8 w-8 text-white" aria-hidden="true" />
                          </div>
                          <h3 className="text-2xl font-bold text-white">{step.name}</h3>
                        </div>
                        
                        <p className="text-lg text-gray-300 mb-6 leading-relaxed">{step.description}</p>
                        
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">Key Features</h4>
                          <ul className="grid grid-cols-1 gap-3">
                            {step.features.map((feature) => (
                              <li key={feature} className="flex items-center gap-x-3">
                                <div className="h-2 w-2 flex-none rounded-full bg-blue-500" />
                                <span className="text-sm text-gray-300">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex justify-center">
                          <button
                            onClick={() => setActiveStep(index)}
                            className={`inline-flex items-center gap-x-2 text-sm font-semibold transition-colors ${
                              activeStep === index ? 'text-blue-400' : 'text-gray-400 hover:text-blue-400'
                            }`}
                          >
                            Learn more
                            <ArrowRightIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Visual Representation */}
                    <div className="flex-1">
                      <div className={`relative rounded-2xl overflow-hidden transition-all duration-1000 ${
                        animatedSteps.includes(index) ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95'
                      }`}
                      style={{ transitionDelay: `${index * 200 + 300}ms` }}>
                        
                        {/* Step-specific visual */}
                        <div className="aspect-w-16 aspect-h-9 bg-gray-800 border border-gray-700 rounded-2xl p-8 flex items-center justify-center">
                          {step.animation === 'capture' && (
                            <div className="text-center">
                              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
                                <VideoCameraIcon className="h-8 w-8 text-white" />
                              </div>
                              <div className="space-y-2">
                                <div className="h-2 bg-gray-600 rounded w-32"></div>
                                <div className="h-2 bg-gray-600 rounded w-24"></div>
                                <div className="h-2 bg-gray-600 rounded w-28"></div>
                              </div>
                            </div>
                          )}
                          
                          {step.animation === 'process' && (
                            <div className="text-center">
                              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mb-4 animate-spin">
                                <CpuChipIcon className="h-8 w-8 text-white" />
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="h-3 bg-purple-400 rounded"></div>
                                <div className="h-3 bg-purple-400 rounded"></div>
                                <div className="h-3 bg-purple-400 rounded"></div>
                                <div className="h-3 bg-purple-400 rounded"></div>
                                <div className="h-3 bg-purple-400 rounded"></div>
                                <div className="h-3 bg-purple-400 rounded"></div>
                              </div>
                            </div>
                          )}
                          
                          {step.animation === 'server' && (
                            <div className="text-center">
                              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4 animate-bounce">
                                <ServerIcon className="h-8 w-8 text-white" />
                              </div>
                              <div className="space-y-1">
                                <div className="h-1 bg-green-400 rounded w-full"></div>
                                <div className="h-1 bg-green-400 rounded w-3/4"></div>
                                <div className="h-1 bg-green-400 rounded w-1/2"></div>
                              </div>
                            </div>
                          )}
                          
                          {step.animation === 'display' && (
                            <div className="text-center">
                              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mb-4 animate-ping">
                                <ComputerDesktopIcon className="h-8 w-8 text-white" />
                              </div>
                              <div className="bg-gray-700 rounded p-2">
                                <div className="h-2 bg-orange-400 rounded w-full mb-1"></div>
                                <div className="h-2 bg-orange-400 rounded w-2/3"></div>
                              </div>
                            </div>
                          )}
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

      {/* Enhanced Transition Section */}
      <div className="relative mt-24">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900" />
        <div className="relative">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-center gap-8">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-600 to-transparent" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" style={{ animationDelay: '0.6s' }} />
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-600 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 