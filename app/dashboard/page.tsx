"use client"

import React from 'react'
import Link from 'next/link'
import { FileText, List, Plus, Settings, Search, Bell, User, ChevronRight, Mail, Phone, BarChart, Star } from 'lucide-react'
import Image from 'next/image'
import { Sparkles } from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="bg-black min-h-screen text-white font-sans">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-5 pointer-events-none"></div>
      <div className="relative z-10">
        <nav className="border-b border-gray-800 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
        <Sparkles className="w-8 h-8 text-green-400" />
        <span className="text-2xl font-bold text-white">Dynamic<span className="text-green-400">Draft</span></span>
      </Link>
              <div className="flex items-center space-x-6">
                <Link href="/dashboard" className="text-gray-300 hover:text-white">Dashboard</Link>
                <Link href="/choose-template" className="text-gray-300 hover:text-white">Templates</Link>
                <Link href="/pricing" className="text-gray-300 hover:text-white">Pricing</Link>
                <button className="bg-gradient-to-r from-green-400 to-blue-500 text-black px-4 py-2 rounded-full text-sm font-medium hover:from-green-500 hover:to-blue-600 transition-all duration-300">Upgrade</button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 overflow-visible">
  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 text-transparent bg-clip-text leading-[1.1] py-3 -mt-2">
    Driving careers with AI.
  </h1>
  <p className="text-xl text-gray-400 max-w-2xl mx-auto">
    We craft next-generation resumes and portfolios for forward-thinking professionals, powered by cutting-edge AI technology.
  </p>
</div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <DashboardCard 
              title="Create New Resume" 
              description="Start building an AI-powered resume"
              icon={<Plus className="w-6 h-6" />}
              link="/resume-builder"
            />
            <DashboardCard 
              title="Manage Resumes" 
              description="View and edit your AI-enhanced resumes"
              icon={<List className="w-6 h-6" />}
              link="/manage-resumes"
            />
            <DashboardCard 
              title="AI Templates" 
              description="Choose from our AI-optimized templates"
              icon={<FileText className="w-6 h-6" />}
              link="/choose-template"
            />
             <DashboardCard 
              title="AI Resume Optimizer" 
              description="Choose from our AI-optimized templates"
              icon={<FileText className="w-6 h-6" />}
              link="/resume-optimizer"
            />
            <DashboardCard 
              title="Job Search" 
              description="Choose from our AI-optimized templates"
              icon={<FileText className="w-6 h-6" />}
              link="/JobSearch"
            />
            <DashboardCard 
              title="AI-Powered Interview" 
              description="Choose from our AI-optimized templates"
              icon={<FileText className="w-6 h-6" />}
              link="/IntrviewPrep"
            />
            <DashboardCard 
              title="VC" 
              description="Choose from our AI-optimized templates"
              icon={<FileText className="w-6 h-6" />}
              link="/VC"
            />
          </div>

          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-center">Our process</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <ProcessStep number="01" title="Input" description="Enter your professional details and aspirations" />
              <ProcessStep number="02" title="Analyze" description="Our AI analyzes market trends and your profile" />
              <ProcessStep number="03" title="Generate" description="Receive a tailored, AI-crafted resume" />
            </div>
          </div>

          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-center">User Success Stories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <TestimonialCard 
                name="Sarah J."
                role="Software Engineer"
                quote="DynamicDraft helped me land my dream job at a top tech company. The AI-generated content was spot-on!"
                rating={5}
              />
              <TestimonialCard 
                name="Michael T."
                role="Marketing Manager"
                quote="I was amazed at how quickly I could create a professional resume. Highly recommended!"
                rating={5}
              />
              <TestimonialCard 
                name="Emily R."
                role="Graphic Designer"
                quote="The AI-powered templates are sleek and modern. My resume really stands out now."
                rating={4}
              />
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold mb-6 text-center">Get in touch</h2>
            <div className="flex justify-center space-x-8">
              <ContactInfo icon={<Mail className="w-6 h-6" />} text="hello@dynamicdraft.com" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface DashboardCardProps {
  title: string
  description: string
  icon: React.ReactNode
  link: string
}

function DashboardCard({ title, description, icon, link }: DashboardCardProps) {
  return (
    <Link href={link} className="block">
      <div className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition-colors duration-300 group">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-green-500 p-2 rounded-full group-hover:bg-green-400 transition-colors duration-300">{icon}</div>
          <ChevronRight className="w-5 h-5 text-green-500 group-hover:translate-x-1 transition-transform duration-300" />
        </div>
        <h2 className="text-xl font-semibold mb-2 group-hover:text-green-400 transition-colors duration-300">{title}</h2>
        <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{description}</p>
      </div>
    </Link>
  )
}

interface ProcessStepProps {
  number: string
  title: string
  description: string
}

function ProcessStep({ number, title, description }: ProcessStepProps) {
  return (
    <div className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition-colors duration-300 group">
      <div className="text-green-500 font-bold mb-2 group-hover:text-green-400 transition-colors duration-300">{number}</div>
      <h3 className="text-xl font-semibold mb-2 group-hover:text-white transition-colors duration-300">{title}</h3>
      <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{description}</p>
    </div>
  )
}

interface TestimonialCardProps {
  name: string
  role: string
  quote: string
  rating: number
}

function TestimonialCard({ name, role, quote, rating }: TestimonialCardProps) {
  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex items-center mb-4">
        {[...Array(rating)].map((_, i) => (
          <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
        ))}
      </div>
      <p className="text-gray-300 mb-4 italic">"{quote}"</p>
      <div>
        <p className="font-semibold">{name}</p>
        <p className="text-gray-400">{role}</p>
      </div>
    </div>
  )
}

interface ContactInfoProps {
  icon: React.ReactNode
  text: string
}

function ContactInfo({ icon, text }: ContactInfoProps) {
  return (
    <div className="flex items-center space-x-2">
      <div className="text-green-400">{icon}</div>
      <span>{text}</span>
    </div>
  )
}