// app/dashboard/page.tsx
'use client'; // Ensure this is a client component
import { signOut, useSession } from 'next-auth/react';
import { Menu, Transition } from '@headlessui/react'
import Image from 'next/image'
import { MessageCircle, UserCircle } from 'lucide-react'
import React, { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle, ChevronRight, Edit, FileText, Mail, Plus, Sparkles, Star, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CheckSignInStatus from "../CheckSignInStatus";
import { Fredoka } from '@next/font/google';

const fredoka = Fredoka({ weight: ['400','600'], subsets: ['latin'] });


export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const routes = [
    '/resume-builder',
    '/manage-resumes',
    '/choose-template',
    '/resume-optimizer',
    '/IntrviewPrep',
    '/intmock'
  ];

  // Optimize route prefetching
  const prefetchRoutes = useCallback(() => {
    routes.forEach(route => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = route;
      document.head.appendChild(link);
    });
  }, []);

  // Update useEffect for better prefetching
  useEffect(() => {
    prefetchRoutes();
    // Preload the most common routes immediately
    router.prefetch('/resume-builder');
    router.prefetch('/manage-resumes');
  }, [router, prefetchRoutes]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-400"></div>
      </div>
    );
  }

  if (!session) return null;

  const dashboardCards = [
    {
      title: "Create New Resume",
      description: "Build an AI-powered resume effortlessly",
      icon: <Plus className="w-6 h-6" />,
      link: "/resume-builder"
    },
    {
      title: "Manage Resumes",
      description: "Edit and view your AI-enhanced resumes",
      icon: <Edit className="w-6 h-6" />,
      link: "/manage-resumes"
    },
    {
      title: "AI Templates",
      description: "Select from a variety of optimized templates",
      icon: <FileText className="w-6 h-6" />,
      link: "/choose-template"
    },
    {
      title: "AI Resume Optimizer",
      description: "Optimize your resume for ATS compatibility",
      icon: <CheckCircle className="w-6 h-6" />,
      link: "/resume-optimizer"
    },
    {
      title: "Interview Prep",
      description: "Prepare for your next interview",
      icon: <UserCheck className="w-6 h-6" />,
      link: "/IntrviewPrep"
    },

    {
      title: "AI Mock Interview",
      description: "Practice your interview skills with AI",
      icon: <MessageCircle className="w-6 h-6" />,
      link: "/intmock"
    }

  ];

  return (
    <div className="bg-black min-h-screen text-white font-sans">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-5 pointer-events-none"></div>
      <div className="relative z-10">
        <nav className="border-b border-gray-800 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
  <Sparkles className="w-8 h-8 text-green-400" />
  <span className={`text-3xl font-bold text-white ${fredoka.className}`}>
    Dynamic<span className="text-green-400">Draft</span>
  </span>
</Link>
              <div className="flex items-center space-x-6">
                <Link href="/dashboard" className="text-gray-300 hover:text-white">Dashboard</Link>
                <Link href="/choose-template" className="text-gray-300 hover:text-white">Templates</Link>
                <Link href="/pricing" className="text-gray-300 hover:text-white">Pricing</Link>
                <button className="bg-gradient-to-r from-green-400 to-blue-500 text-black px-4 py-2 rounded-full text-sm font-medium hover:from-green-500 hover:to-blue-600 transition-all duration-300">Upgrade</button>

                <Menu as="div" className="relative inline-block text-left">
                <div>
                <Menu.Button className="flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    {session.user.image ? (
                      <Image
                        priority={true}
                        src={session.user.image}
                        alt="Profile"
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <UserCircle className="w-8 h-8 text-gray-400" />
                    )}
                    
                  </Menu.Button>
                </div>
                <Transition
                  as={React.Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none">
                    <div className="py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            href="/profile"
                            className={`${
                              active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                            } block px-4 py-2 text-sm`}
                          >
                            Profile
                          </Link>
                        )}
                      </Menu.Item>
                    </div>
                    <div className="py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => signOut({ redirect: true, callbackUrl: "/" })}
                            className={`${
                              active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                            } block w-full text-left px-4 py-2 text-sm`}
                          >
                            Sign out
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>

              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 overflow-visible">
  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 text-transparent bg-clip-text leading-[1.1] py-3 -mt-2">
    Driving careers with AI.
  </h1>
  <div>
      <h1>Welcome to My App</h1>
      <CheckSignInStatus />
    </div>
  <p className="text-xl text-gray-400 max-w-2xl mx-auto">
    We craft next-generation resumes and portfolios for forward-thinking professionals, powered by cutting-edge AI technology.
  </p>
</div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {dashboardCards.map((card, index) => (
              <DashboardCard
                key={index}
                title={card.title}
                description={card.description}
                icon={card.icon}
                link={card.link}
              />

            ))}
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
  const router = useRouter();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(link, undefined, { shallow: true });
  };

  return (
    <Link 
      href={link} 
      prefetch={true}
      onClick={handleClick}
      className="block transform transition-transform hover:scale-[1.02] duration-200"
    >
      <div className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition-colors duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-green-500 p-2 rounded-full group-hover:bg-green-400 transition-colors duration-200">{icon}</div>
          <ChevronRight className="w-5 h-5 text-green-500 group-hover:translate-x-1 transition-transform duration-200" />
        </div>
        <h2 className="text-xl font-semibold mb-2 group-hover:text-green-400 transition-colors duration-200">{title}</h2>
        <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-200">{description}</p>
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

const transitionClasses = {
  card: "transition-all duration-200 ease-out",
  hover: "transition-transform duration-200 ease-out",
  color: "transition-colors duration-200 ease-out"
};