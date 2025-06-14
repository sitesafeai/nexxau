import { Disclosure } from '@headlessui/react';
import { ChevronUpIcon } from '@heroicons/react/24/outline';

interface FAQ {
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    question: "What is SiteSafe?",
    answer: "SiteSafe is an AI-powered safety monitoring system that helps construction sites maintain compliance with safety regulations and prevent accidents."
  },
  {
    question: "How does the AI detection work?",
    answer: "Our AI system uses computer vision to analyze video feeds in real-time, detecting safety violations such as missing PPE, unsafe behaviors, and potential hazards."
  },
  {
    question: "What kind of alerts do I receive?",
    answer: "You'll receive instant notifications via email, SMS, or push notifications when safety violations are detected, allowing for immediate response."
  },
  {
    question: "Is my data secure?",
    answer: "Yes, we use industry-standard encryption and security measures to protect your data. All video feeds and alerts are processed securely."
  },
  {
    question: "Can I customize the safety rules?",
    answer: "Yes, you can customize safety rules and thresholds based on your site's specific requirements and safety protocols."
  }
];

export default function FAQ() {
  return (
    <div className="bg-gray-50">
      {/* Transition Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-blue-50 to-gray-50" />
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

      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 lg:py-40">
        <div className="mx-auto max-w-4xl divide-y divide-gray-900/10">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <dl className="mt-10 space-y-6 divide-y divide-gray-900/10">
            {faqs.map((faq) => (
              <Disclosure as="div" key={faq.question} className="pt-6">
                {({ open }) => (
                  <>
                    <dt>
                      <Disclosure.Button className="flex w-full items-start justify-between text-left text-gray-900">
                        <span className="text-base font-semibold leading-7">{faq.question}</span>
                        <span className="ml-6 flex h-7 items-center">
                          <ChevronUpIcon
                            className={`${open ? 'rotate-180 transform' : ''} h-6 w-6 text-blue-600`}
                            aria-hidden="true"
                          />
                        </span>
                      </Disclosure.Button>
                    </dt>
                    <Disclosure.Panel as="dd" className="mt-2 pr-12">
                      <p className="text-base leading-7 text-gray-600">{faq.answer}</p>
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
} 