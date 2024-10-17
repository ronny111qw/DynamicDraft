"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, ArrowLeft, Edit, Trash2, Check, X } from "lucide-react"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"

interface ResumeTemplate {
  id: string
  name: string
  content: any // Replace 'any' with your actual resume data structure
  lastModified: Date
}

const ResumeManager: React.FC = () => {
  const [savedResumes, setSavedResumes] = useState<ResumeTemplate[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem('savedResumes')
    if (saved) {
      setSavedResumes(JSON.parse(saved))
    }
  }, [])

  const loadResume = (id: string) => {
    router.push(`/resume-builder?id=${id}`)
  }

  const startRenaming = (id: string, currentName: string) => {
    setEditingId(id)
    setEditingName(currentName)
  }

  const finishRenaming = () => {
    if (editingId) {
      const updatedResumes = savedResumes.map(resume => 
        resume.id === editingId ? { ...resume, name: editingName } : resume
      )
      setSavedResumes(updatedResumes)
      localStorage.setItem('savedResumes', JSON.stringify(updatedResumes))
      setEditingId(null)
      toast({
        title: "Resume Renamed",
        description: "The resume name has been updated.",
      })
    }
  }

  const deleteResume = (id: string) => {
    const updatedResumes = savedResumes.filter(resume => resume.id !== id)
    setSavedResumes(updatedResumes)
    localStorage.setItem('savedResumes', JSON.stringify(updatedResumes))
    toast({
      title: "Resume Deleted",
      description: "The selected resume has been deleted.",
    })
  }

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
              <Link href="/dashboard" className="flex items-center text-gray-300 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
              </Link>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 text-transparent bg-clip-text">My Resumes</h1>
          
          <div className="mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <motion.div 
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
                  {savedResumes.map((resume) => (
                    <motion.div
                      key={resume.id}
                      variants={{
                        hidden: { y: 20, opacity: 0 },
                        visible: { y: 0, opacity: 1 }
                      }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex items-center justify-between mb-4 p-4 bg-gray-800 rounded-lg"
                    >
                      {editingId === resume.id ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="mr-2 bg-gray-700 text-white border-gray-600"
                        />
                      ) : (
                        <div>
                          <span className="text-white font-medium">{resume.name}</span>
                          <p className="text-sm text-gray-400">Last modified: {new Date(resume.lastModified).toLocaleString()}</p>
                        </div>
                      )}
                      <div className="flex space-x-2">
                        {editingId === resume.id ? (
                          <>
                            <Button onClick={finishRenaming} className="bg-green-500 hover:bg-green-600">
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button onClick={() => setEditingId(null)} className="bg-red-500 hover:bg-red-600">
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button onClick={() => loadResume(resume.id)} className="bg-gradient-to-r from-teal-400 to-blue-400 text-gray-800 hover:from-teal-500 hover:to-blue-500">
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </Button>
                            <Button onClick={() => startRenaming(resume.id, resume.name)} className="bg-yellow-500 hover:bg-yellow-600">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button onClick={() => deleteResume(resume.id)} variant="destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  )
}

export default ResumeManager