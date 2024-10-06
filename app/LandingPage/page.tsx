"use client"

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FileText, List, Plus, Settings, Search, Bell, User, ChevronRight, Mail, Phone, Zap, Check, Edit, Layout, GripVertical, SpellCheck, Download } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="bg-black min-h-screen text-white font-sans">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-5 pointer-events-none"></div>
      <div className="relative z-10">
        <nav className="border-b border-gray-800 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-green-400">Dynamic Draft</span>
              <div className="flex items-center space-x-6">
                <Link href="/features" className="text-gray-300 hover:text-white">Features</Link>
                <Link href="/templates" className="text-gray-300 hover:text-white">Templates</Link>
                <Link href="/pricing" className="text-gray-300 hover:text-white">Pricing</Link>
                <button className="bg-gradient-to-r from-green-400 to-blue-500 text-black px-4 py-2 rounded-full text-sm font-medium hover:from-green-500 hover:to-blue-600 transition-all duration-300">Get Started</button>
              </div>
            </div>
          </div>
        </nav>

        <header className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-green-400 to-blue-500 text-transparent bg-clip-text">Craft Your Future with AI-Powered Resumes</h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">Dynamic Draft uses cutting-edge AI to create personalized, impactful resumes that stand out in today's competitive job market.</p>
            <button className="bg-gradient-to-r from-green-400 to-blue-500 text-black px-8 py-3 rounded-full text-lg font-medium hover:from-green-500 hover:to-blue-600 transition-all duration-300">Start Building Your Resume</button>
          </div>
        </header>

        <section className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-12 text-center">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              title="AI-Powered Grammar Check"
              description="Real-time grammar and style suggestions to perfect your resume content."
              icon={<SpellCheck className="w-6 h-6" />}
            />
            <FeatureCard 
              title="Drag-and-Drop Sections"
              description="Easily reorganize your resume sections with intuitive drag-and-drop functionality."
              icon={<GripVertical className="w-6 h-6" />}
            />
            <FeatureCard 
              title="Dynamic Preview"
              description="See your changes in real-time with our live preview feature."
              icon={<Layout className="w-6 h-6" />}
            />
            <FeatureCard 
              title="Customizable Skills"
              description="Add, remove, and categorize your skills with ease."
              icon={<List className="w-6 h-6" />}
            />
            <FeatureCard 
              title="Project Showcase"
              description="Highlight your projects with detailed descriptions and bullet points."
              icon={<FileText className="w-6 h-6" />}
            />
            <FeatureCard 
              title="One-Click Export"
              description="Export your polished resume as a PDF with a single click."
              icon={<Download className="w-6 h-6" />}
            />
          </div>
        </section>

        <section className="bg-gray-900 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold mb-12 text-center">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <ProcessStep number="01" title="Input Your Details" description="Enter your personal info, education, experience, and projects." />
              <ProcessStep number="02" title="Customize & Refine" description="Use our AI grammar check and drag-and-drop interface to perfect your resume." />
              <ProcessStep number="03" title="Export & Apply" description="Preview your polished resume and export it as a professional PDF." />
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-12 text-center">Why Choose Dynamic Draft</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ReasonCard 
              title="AI-Powered Assistance"
              description="Our advanced AI helps you craft compelling content and catch errors."
            />
            <ReasonCard 
              title="User-Friendly Interface"
              description="Intuitive design makes resume building a breeze, even for beginners."
            />
            <ReasonCard 
              title="Customization Options"
              description="Tailor your resume with flexible sections and skill categories."
            />
            <ReasonCard 
              title="Professional Results"
              description="Create polished, ATS-friendly resumes that stand out to employers."
            />
          </div>
        </section>

        <section className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-12 text-center">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TestimonialCard 
              quote="Dynamic Draft helped me land my dream job. The AI-generated content was spot-on!"
              author="Sarah L., Software Engineer"
            />
            <TestimonialCard 
              quote="I was amazed at how quickly I could create a professional resume. Highly recommended!"
              author="Michael R., Marketing Manager"
            />
            <TestimonialCard 
              quote="The smart formatting feature saved me hours of work. This tool is a game-changer."
              author="Emily T., Recent Graduate"
            />
          </div>
        </section>

        <section className="bg-gray-900 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FAQItem 
                question="How does the AI-powered grammar check work?"
                answer="Our AI analyzes your text in real-time, suggesting improvements for grammar, style, and resume-specific terminology to ensure your resume is polished and professional."
              />
              <FAQItem 
                question="Can I export my resume in different formats?"
                answer="Yes, you can export your resume as a PDF, which is the most widely accepted format for job applications. We're working on adding more export options in the future."
              />
              <FAQItem 
                question="Is my data safe and private?"
                answer="Absolutely. We take data privacy seriously and use industry-standard encryption to protect your information. We never share your personal data with third parties."
              />
              <FAQItem 
                question="How often can I update my resume?"
                answer="You can update your resume as often as you like! Our platform saves your changes automatically, allowing you to continuously refine your resume as your career progresses."
              />
            </div>
          </div>
        </section>

        <footer className="bg-gray-900 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Dynamic Draft</h3>
                <p className="text-gray-400">Empowering careers with AI-driven resumes.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                <ul className="space-y-2">
                  <li><Link href="/features" className="text-gray-400 hover:text-white">Features</Link></li>
                  <li><Link href="/templates" className="text-gray-400 hover:text-white">Templates</Link></li>
                  <li><Link href="/pricing" className="text-gray-400 hover:text-white">Pricing</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li><Link href="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="text-gray-400 hover:text-white">Terms of Service</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
                <ContactInfo icon={<Mail className="w-5 h-5" />} text="hello@dynamicdraft.com" />
                <ContactInfo icon={<Phone className="w-5 h-5" />} text="+1 (555) 123-4567" />
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

interface FeatureCardProps {
  title: string
  description: string
  icon: React.ReactNode
}

function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition-colors duration-300">
      <div className="bg-green-500 p-2 rounded-full w-12 h-12 flex items-center justify-center mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  )
}

interface ProcessStepProps {
  number: string
  title: string
  description: string
}

function ProcessStep({ number, title, description }: ProcessStepProps) {
  return (
    <div className="text-center">
      <div className="text-green-400 font-bold text-4xl mb-2">{number}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  )
}

interface ReasonCardProps {
  title: string
  description: string
}

function ReasonCard({ title, description }: ReasonCardProps) {
  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  )
}

interface ContactInfoProps {
  icon: React.ReactNode
  text: string
}

function ContactInfo({ icon, text }: ContactInfoProps) {
  return (
    <div className="flex items-center space-x-2 mb-2">
      <div className="text-green-400">{icon}</div>
      <span className="text-gray-400">{text}</span>
    </div>
  )
}

interface TestimonialCardProps {
  quote: string
  author: string
}

function TestimonialCard({ quote, author }: TestimonialCardProps) {
  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <p className="text-gray-300 mb-4 italic">"{quote}"</p>
      <p className="text-green-400 font-semibold">- {author}</p>
    </div>
  )
}

interface FAQItemProps {
  question: string
  answer: string
}

function FAQItem({ question, answer }: FAQItemProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-2 text-green-400">{question}</h3>
      <p className="text-gray-300">{answer}</p>
    </div>
  )
}