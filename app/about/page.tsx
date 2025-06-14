'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/src/components/Navbar';
import Footer from '@/src/components/home/Footer';
import { CloudinaryImage } from '../lib/cloudinary';
import { 
  HeartIcon, 
  LightBulbIcon, 
  GlobeAmericasIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const values = [
  {
    name: 'Innovation',
    description: 'We believe in pushing the boundaries of what\'s possible in construction safety through cutting-edge AI technology.',
    icon: LightBulbIcon,
  },
  {
    name: 'Safety First',
    description: 'Every decision we make is guided by our commitment to protecting workers and creating safer construction sites.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Global Impact',
    description: "From Rio to Miami and beyond, we're building a safer future for construction workers worldwide.",
    icon: GlobeAmericasIcon,
  },
  {
    name: 'Data-Driven',
    description: 'We use advanced analytics and AI to transform safety management from reactive to proactive.',
    icon: ChartBarIcon,
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Our Story
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Building a safer future for construction workers through technology and innovation.
            </p>
          </div>
        </div>
      </div>

      {/* Founder's Story */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-2">
          <div className="relative">
            <div className="aspect-[3/2] overflow-hidden rounded-2xl bg-gray-800">
              <CloudinaryImage
                src="https://res.cloudinary.com/dvab4kk60/image/upload/v1717890000/about/founder.jpg"
                alt="Luiz Carneiro, Founder of SiteSafe"
                width={800}
                height={600}
                className="object-cover"
              />
            </div>
          </div>
          <div className="lg:pl-8">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              From Rio to Miami: A Journey of Innovation
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Born in Rio de Janeiro and raised in Miami, I've always been passionate about two things: technology and helping people. Growing up, I witnessed firsthand how technology could transform lives and solve complex problems. But it wasn't until I saw the challenges faced by blue-collar workers across various industries that I found my true calling.
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              After years of working in tech and seeing the devastating impact of workplace accidents, I realized there had to be a better way. Why couldn't we use the same AI technology that powers self-driving cars to protect workers in industrial settings? This question led to the creation of SiteSafe.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <Link
                href="/contact"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Join Our Mission
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="bg-gray-800">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-400">Our Mission</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Revolutionizing Construction Safety
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              We're on a mission to eliminate preventable accidents in construction through AI-powered safety solutions. By combining cutting-edge technology with deep industry expertise, we're creating a future where every construction worker goes home safely at the end of the day.
            </p>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-400">Our Values</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            What Drives Us Forward
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
            {values.map((value) => (
              <div key={value.name} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-white">
                  <value.icon className="h-5 w-5 flex-none text-blue-400" aria-hidden="true" />
                  {value.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-300">
                  <p className="flex-auto">{value.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Impact Section */}
      <div className="bg-gray-800">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-400">Our Vision</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Making a Difference
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              Our goal is to revolutionize workplace safety through AI-powered solutions. We're building technology that will help companies reduce safety incidents and achieve higher compliance rates. But our true measure of success won't be in numbers—it will be in the lives we help protect and the families we keep whole.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Join Us in Building a Safer Future
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
            Whether you're a construction company looking to improve safety or a tech enthusiast passionate about making a difference, we'd love to have you join our mission.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/contact"
              className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Get Started
            </Link>
            <Link href="/demo" className="text-sm font-semibold leading-6 text-white">
              Watch Demo <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
} 