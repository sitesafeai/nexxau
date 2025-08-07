'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { 
  QuestionMarkCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  VideoCameraIcon,
  ShieldCheckIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const faqCategories = [
  {
    name: 'Getting Started',
    icon: BookOpenIcon,
    color: 'bg-blue-500',
    faqs: [
      {
        question: 'How do I set up Nexxau for my site?',
        answer: 'Our team will work with you to install cameras, configure the AI system, and train your staff. The entire setup process typically takes 3-7 days depending on your site size and requirements.'
      },
      {
        question: 'What equipment do I need?',
        answer: 'You\'ll need IP cameras, internet connectivity, and our AI processing unit. We provide detailed specifications and can help you choose the right equipment for your needs.'
      },
      {
        question: 'How long does training take?',
        answer: 'Initial training takes 2-4 hours and covers dashboard navigation, alert management, and reporting. Additional training sessions are available as needed.'
      }
    ]
  },
  {
    name: 'Technical Support',
    icon: VideoCameraIcon,
    color: 'bg-green-500',
    faqs: [
      {
        question: 'What if my cameras go offline?',
        answer: 'Our system automatically detects camera issues and sends alerts. We provide 24/7 technical support to help resolve connectivity problems quickly.'
      },
      {
        question: 'How do I update the AI models?',
        answer: 'AI model updates are handled automatically by our system. You\'ll receive notifications when updates are available and can schedule them during maintenance windows.'
      },
      {
        question: 'Can I integrate with existing systems?',
        answer: 'Yes, we offer API integrations with most safety management systems, HR platforms, and reporting tools. Contact our technical team for integration support.'
      }
    ]
  },
  {
    name: 'Account & Billing',
    icon: ShieldCheckIcon,
    color: 'bg-purple-500',
    faqs: [
      {
        question: 'How do I add more users to my account?',
        answer: 'Account administrators can add users through the dashboard. Each user can be assigned specific roles and permissions based on their responsibilities.'
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept major credit cards, ACH transfers, and wire transfers. Invoices are sent monthly or annually depending on your billing cycle.'
      },
      {
        question: 'Can I change my subscription plan?',
        answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.'
      }
    ]
  }
];

const supportChannels = [
  {
    name: 'Phone Support',
    description: 'Speak directly with our support team',
    icon: PhoneIcon,
    color: 'bg-blue-500',
    contact: '+1 305-331-5002',
    availability: '24/7'
  },
  {
    name: 'Email Support',
    description: 'Send us detailed questions or issues',
    icon: EnvelopeIcon,
    color: 'bg-green-500',
    contact: 'support@nexxau.com',
    availability: 'Response within 4 hours'
  },
  {
    name: 'Live Chat',
    description: 'Get instant help from our team',
    icon: ChatBubbleLeftRightIcon,
    color: 'bg-purple-500',
    contact: 'Available on dashboard',
    availability: 'Business hours'
  }
];

export default function HelpPage() {
  const [openFaqs, setOpenFaqs] = useState<{[key: string]: boolean}>({});

  const toggleFaq = (categoryIndex: number, faqIndex: number) => {
    const key = `${categoryIndex}-${faqIndex}`;
    setOpenFaqs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Help Center
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Find answers to common questions, get technical support, and learn how to make the most of Nexxau.
            </p>
          </div>
        </div>
      </div>

      {/* Support Channels */}
      <div className="bg-gray-800 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-400">Get Support</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Multiple Ways to Get Help
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Our support team is here to help you succeed with Nexxau.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {supportChannels.map((channel) => (
                <div key={channel.name} className="flex flex-col bg-gray-700 rounded-2xl p-8 border border-gray-600">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`${channel.color} p-3 rounded-lg`}>
                      <channel.icon className="h-8 w-8 text-white" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">{channel.name}</h3>
                  </div>
                  <p className="text-gray-300 mb-4">{channel.description}</p>
                  <div className="mt-auto">
                    <p className="text-lg font-semibold text-blue-400 mb-2">{channel.contact}</p>
                    <p className="text-sm text-gray-400">{channel.availability}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Sections */}
      <div className="bg-gray-900 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-400">Frequently Asked Questions</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Find Answers Quickly
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Browse our FAQ sections to find answers to common questions.
            </p>
          </div>
          
          <div className="mx-auto mt-16 max-w-4xl">
            {faqCategories.map((category, categoryIndex) => (
              <div key={category.name} className="mb-12">
                <div className="flex items-center gap-4 mb-8">
                  <div className={`${category.color} p-3 rounded-lg`}>
                    <category.icon className="h-8 w-8 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">{category.name}</h3>
                </div>
                
                <div className="space-y-4">
                  {category.faqs.map((faq, faqIndex) => {
                    const key = `${categoryIndex}-${faqIndex}`;
                    const isOpen = openFaqs[key];
                    
                    return (
                      <div key={faqIndex} className="bg-gray-800 rounded-lg border border-gray-700">
                        <button
                          onClick={() => toggleFaq(categoryIndex, faqIndex)}
                          className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-700 transition-colors"
                        >
                          <span className="text-lg font-semibold text-white">{faq.question}</span>
                          <QuestionMarkCircleIcon 
                            className={`h-6 w-6 text-blue-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                          />
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-4">
                            <p className="text-gray-300">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Documentation Links */}
      <div className="bg-gray-800 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-400">Documentation</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Learn More
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Access our comprehensive documentation and training materials.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-gray-700 rounded-2xl p-8 border border-gray-600">
                <h3 className="text-xl font-semibold text-white mb-4">User Guide</h3>
                <p className="text-gray-300 mb-6">Complete guide to using Nexxau's dashboard and features.</p>
                <Link href="/help" className="text-blue-400 hover:text-blue-300 font-semibold">
                  Read Guide →
                </Link>
              </div>
              <div className="bg-gray-700 rounded-2xl p-8 border border-gray-600">
                <h3 className="text-xl font-semibold text-white mb-4">API Documentation</h3>
                <p className="text-gray-300 mb-6">Technical documentation for integrating with Nexxau's API.</p>
                <Link href="/technology#api-docs" className="text-blue-400 hover:text-blue-300 font-semibold">
                  View API Docs →
                </Link>
              </div>
              <div className="bg-gray-700 rounded-2xl p-8 border border-gray-600">
                <h3 className="text-xl font-semibold text-white mb-4">Training Videos</h3>
                <p className="text-gray-300 mb-6">Video tutorials and training materials for your team.</p>
                <Link href="/demo" className="text-blue-400 hover:text-blue-300 font-semibold">
                  Watch Videos →
                </Link>
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
              Still Need Help?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
              Can't find what you're looking for? Our support team is ready to help.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/contact"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Contact Support
              </Link>
              <Link href="/demo" className="text-sm font-semibold leading-6 text-white">
                Schedule Training <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 