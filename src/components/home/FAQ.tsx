'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const faqs = [
  {
    question: 'How does SiteSafe\'s AI detect safety violations?',
    answer: 'Our AI uses computer vision to analyze video feeds in real-time, detecting PPE violations, unsafe behaviors, and hazardous conditions. The system is trained on millions of safety scenarios and continuously improves its accuracy.'
  },
  {
    question: 'What kind of hardware do I need?',
    answer: 'SiteSafe works with most IP cameras and can be integrated with your existing security infrastructure. We also offer complete hardware bundles with AI-ready cameras and mounting equipment.'
  },
  {
    question: 'How long does it take to implement?',
    answer: 'Most customers are up and running within 2-4 weeks. The process includes camera installation, AI model training for your specific environment, and team training.'
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. All data is encrypted in transit and at rest. We comply with industry security standards and never share your data with third parties.'
  },
  {
    question: 'Can I customize the safety rules?',
    answer: 'Absolutely. You can define custom safety rules, alert thresholds, and notification preferences to match your specific safety requirements.'
  },
  {
    question: 'What kind of support do you offer?',
    answer: 'We provide 24/7 technical support, regular system updates, and dedicated account management. Our team of safety experts is always available to help optimize your safety program.'
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="relative py-24 sm:py-32">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 to-gray-900/60" />
      
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            Get answers to common questions about SiteSafe's AI-powered safety solutions.
          </p>
        </div>

        <div className="mt-16">
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`relative rounded-2xl bg-white/10 backdrop-blur-sm p-6 shadow-lg transition-all duration-300 border border-white/20 ${
                  openIndex === index ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <button
                  className="flex w-full items-start justify-between text-left"
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                >
                  <span className="text-lg font-semibold text-white">{faq.question}</span>
                  <ChevronDownIcon
                    className={`h-6 w-6 text-gray-300 transition-transform duration-300 ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openIndex === index && (
                  <div className="mt-4 text-base text-gray-300 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
} 