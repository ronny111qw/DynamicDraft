'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'

import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Loader2, Clipboard, CheckCircle2, RefreshCw, Sparkles, Save, Download, Plus, X, Send, Play, Pause, StopCircle, Mic, MicOff, BarChart, Share2, Book, Video, FileText, Search, Menu, Home, Settings, Calendar, Building, GraduationCap, ChevronDown } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import ResourceLibrary from '@/components/ResourceLibrary'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { GoogleGenerativeAI } from "@google/generative-ai"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import InterviewScheduler from '@/InterviewSchedulerPlanner'
import { motion } from 'framer-motion'


const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY_INTRV_QUES!)

type QuestionType = {
  id: string
  name: string 
} 

type Question = {
  type: string
  question: string
  rationale: string
  userAnswer?: string
  feedback?: {
    overallRating: number
    strengths: string[]
    areasForImprovement: string[]
    detailedFeedback: string
  }
}

type InterviewResult = {
  date: string
  averageScore: number
  questionTypes: { [key: string]: number }
}

type Resource = {
  id: string
  title: string
  description: string
  url: string
  type: 'article' | 'video' | 'book'
}

interface LearningResource {
  title: string;
  url: string;
  type: 'documentation' | 'course' | 'video' | 'book' | 'article';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface LearningPathItem {
  skill: string;
  explanation: string;
  importance: 'high' | 'medium' | 'low';
  timeToLearn: string;
  resources: LearningResource[];
  practiceProjects?: string[];
}

const defaultQuestionTypes: QuestionType[] = [
  { id: 'behavioral', name: 'Behavioral' },
  { id: 'technical', name: 'Technical' },
  { id: 'situational', name: 'Situational' },
]

const industrySpecificSets = [
  { id: 'software-engineering', name: 'Software Engineering' },
  { id: 'data-science', name: 'Data Science' },
  { id: 'product-management', name: 'Product Management' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'sales', name: 'Sales' },
  { id: 'finance', name: 'Finance' },
  { id: 'healthcare', name: 'Healthcare' },
]

async function generateQuestionsWithGemini(resume: string, jobDescription: string, difficulty: string, questionTypes: QuestionType[], industry?: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
      As an expert interviewer, generate relevant interview questions based on the following:
      
      RESUME:
      ${resume}
      
      JOB DESCRIPTION:
      ${jobDescription}
      
      DIFFICULTY LEVEL:
      ${difficulty}
      
      QUESTION TYPES:
      ${questionTypes.map(type => type.name).join(', ')}
      
      ${industry ? `INDUSTRY: ${industry}` : ''}
      
      Please generate ${questionTypes.length * 2} questions:
      ${questionTypes.map(type => `- 2 ${type.name.toLowerCase()} questions`).join('\n')}
      
      Ensure the questions are appropriate for the ${difficulty} difficulty level${industry ? ` and specific to the ${industry} industry` : ''}.
      
      Format each question as a JSON object with properties:
      - type (one of the provided question types)
      - question (the actual question text)
      - rationale (brief explanation of why this question is relevant)
      
      Return all questions in a JSON array.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    console.log("Raw API Response:", text)

    const cleanedText = text.replace(/```json\n|\n```/g, '').trim()
    const questions = JSON.parse(cleanedText)

    return questions
  } catch (error) {
    console.error('Error generating questions:', error)
    throw new Error('Failed to generate questions')
  }
}

async function evaluateAnswerWithGemini(question: string, answer: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
      As an expert interviewer, evaluate the following answer to an interview question:

      Question: ${question}

      Answer: ${answer}

      Please provide feedback on the quality and completeness of the answer. Consider the following aspects:
      1. Relevance to the question
      2. Depth of knowledge demonstrated
      3. Clarity and structure of the response
      4. Use of specific examples or experiences (if applicable)
      5. Areas for improvement

      Format your feedback as a JSON object with the following properties:
      - overallRating: A number from 1 to 5, where 1 is poor and 5 is excellent
      - strengths: An array of strings highlighting the strong points of the answer
      - areasForImprovement: An array of strings suggesting ways to improve the answer
      - detailedFeedback: A string providing more comprehensive feedback

      Return only the JSON object, without any additional text.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    console.log("Raw API Response:", text)

    const cleanedText = text.replace(/```json\n|\n```/g, '').trim()

    let feedback
    try {
      feedback = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError)
      throw new Error('Received invalid JSON from the API. Please check the API response format.')
    }

    return feedback
  } catch (error) {
    console.error('Error evaluating answer:', error)
    throw new Error('Failed to evaluate answer')
  }
}

