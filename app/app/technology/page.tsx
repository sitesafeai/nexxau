'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { 
  VideoCameraIcon, 
  CpuChipIcon, 
  ServerIcon, 
  ComputerDesktopIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  CloudIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const technologies = [
  {
    name: 'Computer Vision AI',
    description: 'Advanced computer vision algorithms that analyze video feeds in real-time to detect safety violations and potential hazards.',
    icon: CpuChipIcon,
    color: 'bg-purple-500',
    features: [
      'Real-time video analysis',
      'PPE violation detection',
      'Behavioral pattern recognition',
      'Hazard identification',
      'Multi-camera processing',
      'Low-light and night vision support'
    ],
    technicalDetails: [
      'YOLO-based object detection',
      'Custom-trained safety violation models',
      'Real-time inference at 30 FPS',
      'Edge computing capabilities',
      'Cloud-based model updates'
    ]
  },
  {
    name: 'Edge Computing',
    description: 'On-site processing capabilities that enable real-time analysis without relying on cloud connectivity.',
    icon: ServerIcon,
    color: 'bg-green-500',
    features: [
      'Local video processing',
      'Reduced latency',
      'Offline operation',
      'Bandwidth optimization',
      'Real-time alerts',
      'Data privacy compliance'
    ],
    technicalDetails: [
      'NVIDIA Jetson integration',
      'TensorRT optimization',
      'Local model inference',
      'Edge-to-cloud synchronization',
      'Failover mechanisms'
    ]
  },
  {
    name: 'Cloud Infrastructure',
    description: 'Scalable cloud platform that handles data storage, analytics, and provides access to safety insights.',
    icon: CloudIcon,
    color: 'bg-blue-500',
    features: [
      'Secure data storage',
      'Scalable processing',
      'Real-time analytics',
      'Multi-tenant architecture',
      'API integrations',
      'Backup and recovery'
    ],
    technicalDetails: [
      'AWS/Azure cloud infrastructure',
      'PostgreSQL database',
      'Redis caching layer',
      'RESTful API architecture',
      'WebSocket real-time updates',
      'Automated scaling'
    ]
  },
  {
    name: 'Mobile Applications',
    description: 'Cross-platform mobile apps that provide instant alerts and allow remote safety management.',
    icon: DevicePhoneMobileIcon,
    color: 'bg-orange-500',
    features: [
      'Push notifications',
      'Real-time alerts',
      'Incident documentation',
      'Safety reporting',
      'Offline capabilities',
      'Cross-platform support'
    ],
    technicalDetails: [
      'React Native framework',
      'iOS and Android support',
      'Push notification services',
      'Offline data sync',
      'Biometric authentication',
      'Location-based alerts'
    ]
  }
];

const aiCapabilities = [
  {
    name: 'PPE Detection',
    description: 'Automatically detects missing or improperly worn personal protective equipment.',
    icon: ShieldCheckIcon,
    accuracy: '98.5%',
    features: ['Hard hat detection', 'Safety vest recognition', 'Glove detection', 'Safety glasses monitoring']
  },
  {
    name: 'Behavioral Analysis',
    description: 'Identifies unsafe behaviors and work practices in real-time.',
    icon: ExclamationTriangleIcon,
    accuracy: '94.2%',
    features: ['Fall detection', 'Unsafe lifting', 'Equipment misuse', 'Zone violations']
  },
  {
    name: 'Hazard Identification',
    description: 'Detects potential hazards before they become incidents.',
    icon: CheckCircleIcon,
    accuracy: '96.8%',
    features: ['Spill detection', 'Equipment malfunction', 'Environmental hazards', 'Structural issues']
  },
  {
    name: 'Predictive Analytics',
    description: 'Uses historical data to predict and prevent future safety incidents.',
    icon: ChartBarIcon,
    accuracy: '89.7%',
    features: ['Risk scoring', 'Trend analysis', 'Incident prediction', 'Safety recommendations']
  }
];

