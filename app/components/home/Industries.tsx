import { BuildingOfficeIcon, BeakerIcon, CogIcon, TruckIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

const industries = [
  {
    name: 'Construction',
    description: 'Comprehensive safety monitoring for general contractors, subcontractors, and builders.',
    icon: BuildingOfficeIcon,
    segments: [
      'General contractors',
      'Subcontractors',
      'Commercial & residential builders'
    ],
    benefits: [
      'High PPE violation detection',
      'OSHA compliance automation',
      'Remote site oversight'
    ],
    color: 'bg-blue-500',
  },
  {
    name: 'Oil & Gas',
    description: 'Advanced safety monitoring for high-risk environments in refineries, pipelines, and drilling platforms.',
    icon: BeakerIcon,
    segments: [
      'Refineries',
      'Pipelines',
      'Drilling platforms'
    ],
    benefits: [
      'Strict safety protocol enforcement',
      'Hazardous environment monitoring',
      'Liability risk reduction'
    ],
    color: 'bg-red-500',
  },
  {
    name: 'Manufacturing & Industrial',
    description: 'Indoor safety compliance monitoring for factories, processing plants, and warehousing operations.',
    icon: CogIcon,
    segments: [
      'Factories',
      'Processing plants',
      'Warehousing operations'
    ],
    benefits: [
      'Indoor PPE compliance',
      'Fine prevention',
      'Worker injury reduction'
    ],
    color: 'bg-green-500',
  },
  {
    name: 'Logistics & Warehousing',
    description: 'Safety monitoring for fulfillment centers, distribution hubs, and freight terminals.',
    icon: TruckIcon,
    segments: [
      'Fulfillment centers',
      'Distribution hubs',
      'Freight terminals'
    ],
    benefits: [
      'Forklift zone monitoring',
      'Moving equipment safety',
      'PPE enforcement'
    ],
    color: 'bg-yellow-500',
  },
  {
    name: 'Infrastructure & Utilities',
    description: 'Remote safety monitoring for public works, electrical, telecom, and maintenance operations.',
    icon: WrenchScrewdriverIcon,
    segments: [
      'Roadwork & bridges',
      'Electrical & telecom',
      'Water/sewer maintenance'
    ],
    benefits: [
      'Strict compliance monitoring',
      'Regional oversight',
      'Public works safety'
    ],
    color: 'bg-purple-500',
  },
];

export default function Industries() {
  return (
    <div className="bg-gray-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Industry Solutions
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Tailored safety monitoring solutions for your specific industry needs
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {/* First row - 3 cards */}
            {industries.slice(0, 3).map((industry) => (
              <div 
                key={industry.name} 
                className="flex flex-col bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300"
              >
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className={`${industry.color} p-2 rounded-lg`}>
                    <industry.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  {industry.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">{industry.description}</p>
                  
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Key Segments</h4>
                    <ul className="space-y-2">
                      {industry.segments.map((segment) => (
                        <li key={segment} className="flex items-center gap-x-2">
                          <div className="h-1.5 w-1.5 flex-none rounded-full bg-gray-400" />
                          {segment}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Key Benefits</h4>
                    <ul className="space-y-2">
                      {industry.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-center gap-x-2">
                          <div className="h-1.5 w-1.5 flex-none rounded-full bg-blue-500" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </dd>
              </div>
            ))}

            {/* Second row - 2 centered cards */}
            <div className="lg:col-span-3 flex justify-center gap-8">
              {industries.slice(3).map((industry) => (
                <div 
                  key={industry.name} 
                  className="flex flex-col bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300 w-full max-w-md"
                >
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    <div className={`${industry.color} p-2 rounded-lg`}>
                      <industry.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    {industry.name}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">{industry.description}</p>
                    
                    <div className="mt-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Key Segments</h4>
                      <ul className="space-y-2">
                        {industry.segments.map((segment) => (
                          <li key={segment} className="flex items-center gap-x-2">
                            <div className="h-1.5 w-1.5 flex-none rounded-full bg-gray-400" />
                            {segment}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Key Benefits</h4>
                      <ul className="space-y-2">
                        {industry.benefits.map((benefit) => (
                          <li key={benefit} className="flex items-center gap-x-2">
                            <div className="h-1.5 w-1.5 flex-none rounded-full bg-blue-500" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </dd>
                </div>
              ))}
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
} 