async function generateInterviewTips(resume: string, jobDescription: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
      As an expert career coach, provide tailored interview preparation tips based on the following:

      RESUME:
      ${resume}

      JOB DESCRIPTION:
      ${jobDescription}

      Please generate 5 specific and actionable tips that will help the candidate prepare for this interview.
      Consider the candidate's background from the resume and the requirements from the job description.
      Format the tips as a JSON array of strings.

      Return only the JSON array, without any additional text.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    console.log("Raw API Response:", text)

    const cleanedText = text.replace(/```json\n|\n```/g, '').trim()
    const tips = JSON.parse(cleanedText)

    return tips
  } catch (error) {
    console.error('Error generating interview tips:', error)
    throw new Error('Failed to generate interview tips')
  }
}

export default function EnhancedQuestionGenerator() {
  const [resume, setResume] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('input')
  const [difficulty, setDifficulty] = useState('intermediate')
  const [savedSets, setSavedSets] = useState([])
  const [currentSetName, setCurrentSetName] = useState('')
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(defaultQuestionTypes)
  const [newQuestionType, setNewQuestionType] = useState({ name: '' })
  const [isAddingQuestionType, setIsAddingQuestionType] = useState(false)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [interviewTips, setInterviewTips] = useState<string[]>([])
  const [isGeneratingTips, setIsGeneratingTips] = useState(false)
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [interviewResults, setInterviewResults] = useState<InterviewResult[]>([])
  const [sharedQuestionSets, setSharedQuestionSets] = useState([])
  const [resources, setResources] = useState<Resource[]>([])
  const [resourceSearchTerm, setResourceSearchTerm] = useState('')
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all')

  // Mock Interview States
  const [isMockInterviewMode, setIsMockInterviewMode] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [interviewTimer, setInterviewTimer] = useState(0)
  const [isInterviewPaused, setIsInterviewPaused] = useState(false)
  const [interviewDuration, setInterviewDuration] = useState(1800) // 30 minutes by default
  const [totalScore, setTotalScore] = useState(0)

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Company Research 
  const [companyResearch, setCompanyResearch] = useState<CompanyResearch | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [learningPath, setLearningPath] = useState<string[]>([])




  useEffect(() => {
    const savedSetsFromStorage = localStorage.getItem('savedQuestionSets')
    if (savedSetsFromStorage) {
      setSavedSets(JSON.parse(savedSetsFromStorage))
    }

    const savedQuestionTypes = localStorage.getItem('customQuestionTypes')
    if (savedQuestionTypes) {
      setQuestionTypes([...defaultQuestionTypes, ...JSON.parse(savedQuestionTypes)])
    }

    const savedInterviewResults = localStorage.getItem('interviewResults')
    if (savedInterviewResults) {
      setInterviewResults(JSON.parse(savedInterviewResults))
    }

    const savedSharedSets = localStorage.getItem('sharedQuestionSets')
    if (savedSharedSets) {
      setSharedQuestionSets(JSON.parse(savedSharedSets))
    }

    const savedResources = localStorage.getItem('resources')
    if (savedResources) {
      setResources(JSON.parse(savedResources))
    }
  }, [])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isMockInterviewMode && !isInterviewPaused && interviewTimer < interviewDuration) {
      timer = setInterval(() => {
        setInterviewTimer((prevTime) => prevTime + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [isMockInterviewMode, isInterviewPaused, interviewTimer, interviewDuration])

  const generateQuestions = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both resume and job description.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const generatedQuestions = await generateQuestionsWithGemini(resume, jobDescription, difficulty, questionTypes, selectedIndustry)
      setQuestions(generatedQuestions)
      setActiveTab('questions')
      toast({
        title: "Questions Generated",
        description: "Your interview questions are ready for review.",
      })
    } catch (error) {
      toast({
        title: "Error Generating Questions",
        description: "There was an error generating questions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const generateTips = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both resume and job description to generate tips.",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingTips(true)
    try {
      const tips = await generateInterviewTips(resume, jobDescription)
      setInterviewTips(tips)
      toast({
        title: "Tips Generated",
        description: "Your interview preparation tips are ready.",
      })
    } catch (error) {
      toast({
        title: "Error Generating Tips",
        description: "There was an error generating interview tips. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingTips(false)
    }
  }

  const saveQuestionSet = () => {
    if (!currentSetName.trim()) {
      toast({
        title: "Missing Set Name",
        description: "Please provide a name for the question set.",
        variant: "destructive",
      })
      return
    }

    const newSet = {
      name: currentSetName,
      questions: questions,
      resume: resume,
      jobDescription: jobDescription,
      difficulty: difficulty,
      industry: selectedIndustry,
    }

    const updatedSets = [...savedSets, newSet]
    setSavedSets(updatedSets)
    localStorage.setItem('savedQuestionSets', JSON.stringify(updatedSets))

    toast({
      title: "Question Set Saved",
      description: `"${currentSetName}" has been saved successfully.`,
    })

    setCurrentSetName('')
  }

  const loadQuestionSet = (set) => {
    setQuestions(set.questions)
    setResume(set.resume)
    setJobDescription(set.jobDescription)
    setDifficulty(set.difficulty)
    setSelectedIndustry(set.industry || '')
    setActiveTab('questions')

    toast({
      title: "Question Set Loaded",
      description: `"${set.name}" has been loaded successfully.`,
    })
  }

  const evaluateAnswer = async (questionIndex: number) => {
    const question = questions[questionIndex]
    if (!question.userAnswer) {
      toast({
        title: "No Answer Provided",
        description: "Please provide an answer before requesting evaluation.",
        variant: "destructive",
      })
      return
    }

    

    setIsEvaluating(true)
    try {
      const feedback = await evaluateAnswerWithGemini(question.question, question.userAnswer)
      const updatedQuestions = [...questions]
      updatedQuestions[questionIndex] = { ...question, feedback }
      setQuestions(updatedQuestions)
      
      // Update total score
      setTotalScore(prevScore => prevScore + feedback.overallRating)
    } catch (error) {
      toast({
        title: "Error Evaluating Answer",
        description: "There was an error evaluating your answer. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsEvaluating(false)
    }
  }

  const startMockInterview = () => {
    setIsMockInterviewMode(true)
    setCurrentQuestionIndex(0)
    setInterviewTimer(0)
    setIsInterviewPaused(false)
    setTotalScore(0)
    setAudioURL(null)
  }

  const pauseResumeInterview = () => {
    setIsInterviewPaused(!isInterviewPaused)
  }

  const endMockInterview = () => {
    setIsMockInterviewMode(false)
    setCurrentQuestionIndex(0)
    setInterviewTimer(0)
    setIsInterviewPaused(false)
    const averageScore = totalScore / questions.length

    // Save interview result
    const newResult: InterviewResult = {
      date: new Date().toISOString(),
      averageScore: averageScore,
      questionTypes: questions.reduce((acc, q) => {
        if (q.feedback) {
          acc[q.type] = (acc[q.type] || 0) + q.feedback.overallRating
        }
        return acc
      }, {} as { [key: string]: number })
    }

    const updatedResults = [...interviewResults, newResult]
    setInterviewResults(updatedResults)
    localStorage.setItem('interviewResults', JSON.stringify(updatedResults))

    toast({
      title: "Mock Interview Ended",
      description: `You've completed the mock interview. Your average score is ${averageScore.toFixed(2)}/5. Review your answers and feedback.`,
    })
    stopRecording()
  }

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      endMockInterview()
    }
  }, [currentQuestionIndex, questions.length])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleDurationChange = (newDuration: number) => {
    setInterviewDuration(newDuration * 60) // Convert minutes to seconds
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        const audioUrl = URL.createObjectURL(audioBlob)
        setAudioURL(audioUrl)
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      toast({
        title: "Recording Error",
        description: "Unable to start recording. Please check your microphone permissions.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }


  const shareQuestionSet = (set) => {
    const sharedSet = {
      id: Math.random().toString(36).substr(2, 9),
      name: set.name,
      questions: set.questions,
      sharedBy: "Current User", // Replace with actual user name when implemented
      sharedAt: new Date().toISOString(),
    }
    const updatedSharedSets = [...sharedQuestionSets, sharedSet]
    setSharedQuestionSets(updatedSharedSets)
    localStorage.setItem('sharedQuestionSets', JSON.stringify(updatedSharedSets))
    toast({
      title: "Question Set Shared",
      description: `Share code: ${sharedSet.id}`,
    })
  }

  const importSharedSet = (sharedId) => {
    const sharedSet = sharedQuestionSets.find(set => set.id === sharedId)
    if (sharedSet) {
      const newSet = {
        ...sharedSet,
        name: `Imported: ${sharedSet.name}`,
      }
      const updatedSets = [...savedSets, newSet]
      setSavedSets(updatedSets)
      localStorage.setItem('savedQuestionSets', JSON.stringify(updatedSets))
      toast({
        title: "Question Set Imported",
        description: `"${newSet.name}" has been imported successfully.`,
      })
    } else {
      toast({
        title: "Import Failed",
        description: "Invalid share code. Please try again.",
        variant: "destructive",
      })
    }
  }

  const addResource = (resource: Omit<Resource, 'id'>) => {
    const newResource = { ...resource, id: Math.random().toString(36).substr(2, 9) }
    const updatedResources = [...resources, newResource]
    setResources(updatedResources)
    localStorage.setItem('resources', JSON.stringify(updatedResources))
  }

  const editResource = (id: string, updatedResource: Partial<Resource>) => {
    const updatedResources = resources.map(resource => 
      resource.id === id ? { ...resource, ...updatedResource } : resource
    )
    setResources(updatedResources)
    localStorage.setItem('resources', JSON.stringify(updatedResources))
  }

  const deleteResource = (id: string) => {
    const updatedResources = resources.filter(resource => resource.id !== id)
    setResources(updatedResources)
    localStorage.setItem('resources', JSON.stringify(updatedResources))
  }

  const researchCompany = async () => {
    if (!companyName.trim()) {
      toast({
        title: "Missing Company Name",
        description: "Please enter a company name to research.",
        variant: "destructive",
      });
      return;
    }
  
    setIsLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        Provide a brief overview of the company ${companyName}, including:
        - Main products or services
        - Recent news or developments
        - Company culture and values
        - Key competitors
  
        Format the response as a JSON object with these properties:
        {
          "products_services": "...",
          "recent_news": "...",
          "culture_values": "...",
          "key_competitors": "..."
        }
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = await response.text(); // Await the text() method
  
      console.log("Raw AI Response:", text); // Log the raw response for debugging
  
      // Clean the response to remove unwanted characters
      const cleanedText = text
        .replace(/```json|```/g, '') // Remove code block markers
        .trim(); // Trim whitespace
  
      // Attempt to parse the cleaned response as JSON
      let research;
      try {
        research = JSON.parse(cleanedText); // Ensure the response is valid JSON
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        toast({
          title: "Error Parsing Company Data",
          description: "The response from the AI was not valid JSON. Please try again.",
          variant: "destructive",
        });
        return; // Exit the function if parsing fails
      }
  
      setCompanyResearch(research);
      
      toast({
        title: "Company Research Complete",
        description: `Research on ${companyName} is now available.`,
      });
    } catch (error) {
      console.error('Error researching company:', error);
      toast({
        title: "Error Researching Company",
        description: "There was an error fetching company information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  
  const generateLearningPath = async () => {
    if (!resume.trim() || !jobDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both resume and job description to generate a learning path.",
        variant: "destructive",
      });
      return;
    }
  
    setIsLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `
        As a current tech industry expert and technical mentor in 2024, create a detailed learning path based on this resume and job description.
        
        Resume:
        ${resume}
        
        Job Description:
        ${jobDescription}
        
        Create a modern, practical learning path with the 5 most critical skills/areas the candidate needs to focus on.
        For each skill, provide:
        1. Clear explanation of why this skill is crucial for the role in today's tech landscape
        2. Realistic time estimate to achieve working proficiency
        3. Priority level (high/medium/low)
        4. Only include currently available (2024) learning resources including:
           - Official, actively maintained documentation
           - Popular online learning platforms (Udemy, Coursera, etc.)
           - Recent YouTube videos/channels (2023-2024)
           - Current GitHub repositories and communities
           - Active Discord/Slack communities for learning
        5. Practical, modern project ideas that align with current industry practices
        
        Important resource guidelines:
        - Verify all URLs are from well-known, active platforms
        - Prefer free resources but include paid options if they provide significant value
        - Include mix of text, video, and interactive content
        - Focus on resources that are regularly updated
        - Include active community resources for support
        
        Format the response as a JSON array matching this structure:
        [
          {
            "skill": "Skill Name",
            "explanation": "Detailed explanation focusing on 2024 industry relevance",
            "importance": "high|medium|low",
            "timeToLearn": "Realistic time estimate",
            "resources": [
              {
                "title": "Resource name (include year if applicable)",
                "url": "Active, verified URL",
                "type": "documentation|course|video|community|github",
                "difficulty": "beginner|intermediate|advanced",
                "cost": "free|paid|freemium",
                "platform": "Platform name (YouTube, Udemy, etc.)"
              }
            ],
            "practiceProjects": [
              {
                "name": "Modern project idea",
                "description": "Brief project description",
                "estimatedTime": "Time estimate",
                "techStack": ["relevant", "technologies"]
              }
            ],
            "communities": [
              {
                "name": "Community name",
                "platform": "Discord|Slack|Reddit",
                "url": "Invite/join URL"
              }
            ]
          }
        ]
  
        Ensure all resources are:
        1. Currently accessible (2024)
        2. From reputable sources
        3. Actively maintained
        4. Relevant to current industry practices
        5. Include a mix of learning styles (video, text, interactive)
        
        For YouTube content, prefer channels with:
        - Regular uploads
        - High subscriber count
        - Recent activity (2023-2024)
        - Quality educational content
        
        For documentation and courses:
        - Prefer official sources
        - Include version/last updated date when available
        - Focus on current industry standards
      `;
  
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = await response.text();
      
      console.log("Raw AI Response:", text);
      
      // Clean and parse the response
      const cleanedText = text
        .replace(/```json|```/g, '')
        .trim();
  
      try {
        const parsedResponse = JSON.parse(cleanedText);
        if (!Array.isArray(parsedResponse)) {
          throw new Error('Response is not an array');
        }
        
        // Validate resources
        const validatedResponse = parsedResponse.map(item => ({
          ...item,
          resources: (item.resources || []).filter(resource => {
            // Basic URL validation
            try {
              new URL(resource.url);
              return true;
            } catch {
              console.log(`Filtered out invalid resource URL: ${resource.url}`);
              return false;
            }
          })
        }));
  
        setLearningPath(validatedResponse);
      } catch (parseError) {
        console.error("JSON parsing error:", parseError);
        throw new Error('Failed to parse AI response');
      }
  
      toast({
        title: "Learning Path Generated",
        description: "Your personalized learning path is ready with current resources!",
      });
    } catch (error) {
      console.error("Learning path generation error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate learning path",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };



return (
    <div className="bg-white min-h-screen text-gray-900 font-sans">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-5 pointer-events-none"></div>
      <div className="relative z-10 flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-100 p-4 hidden md:block">
          <h1 className="text-2xl font-bold mb-6 flex items-center">
            <Sparkles className="w-8 h-8 text-green-400 mr-2" />
            <span>AI Interview Prep</span>
          </h1>
          <nav>
            <ul className="space-y-2">
              {[
                { id: 'input', name: 'Input', icon: Home },
                { id: 'tips', name: 'Tips', icon: Sparkles },
                { id: 'questions', name: 'Questions', icon: FileText },
                { id: 'saved', name: 'Saved Sets', icon: Save },
                { id: 'progress', name: 'Progress', icon: BarChart },
                { id: 'resources', name: 'Resources', icon: Book },
                { id: 'calendar', name: 'Calendar', icon: Calendar},
                { id: 'company-research', name: 'Company Research', icon: Building },
                { id: 'learning-path', name: 'Learning Path', icon: GraduationCap },
              ].map((item) => (
                <li key={item.id}>
                  <Button
                    variant={activeTab === item.id ? 'default' : 'ghost'}
                    className={`w-full justify-start ${activeTab === item.id ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden absolute top-4 left-4 bg-white text-gray-900">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-white text-gray-900">
            <h1 className="text-2xl font-bold mb-6 flex items-center">
              <Sparkles className="w-8 h-8 text-green-400 mr-2" />
              <span>AI Interview Prep</span>
            </h1>
            <nav>
              <ul className="space-y-2">
                {[
                  { id: 'input', name: 'Input', icon: Home },
                  { id: 'tips', name: 'Tips', icon: Sparkles },
                  { id: 'questions', name: 'Questions', icon: FileText },
                  { id: 'saved', name: 'Saved Sets', icon: Save },
                  { id: 'progress', name: 'Progress', icon: BarChart },
                  { id: 'resources', name: 'Resources', icon: Book },
                ].map((item) => (
                  <li key={item.id}>  
                    <Button
                      variant={activeTab === item.id ? 'default' : 'ghost'}
                      className={`w-full justify-start ${activeTab === item.id ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                      onClick={() => setActiveTab(item.id)}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </Button>
                  </li>
                ))}
              </ul>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'input' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Input Information</CardTitle>
                  <CardDescription>Provide your resume and job description</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="resume">Resume</Label>
                    <Textarea
                      id="resume"
                      placeholder="Paste your resume here..."
                      value={resume}
                      onChange={(e) => setResume(e.target.value)}
                      className="h-40"
                    />
                  </div>
                  <div>
                    <Label htmlFor="jobDescription">Job Description</Label>
                    <Textarea
                      id="jobDescription"
                      placeholder="Paste the job description here..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="h-40"
                    />
                  </div>
                  <div>
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger id="difficulty">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                      <SelectTrigger id="industry">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General (No specific industry)</SelectItem>
                        {industrySpecificSets.map((industry) => (
                          <SelectItem key={industry.id} value={industry.id}>{industry.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Question Types</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {questionTypes.map((type) => (
                        <Badge key={type.id} variant="secondary">
                          {type.name}
                          {!defaultQuestionTypes.some(defaultType => defaultType.id === type.id) && (
                            <button
                              onClick={() => {
                                setQuestionTypes(questionTypes.filter(t => t.id !== type.id))
                                toast({
                                  title: "Question Type Removed",
                                  description: `"${type.name}" has been removed.`,
                                })
                              }}
                              className="ml-2 text-xs hover:text-red-500"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                    {isAddingQuestionType ? (
                      <div className="flex items-center space-x-2 mt-2">
                        <Input
                          value={newQuestionType.name}
                          onChange={(e) => setNewQuestionType({ ...newQuestionType, name: e.target.value })}
                          placeholder="New question type"
                          className="flex-grow"
                        />
                        <Button onClick={() => {
                          if (newQuestionType.name) {
                            setQuestionTypes([...questionTypes, { id: newQuestionType.name.toLowerCase().replace(/\s+/g, '-'), ...newQuestionType }])
                            setNewQuestionType({ name: '' })
                            setIsAddingQuestionType(false)
                            toast({
                              title: "Question Type Added",
                              description: `"${newQuestionType.name}" has been added.`,
                            })
                          }
                        }} className="bg-green-500 text-white hover:bg-green-600">
                          Add
                        </Button>
                        <Button variant="outline" onClick={() => setIsAddingQuestionType(false)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={() => setIsAddingQuestionType(true)} variant="outline" className="mt-2">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Question Type
                      </Button>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={generateQuestions} 
                    className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-white hover:from-green-500 hover:to-blue-600"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Questions...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Questions
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {activeTab === 'tips' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Interview Preparation Tips</CardTitle>
                  <CardDescription>Get tailored tips based on your resume and the job description</CardDescription>
                </CardHeader>
                <CardContent>
                  {interviewTips.length > 0 ? (
                    <ul className="list-disc list-inside space-y-2">
                      {interviewTips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600">No tips generated yet. Click the button below to generate tips.</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={generateTips} 
                    className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-white hover:from-green-500 hover:to-blue-600"
                    disabled={isGeneratingTips}
                  >
                    {isGeneratingTips ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Tips...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Interview Tips
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {activeTab === 'questions' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Generated Interview Questions</CardTitle>
                  <CardDescription>Review, answer, and get feedback on these tailored interview questions.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isMockInterviewMode ? (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold">Mock Interview Mode</h3>
                      <div className="flex justify-between items-center text-gray-600">
                        <p>Question {currentQuestionIndex + 1} of {questions.length}</p>
                        <p>Time: {formatTime(interviewTimer)} / {formatTime(interviewDuration)}</p>
                      </div>
                      <Progress value={(interviewTimer / interviewDuration) * 100} className="w-full" />
                      <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="w-full" />
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-lg font-medium">{questions[currentQuestionIndex].question}</p>
                        </CardContent>
                      </Card>
                      <Textarea
                        value={questions[currentQuestionIndex].userAnswer || ''}
                        onChange={(e) => {
                          const  updatedQuestions = [...questions]
                          updatedQuestions[currentQuestionIndex] = { ...updatedQuestions[currentQuestionIndex], userAnswer: e.target.value }
                          setQuestions(updatedQuestions)
                        }}
                        placeholder="Type your answer here..."
                        className="h-32"
                      />
                      <div className="flex justify-between items-center">
                        <Button onClick={() => evaluateAnswer(currentQuestionIndex)} disabled={isEvaluating || !questions[currentQuestionIndex].userAnswer} className="bg-green-500 text-white hover:bg-green-600">
                          {isEvaluating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Evaluating...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              Evaluate Answer
                            </>
                          )}
                        </Button>
                        <div className="space-x-2">
                          <Button onClick={pauseResumeInterview} variant="outline">
                            {isInterviewPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                          </Button>
                          <Button onClick={nextQuestion} className="bg-blue-500 text-white hover:bg-blue-600">
                            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'End Interview'}
                          </Button>
                        </div>
                        <Button onClick={isRecording ? stopRecording : startRecording} variant="outline">
                          {isRecording ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                          {isRecording ? 'Stop Recording' : 'Start Recording'}
                        </Button>
                      </div>
                      {audioURL && (
                        <div className="mt-4">
                          <h4 className="font-semibold mb-2">Interview Recording</h4>
                          <audio src={audioURL} controls className="w-full" />
                        </div>
                      )}
                      {questions[currentQuestionIndex].feedback && (
                        <Card className="mt-4">
                          <CardHeader>
                            <CardTitle>Feedback</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="mb-2">Overall Rating: {questions[currentQuestionIndex].feedback.overallRating}/5</p>
                            <h5 className="font-semibold mb-1">Strengths:</h5>
                            <ul className="list-disc list-inside mb-2">
                              {questions[currentQuestionIndex].feedback.strengths.map((strength, index) => (
                                <li key={index}>{strength}</li>
                              ))}
                            </ul>
                            <h5 className="font-semibold mb-1">Areas for Improvement:</h5>
                            <ul className="list-disc list-inside mb-2">
                              {questions[currentQuestionIndex].feedback.areasForImprovement.map((area, index) => (
                                <li key={index}>{area}</li>
                              ))}
                            </ul>
                            <p className="text-sm">{questions[currentQuestionIndex].feedback.detailedFeedback}</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <>
                      <ScrollArea className="h-[60vh] pr-4">
                        <Accordion type="single" collapsible className="w-full">
                          {questions.map((q, index) => (
                            <QuestionCard
                              key={index}
                              question={q}
                              index={index}
                              questionTypes={questionTypes}
                              onAnswerChange={(answer) => {
                                const updatedQuestions = [...questions]
                                updatedQuestions[index] = { ...q, userAnswer: answer }
                                setQuestions(updatedQuestions)
                              }}
                              onEvaluate={() => evaluateAnswer(index)}
                              isEvaluating={isEvaluating}
                            />
                          ))}
                        </Accordion>
                      </ScrollArea>
                      <div className="mt-4 space-y-4">
                        <div>
                          <Label htmlFor="interview-duration">Interview Duration (minutes)</Label>
                          <div className="flex items-center space-x-2">
                            <Slider
                              id="interview-duration"
                              min={5}
                              max={120}
                              step={5}
                              value={[interviewDuration / 60]}
                              onValueChange={(value) => handleDurationChange(value[0])}
                            />
                            <span className="w-12 text-center">{interviewDuration / 60}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button onClick={startMockInterview} className="bg-green-500 text-white hover:bg-green-600">
                            Start Mock Interview
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline">
                                <Save className="mr-2 h-4 w-4" />
                                Save Question Set
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Save Question Set</DialogTitle>
                                <DialogDescription>Enter a name for this question set to save it for future use.</DialogDescription>
                              </DialogHeader>
                              <Input
                                value={currentSetName}
                                onChange={(e) => setCurrentSetName(e.target.value)}
                                placeholder="Question Set Name"
                              />
                              <Button onClick={saveQuestionSet} className="w-full bg-green-500 text-white hover:bg-green-600">
                                Save
                              </Button>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'saved' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Saved Question Sets</CardTitle>
                  <CardDescription>Load or manage your saved question sets.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[60vh] pr-4">
                    {savedSets.map((set, index) => (
                      <Card key={index} className="mb-4">
                        <CardHeader>
                          <CardTitle>{set.name}</CardTitle>
                          <CardDescription>Difficulty: {set.difficulty}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p>{set.questions.length} questions</p>
                          {set.industry && <p>Industry: {industrySpecificSets.find(i => i.id === set.industry)?.name || set.industry}</p>}
                        </CardContent>
                        <CardFooter>
                          <Button onClick={() => loadQuestionSet(set)} className="bg-green-500 text-white hover:bg-green-600">
                            Load Set
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {activeTab === 'progress' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Progress Tracking</CardTitle>
                  <CardDescription>Track your performance over multiple mock interviews.</CardDescription>
                </CardHeader>
                <CardContent>
                  {interviewResults.length > 0 ? (
                    <div className="space-y-6">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={interviewResults}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={[0, 5]} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="averageScore" stroke="#10B981" name="Average Score" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Performance by Question Type</h3>
                        {Object.entries(
                          interviewResults.reduce((acc, result) => {
                            Object.entries(result.questionTypes).forEach(([type, score]) => {
                              if (!acc[type]) acc[type] = []
                              acc[type].push(score)
                            })
                            return acc
                          }, {} as { [key: string]: number[] })
                        ).map(([type, scores]) => (
                          <div key={type} className="mb-4">
                            <h4 className="font-medium">{type}</h4>
                            <Progress value={(scores.reduce((a, b) => a + b, 0) / scores.length / 5) * 100} className="h-2" />
                            <p className="text-sm text-gray-600">Average: {(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)}/5</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600">No interview data available yet. Complete a mock interview to see your progress.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'resources' && (
              <ResourceLibrary
                resources={resources}
                onAddResource={addResource}
                onEditResource={editResource}
                onDeleteResource={deleteResource}
              />
            )}

            {activeTab === 'calendar' && <InterviewScheduler />}

            {activeTab === 'company-research' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Company Research</CardTitle>
                  <CardDescription>Learn about your target company</CardDescription>
                </CardHeader>
                <CardContent>
                  {companyResearch ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold">Products/Services</h3>
                        <p>{companyResearch.products_services}</p>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Recent News</h3>
                        <p>{companyResearch.recent_news}</p>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Company Culture</h3>
                        <p>{companyResearch.culture_values}</p>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Key Competitors</h3>
                        <p>{companyResearch.key_competitors}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Input
                        placeholder="Enter company name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                      <Button 
                        onClick={researchCompany} 
                        className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-white hover:from-green-500 hover:to-blue-600"
                        disabled={isLoading || !companyName.trim()}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Researching...
                          </>
                        ) : (
                          <>
                            <Building className="mr-2 h-4 w-4" />
                            Research Company
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

{activeTab === 'learning-path' && (
  <Card>
    <CardHeader>
      <CardTitle className="text-2xl">Personalized Learning Path</CardTitle>
      <CardDescription>
        Tailored recommendations based on your profile and job requirements
      </CardDescription>
    </CardHeader>
    <CardContent>
      {learningPath.length > 0 ? (
        <div className="space-y-6">
          {learningPath.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              {/* Skill Header */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold">{item.skill}</h3>
                <Badge>
                  {item.importance || 'medium'} priority
                </Badge>
              </div>
              
              {/* Explanation */}
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                {item.explanation}
              </p>

              {/* Time to Learn */}
              <p className="text-sm text-gray-500 mb-4">
                Estimated Time: {item.timeToLearn}
              </p>

              {/* Resources Collapsible */}
              <Collapsible className="w-full mb-4">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full flex items-center justify-between">
                    <span>Learning Resources</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="space-y-2 pl-4">
                    {item.resources?.map((resource, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-2">
                          <a 
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            {resource.title}
                          </a>
                          <Badge variant="outline" className="text-xs">
                            {resource.type}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            {resource.difficulty}
                          </Badge>
                          <Badge variant={resource.cost === 'free' ? 'success' : 'default'} className="text-xs">
                            {resource.cost}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Practice Projects Collapsible */}
              {item.practiceProjects && item.practiceProjects.length > 0 && (
                <Collapsible className="w-full mb-4">
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full flex items-center justify-between">
                      <span>Practice Projects</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="space-y-4 pl-4">
                      {item.practiceProjects.map((project, idx) => (
                        <div key={idx} className="border-l-2 border-gray-200 pl-4 py-2">
                          <h4 className="font-medium">{project.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {project.description}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {project.techStack.map((tech, techIdx) => (
                              <Badge key={techIdx} variant="outline" className="text-xs">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm text-gray-500 mt-2">
                            Estimated Time: {project.estimatedTime}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Communities Section */}
              {item.communities && item.communities.length > 0 && (
                <Collapsible className="w-full">
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full flex items-center justify-between">
                      <span>Learning Communities</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="space-y-2 pl-4">
                      {item.communities.map((community, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2">
                          <div className="flex items-center space-x-2">
                            <a 
                              href={community.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              {community.name}
                            </a>
                            <Badge variant="outline" className="text-xs">
                              {community.platform}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<GraduationCap className="h-12 w-12 text-gray-400" />}
          title="No Learning Path Generated"
          description="Generate your personalized learning path to get started"
        />
      )}
    </CardContent>
    <CardFooter>
      <Button
        onClick={generateLearningPath}
        className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-white hover:from-green-500 hover:to-blue-600"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Learning Path...
          </>
        ) : (
          <>
            <GraduationCap className="mr-2 h-4 w-4" />
            Generate Learning Path
          </>
        )}
      </Button>
    </CardFooter>
  </Card>
)}
          </div>
        </main>
      </div>
    </div>
  )
}

function QuestionCard({ question, index, questionTypes, onAnswerChange, onEvaluate, isEvaluating }) {
  const [isCopied, setIsCopied] = useState(false)
  const { toast } = useToast()

  const questionType = questionTypes.find(type => type.id === question.type) || { name: 'Unknown' }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(question.question)
    setIsCopied(true)
    toast({
      title: "Copied to clipboard",
      description: "The question has been copied to your clipboard.",
    })
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <AccordionItem value={`item-${index}`}>
      <AccordionTrigger>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            {questionType.name}
          </Badge>
          <span className="text-sm font-medium">Question {index + 1}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-2">
        <p className="text-lg font-medium">{question.question}</p>
        <p className="text-sm text-gray-600">
          <span className="font-semibold">Rationale:</span> {question.rationale}
        </p>
        <Textarea
          value={question.userAnswer || ''}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Type your answer here..."
          className="h-32"
        />
        <div className="flex justify-between">
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            {isCopied ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Clipboard className="mr-2 h-4 w-4" />
                Copy Question
              </>
            )}
          </Button>
          <Button onClick={onEvaluate} disabled={isEvaluating || !question.userAnswer} className="bg-green-500 text-white hover:bg-green-600">
            {isEvaluating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Evaluate Answer
              </>
            )}
          </Button>
        </div>
        {question.feedback && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2">Overall Rating: {question.feedback.overallRating}/5</p>
              <h5 className="font-semibold mb-1">Strengths:</h5>
              <ul className="list-disc list-inside mb-2">
                {question.feedback.strengths.map((strength, index) => (
                  <li key={index}>{strength}</li>
                ))}
              </ul>
              <h5 className="font-semibold mb-1">Areas for Improvement:</h5>
              <ul className="list-disc list-inside mb-2">
                {question.feedback.areasForImprovement.map((area, index) => (
                  <li key={index}>{area}</li>
                ))}
              </ul>
              <p className="text-sm">{question.feedback.detailedFeedback}</p>
            </CardContent>
          </Card>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}