export default function TechnologyPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Our Technology
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Discover the cutting-edge AI and computer vision technology that powers Nexxau's safety monitoring platform. Our advanced algorithms and infrastructure work together to create a comprehensive safety solution.
            </p>
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="bg-gray-800 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-400">Technology Stack</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Built for Performance and Reliability
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Our technology stack combines the latest advances in AI, edge computing, and cloud infrastructure to deliver real-time safety monitoring.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {technologies.map((tech) => (
                <div key={tech.name} className="flex flex-col bg-gray-700 rounded-2xl p-8 border border-gray-600">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`${tech.color} p-3 rounded-lg`}>
                      <tech.icon className="h-8 w-8 text-white" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">{tech.name}</h3>
                  </div>
                  <p className="text-gray-300 mb-6">{tech.description}</p>
                  
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-white mb-3">Key Features</h4>
                    <ul className="space-y-2">
                      {tech.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckCircleIcon className="h-4 w-4 text-blue-400" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mt-auto">
                    <h4 className="text-sm font-semibold text-white mb-3">Technical Details</h4>
                    <ul className="space-y-2">
                      {tech.technicalDetails.map((detail) => (
                        <li key={detail} className="flex items-center gap-2 text-sm text-gray-300">
                          <ArrowRightIcon className="h-4 w-4 text-blue-400" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Capabilities */}
      <div className="bg-gray-900 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-400">AI Capabilities</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Advanced AI Detection
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Our AI models are specifically trained to detect safety violations and hazards with high accuracy.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {aiCapabilities.map((capability) => (
                <div key={capability.name} className="flex flex-col bg-gray-800 rounded-2xl p-6 border border-gray-700">
                  <div className="flex items-center gap-3 mb-4">
                    <capability.icon className="h-6 w-6 text-blue-400" aria-hidden="true" />
                    <h3 className="text-lg font-semibold text-white">{capability.name}</h3>
                  </div>
                  <p className="text-sm text-gray-300 mb-4">{capability.description}</p>
                  <div className="mb-4">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      {capability.accuracy} Accuracy
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {capability.features.map((feature) => (
                      <li key={feature} className="text-xs text-gray-300">• {feature}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Data Flow Section */}
      <div className="bg-gray-800 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-400">Data Flow</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              How Data Flows Through Our System
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              From video capture to actionable insights, see how data moves through our platform.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 mb-4">
                  <VideoCameraIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">1. Video Capture</h3>
                <p className="text-sm text-gray-300">HD cameras capture real-time footage</p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-500 mb-4">
                  <CpuChipIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">2. AI Processing</h3>
                <p className="text-sm text-gray-300">Computer vision analyzes video feeds</p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500 mb-4">
                  <ServerIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">3. Cloud Storage</h3>
                <p className="text-sm text-gray-300">Data securely stored and processed</p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-500 mb-4">
                  <ComputerDesktopIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">4. Dashboard</h3>
                <p className="text-sm text-gray-300">Insights delivered to your dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Documentation Section */}
      <div id="api-docs" className="bg-gray-900 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-400">API Documentation</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Integrate with Nexxau
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Use our RESTful API to integrate Nexxau's safety monitoring capabilities into your existing systems.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-6">Authentication</h3>
              <p className="text-gray-300 mb-4">
                All API requests require authentication using API keys. Include your API key in the Authorization header:
              </p>
              <div className="bg-gray-900 rounded-lg p-4 mb-6">
                <code className="text-green-400 text-sm">
                  Authorization: Bearer YOUR_API_KEY
                </code>
              </div>

              <h3 className="text-xl font-semibold text-white mb-6">Core Endpoints</h3>
              <div className="space-y-6">
                <div className="border border-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-2">Get Alerts</h4>
                  <p className="text-gray-300 mb-2">Retrieve safety alerts and violations</p>
                  <div className="bg-gray-900 rounded p-2 mb-2">
                    <code className="text-blue-400 text-sm">GET /api/v1/alerts</code>
                  </div>
                  <p className="text-sm text-gray-400">Returns list of safety alerts with timestamps, locations, and severity levels</p>
                </div>

                <div className="border border-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-2">Get Analytics</h4>
                  <p className="text-gray-300 mb-2">Access safety analytics and reports</p>
                  <div className="bg-gray-900 rounded p-2 mb-2">
                    <code className="text-blue-400 text-sm">GET /api/v1/analytics</code>
                  </div>
                  <p className="text-sm text-gray-400">Returns safety metrics, compliance data, and trend analysis</p>
                </div>

                <div className="border border-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-2">Create Alert Rule</h4>
                  <p className="text-gray-300 mb-2">Configure custom alert rules</p>
                  <div className="bg-gray-900 rounded p-2 mb-2">
                    <code className="text-green-400 text-sm">POST /api/v1/rules</code>
                  </div>
                  <p className="text-sm text-gray-400">Create custom safety rules and alert conditions</p>
                </div>

                <div className="border border-gray-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-2">Get Camera Status</h4>
                  <p className="text-gray-300 mb-2">Monitor camera health and status</p>
                  <div className="bg-gray-900 rounded p-2 mb-2">
                    <code className="text-blue-400 text-sm">GET /api/v1/cameras</code>
                  </div>
                  <p className="text-sm text-gray-400">Returns camera status, connectivity, and performance metrics</p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mb-6 mt-8">Webhooks</h3>
              <p className="text-gray-300 mb-4">
                Set up webhooks to receive real-time notifications when safety events occur:
              </p>
              <div className="bg-gray-900 rounded-lg p-4 mb-6">
                <code className="text-green-400 text-sm">
                  POST /api/v1/webhooks<br/>
                  {'{'}<br/>
                  &nbsp;&nbsp;"url": "https://your-domain.com/webhook",<br/>
                  &nbsp;&nbsp;"events": ["alert.created", "violation.detected"]<br/>
                  {'}'}
                </code>
              </div>

              <h3 className="text-xl font-semibold text-white mb-6">Rate Limits</h3>
              <p className="text-gray-300 mb-4">
                API requests are limited to 1000 requests per minute per API key. Exceeding this limit will result in a 429 status code.
              </p>

              <div className="mt-8 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                <h4 className="text-lg font-semibold text-blue-400 mb-2">Getting Started</h4>
                <p className="text-gray-300 mb-4">
                  To get started with the Nexxau API:
                </p>
                <ol className="text-gray-300 space-y-2 text-sm">
                  <li>1. Contact our team to get your API key</li>
                  <li>2. Review our complete API documentation</li>
                  <li>3. Test with our sandbox environment</li>
                  <li>4. Integrate with your existing systems</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-900">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to Experience Our Technology?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
              See our technology in action with a personalized demo of the Nexxau platform.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/contact/sales"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Schedule a Demo
              </Link>
              <Link href="/features" className="text-sm font-semibold leading-6 text-white">
                View Features <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 