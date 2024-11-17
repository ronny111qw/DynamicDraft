"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, ArrowLeft, Edit, Trash2, Check, X } from "lucide-react"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { useSession } from "next-auth/react"
import { Fredoka } from '@next/font/google';

const fredoka = Fredoka({ weight: ['400','600'], subsets: ['latin'] }); 

interface Resume {
  id: number
  content: any
  template: string
  dateCreated: Date
  userId: string
}

const ResumeManager: React.FC = () => {
  const [savedResumes, setSavedResumes] = useState<Resume[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user) {
      fetchUserResumes()
    }
  }, [session])

  const fetchUserResumes = async () => {
    try {
      const response = await fetch('/api/resumes')
      if (!response.ok) throw new Error('Failed to fetch resumes')
      const data = await response.json()
      setSavedResumes(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load resumes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadResume = (id: number) => {
    router.push(`/resume-builder?id=${id}`)
  }

  const startRenaming = (id: number, currentName: string) => {
    setEditingId(id)
    setEditingName(currentName)
  }

  const finishRenaming = async () => {
    if (editingId) {
      try {
        const resume = savedResumes.find(r => r.id === editingId)
        if (!resume) return

        const response = await fetch(`/api/resumes/${editingId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            name: editingName,
            content: {
              ...resume.content,
              name: editingName 
            }
          }),
        })

        if (!response.ok) throw new Error('Failed to update resume')

        setSavedResumes(prevResumes =>
          prevResumes.map(resume =>
            resume.id === editingId 
              ? { ...resume, content: { ...resume.content, name: editingName } }
              : resume
          )
        )

        toast({
          title: "Success",
          description: "Resume name updated successfully.",
        })
      } catch (error) {
        console.error('Error updating resume:', error)
        toast({
          title: "Error",
          description: "Failed to update resume name. Please try again.",
          variant: "destructive",
        })
      }
      setEditingId(null)
    }
  }

  const deleteResume = async (id: number) => {
    try {
      const response = await fetch(`/api/resumes/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }

      setSavedResumes(prevResumes =>
        prevResumes.filter(resume => resume.id !== id)
      )

      toast({
        title: "Success",
        description: "Resume deleted successfully.",
      })
    } catch (error) {
      console.error('Error deleting resume:', error)
      toast({
        title: "Error",
        description: "Failed to delete resume. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please Sign In</h2>
          <p className="mb-4">You need to be signed in to view and manage your resumes.</p>
          <Link href="/auth/signin">
            <Button className="bg-green-500 hover:bg-green-600">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    )
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
                <span className={`text-3xl font-bold text-white ${fredoka.className}`}>
                  Dynamic<span className="text-green-400">Draft</span>
                </span> 
              </Link>
              <Link href="/dashboard" className="flex items-center text-gray-300 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
              </Link>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 text-transparent bg-clip-text">
            My Resumes
          </h1>
          
          <div className="mb-8">
            <Card className="bg-[#1a1a1a] border-gray-800">
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
                  </div>
                ) : (
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
                      {savedResumes.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <p>No resumes found. Create your first resume to get started!</p>
                        </div>
                      ) : (
                        savedResumes.map((resume) => (
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
                                <span className="text-white font-medium">
                                  {resume.content.name || `Resume ${resume.id}`}
                                </span>
                                <p className="text-sm text-gray-400">
                                  Last modified: {new Date(resume.dateCreated).toLocaleString()}
                                </p>
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
                                  <Button 
                                    onClick={() => loadResume(resume.id)} 
                                    className="bg-gradient-to-r from-teal-400 to-blue-400 text-gray-800 hover:from-teal-500 hover:to-blue-500"
                                  >
                                    <Edit className="w-4 h-4 mr-2" /> Edit
                                  </Button>
                                  <Button 
                                    onClick={() => startRenaming(resume.id, resume.content.name || `Resume ${resume.id}`)} 
                                    className="bg-yellow-500 hover:bg-yellow-600"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button onClick={() => deleteResume(resume.id)} variant="destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResumeManager