"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { templates } from '../templates/templateData'
import { CheckCircle, Sparkles, Search } from 'lucide-react'

export default function ChooseTemplate() {
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const useTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      localStorage.setItem('selectedTemplate', JSON.stringify(template.content))
      router.push('/resume-builder')
    } else {
      console.error('Template not found')
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesFilter = filter === 'all' || template.category === filter
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const TemplatePreview = ({ name }: { name: string }) => (
    <div className="h-48 bg-gray-800 rounded-t-lg p-4 flex flex-col">
      <div className="w-full h-6 bg-gray-700 rounded mb-2"></div>
      <div className="flex-1 flex">
        <div className="w-1/3 pr-2">
          <div className="w-full h-4 bg-gray-700 rounded mb-2"></div>
          <div className="w-3/4 h-4 bg-gray-700 rounded mb-2"></div>
          <div className="w-full h-4 bg-gray-700 rounded"></div>
        </div>
        <div className="w-2/3 pl-2">
          <div className="w-full h-4 bg-gray-700 rounded mb-2"></div>
          <div className="w-full h-4 bg-gray-700 rounded mb-2"></div>
          <div className="w-3/4 h-4 bg-gray-700 rounded"></div>
        </div>
      </div>
      <div className="mt-auto text-center text-gray-600 font-semibold">{name}</div>
    </div>
  )

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
              Choose Your Resume Template
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Select from our AI-optimized templates to create a standout resume that gets you noticed.
            </p>
          </div>

          <div className="flex justify-between items-center mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-900 text-white pl-10 pr-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <Select onValueChange={(value) => setFilter(value)}>
              <SelectTrigger className="w-[180px] bg-gray-900 text-white border-gray-700">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 text-white border-gray-700">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
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
                  <Card className="bg-gray-900 border-gray-800 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-green-400/10">
                    <CardHeader className="p-0">
                      <TemplatePreview name={template.name} />
                    </CardHeader>
                    <CardContent className="p-6">
                      <CardTitle className="text-xl font-semibold mb-2 text-white">{template.name}</CardTitle>
                      <p className="text-gray-400 mb-4">Perfect for {template.category} roles</p>
                    </CardContent>
                    <CardFooter className="p-6 pt-0">
                      <Button 
                        onClick={() => {
                          setSelectedTemplate(template.id)
                          useTemplate(template.id)
                        }} 
                        className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-black hover:from-green-500 hover:to-blue-600 transition-all duration-300"
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
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  )
}