"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { templates } from '../templates/templateData'
import { CheckCircle, Sparkles, Search, Menu, X } from 'lucide-react'
import { Fredoka } from '@next/font/google';

const fredoka = Fredoka({ weight: ['400','600'], subsets: ['latin'] });

export default function ChooseTemplate() {
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const useTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      localStorage.setItem('selectedTemplate', JSON.stringify(template.content))
      router.push('/resume-builder')
    } else {
      console.error('Template not found')
    }
  }

  const filteredTemplates = React.useMemo(() => 
    templates.filter(template => {
      const matchesFilter = filter === 'all' || template.category === filter
      const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesFilter && matchesSearch
    }), [filter, searchTerm]
  )

  const TemplatePreview = React.memo(({ name }: { name: string }) => (
    <div className="h-36 sm:h-48 bg-[#2a2a2a] rounded-t-lg p-4 flex flex-col">
      <div className="w-full h-6 bg-[#1a1a1a] rounded mb-2"></div>
      <div className="flex-1 flex">
        <div className="w-1/3 pr-2">
          <div className="w-full h-4 bg-[#1a1a1a] rounded mb-2"></div>
          <div className="w-3/4 h-4 bg-[#1a1a1a] rounded mb-2"></div>
          <div className="w-full h-4 bg-[#1a1a1a] rounded"></div>
        </div>
        <div className="w-2/3 pl-2">
          <div className="w-full h-4 bg-[#1a1a1a] rounded mb-2"></div>
          <div className="w-full h-4 bg-[#1a1a1a] rounded mb-2"></div>
          <div className="w-3/4 h-4 bg-[#1a1a1a] rounded"></div>
        </div>
      </div>
      <div className="mt-auto text-center text-gray-600 font-semibold">{name}</div>
    </div>
  ))
  TemplatePreview.displayName = 'TemplatePreview'

  const handleTemplateClick = React.useCallback((templateId: string) => {
    setSelectedTemplate(templateId)
    useTemplate(templateId)
  }, [useTemplate])

  const TemplateCard = React.memo(({ template }: { template: Template }) => (
    <Card className="bg-[#1a1a1a] border-gray-800 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-green-400/10">
      <CardHeader className="p-0">
        <TemplatePreview name={template.name} />
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl font-semibold mb-2 text-white">
          {template.name}
        </CardTitle>
        <p className="text-sm sm:text-base text-gray-400 mb-4">
          Perfect for {template.category} roles
        </p>
      </CardContent>
      <CardFooter className="p-4 sm:p-6 pt-0">
        <Button 
          onClick={() => handleTemplateClick(template.id)} 
          className="w-full bg-gradient-to-r from-teal-400 to-blue-400 text-black hover:from-teal-500 hover:to-blue-500 transition-all duration-300"
        >
          {selectedTemplate === template.id ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Selected
            </>
          ) : (
            'Use This Template'
          )}
        </Button>
      </CardFooter>
    </Card>
  ))
  TemplateCard.displayName = 'TemplateCard'

  useEffect(() => {
    setIsLoading(false)
  }, [])

  return (
    <div className="bg-black min-h-screen text-white font-sans">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-5 pointer-events-none"></div>
      <div className="relative z-10">
        <nav className="border-b border-gray-800 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center space-x-2">
                <Sparkles className="w-8 h-8 text-green-400" />
                <span className={`text-2xl sm:text-3xl font-bold text-white ${fredoka.className}`}>
                  Dynamic<span className="text-green-400">Draft</span>
                </span> 
              </Link>

              <div className="hidden md:flex items-center space-x-6">
                <Link href="/dashboard" className="text-gray-300 hover:text-white">
                  Dashboard
                </Link>
                <Link href="/choose-template" className="text-gray-300 hover:text-white">
                  Templates
                </Link>
                <Link href="/pricing" className="text-gray-300 hover:text-white">
                  Pricing
                </Link>
                <button className="bg-gradient-to-r from-green-400 to-green-500 text-black px-4 py-2 rounded-full text-sm font-medium hover:from-green-500 hover:to-green-600 transition-all duration-300">
                  Upgrade
                </button>
              </div>

              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6 text-gray-300" />
                ) : (
                  <Menu className="h-6 w-6 text-gray-300" />
                )}
              </button>
            </div>

            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="md:hidden"
                >
                  <div className="flex flex-col space-y-4 pt-4 pb-3">
                    <Link 
                      href="/dashboard" 
                      className="text-gray-300 hover:text-white px-2 py-1"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link 
                      href="/choose-template" 
                      className="text-gray-300 hover:text-white px-2 py-1"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Templates
                    </Link>
                    <Link 
                      href="/pricing" 
                      className="text-gray-300 hover:text-white px-2 py-1"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Pricing
                    </Link>
                    <button className="bg-gradient-to-r from-green-400 to-green-500 text-black px-4 py-2 rounded-full text-sm font-medium hover:from-green-500 hover:to-green-600 transition-all duration-300 w-full">
                      Upgrade
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16 overflow-visible">
            <h1 className="text-4xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 text-transparent bg-clip-text leading-[1.1] py-3 -mt-2 px-4">
              Choose Your Resume Template
            </h1>
            <p className="text-sm sm:text-xl text-gray-400 max-w-2xl mx-auto px-4">
              Select from our AI-optimized templates to create a standout resume that gets you noticed.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between mb-8">
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search templates..."
                value={debouncedSearchTerm}
                onChange={(e) => setDebouncedSearchTerm(e.target.value)}
                className="w-full bg-[#1a1a1a] text-white pl-10 pr-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <Select onValueChange={(value) => setFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px] bg-[#1a1a1a] text-white border-gray-700">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] text-white border-gray-700">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            {!isLoading ? (
              <AnimatePresence>
                {filteredTemplates.map((template) => (
                  <motion.div
                    key={template.id}
                    variants={{
                      hidden: { y: 20, opacity: 0 },
                      visible: { y: 0, opacity: 1 }
                    }}
                    exit={{ opacity: 0, y: -20 }}
                    layout
                  >
                    <TemplateCard template={template} />
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="col-span-full flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}