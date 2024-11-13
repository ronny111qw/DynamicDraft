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
import { Loader2, Clipboard, CheckCircle2, Sparkles, Save, Plus, X, Send, Play, Pause, Mic, MicOff, BarChart, Book, FileText, Menu, Home, Calendar, Building, GraduationCap, ChevronDown, Trash2, ChartBar } from 'lucide-react'
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
import Link from 'next/link'
import { UserCircle } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Menu as HeadlessMenu, Transition } from '@headlessui/react' // Rename to avoid conflicts
import { Fredoka } from '@next/font/google';
import { SavedSet } from '@prisma/client';
import { format } from 'date-fns';

const fredoka = Fredoka({ weight: ['400','600'], subsets: ['latin'] });



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

const calculateImprovementRate = (results: any[]) => {
  if (results.length < 2) return 0;
  
  const firstScore = results[0].averageScore;
  const lastScore = results[results.length - 1].averageScore;
  
  const improvementRate = ((lastScore - firstScore) / firstScore) * 100;
  return Math.round(Math.max(improvementRate, 0));
};

export default function EnhancedQuestionGenerator() {
  const [resume, setResume] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('input')
  const [difficulty, setDifficulty] = useState('intermediate')
  const [savedSets, setSavedSets] = useState<SavedSet[]>([])
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
  const [learningPath, setLearningPath] = useState<string[]>([])

  // Add this state to manage the dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);




  useEffect(() => {
    fetchSavedSets();
  }, []);

  const fetchSavedSets = useCallback(async () => {
    try {
      const response = await fetch('/api/savedSets');
      if (!response.ok) throw new Error('Failed to fetch sets');
      const data = await response.json();
      setSavedSets(data);
    } catch (error) {
      console.error('Error fetching saved sets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch saved sets",
        variant: "destructive",
      });
    }
  }, []);

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

  const saveQuestionSet = async () => {
    if (!currentSetName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the question set",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/savedSets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentSetName,
          questions,
          resume,
          jobDescription,
          difficulty,
          industry: selectedIndustry,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      // Show success toast
      toast({
        title: "Success",
        description: `Question set "${currentSetName}" saved successfully`,
        variant: "default",
      });

      // Reset form and close dialog
      setCurrentSetName('');
      setIsDialogOpen(false);
      
      // Refresh the saved sets list
      fetchSavedSets();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save question set",
        variant: "destructive",
      });
    }
  };

  const deleteQuestionSet = async (id: number) => {
    try {
      const response = await fetch('/api/savedSets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error('Failed to delete');

      toast({
        title: "Success",
        description: "Question set deleted successfully",
      });

      fetchSavedSets(); // Refresh the list
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete question set",
        variant: "destructive",
      });
    }
  };

  const loadQuestionSet = (set: any) => {
    setQuestions(set.questions);
    setResume(set.resume);
    setJobDescription(set.jobDescription);
    setDifficulty(set.difficulty);
    setSelectedIndustry(set.industry);
    setActiveTab('questions');
  };

  const handleEvaluateAnswer = async (questionIndex: number) => {
    try {
      setIsEvaluating(true);
      const question = questions[questionIndex];
      const feedback = await evaluateAnswerWithGemini(question.question, question.userAnswer || '');
      
      // Update the question with feedback
      const updatedQuestions = [...questions];
      updatedQuestions[questionIndex] = {
        ...question,
        feedback
      };
      setQuestions(updatedQuestions);

      // Calculate and store the interview result
      const newResult = {
        date: format(new Date(), 'yyyy-MM-dd'),
        averageScore: feedback.overallRating, // Use the actual rating from feedback
        totalQuestions: questions.length,
        questionTypes: {
          [question.type]: feedback.overallRating // Store the actual score
        }
      };

      setInterviewResults(prev => [...prev, newResult]);
      
      toast({
        title: "Answer Evaluated",
        description: "Your answer has been evaluated successfully.",
      });
    } catch (error) {
      console.error('Error evaluating answer:', error);
      toast({
        title: "Error",
        description: "Failed to evaluate answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEvaluating(false);
    }
  };

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
      .replace(/```json\n?|\n?```/g, '') // Remove code blocks
      .replace(/\*/g, '')                // Remove asterisks
      .trim();
  
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
            "importance": "High|Medium|Low",
            "timeToLearn": "Realistic time estimate",
            "resources": [
              {
                "title": "Resource name (include year if applicable)",
                "url": "Active, verified URL",
                "type": "Documentation|Course|Video|Community|Github",
                "difficulty": "Beginner|Intermediate|Advanced",
                "cost": "Free|Paid|Freemium",
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
    <div className="bg-black min-h-screen text-gray-900 font-sans">
        <nav className="border-b bg-black border-gray-800 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Sparkles className="w-8 h-8 text-green-400" />
              <span className={`text-3xl font-bold text-white ${fredoka.className}`}>
                Dynamic<span className="text-green-400">Draft</span>
                  </span>
            </Link>

            <div className="flex items-center space-x-6">
              <Link href="/dashboard" className="text-gray-300 hover:text-white">
                Dashboard
              </Link>
              <Link href="/choose-template" className="text-gray-300 hover:text-white">
                Templates
              </Link>
              <Link href="/intmock" className="text-gray-300 hover:text-white">
                Mock Interview
              </Link>
              <button className="bg-gradient-to-r from-green-400 to-blue-500 text-black px-4 py-2 rounded-full text-sm font-medium hover:from-green-500 hover:to-blue-600 transition-all duration-300">
                Upgrade
              </button>
            </div>
          </div>
        </div>
      </nav>
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-5 pointer-events-none"></div>
      <div className="relative z-10 flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 bg-[#1a1a1a] border-r border-gray-800 p-6 hidden md:block">
  <div className="mb-8">
    <h1 className="text-2xl font-bold mb-2 flex items-center text-white">
      <span className={`${fredoka.className}`}>AI Interview Prep</span>
    </h1>
    <p className="text-sm text-gray-400">Master your interview skills with AI</p>
  </div>

   <div className="mt-0 mb-4 border-b border-gray-700/60" />

   
  <nav>
    <ul className="space-y-2">
      {[
        { id: 'input', name: 'Input', icon: Home, description: 'Setup your interview' },
        { id: 'tips', name: 'Tips', icon: Sparkles, description: 'Interview strategies' },
        { id: 'questions', name: 'Questions', icon: FileText, description: 'Practice questions' },
        { id: 'saved', name: 'Saved Sets', icon: Save, description: 'Your question sets' },
        { id: 'progress', name: 'Progress', icon: BarChart, description: 'Track improvement' },
        { id: 'resources', name: 'Resources', icon: Book, description: 'Study materials' },
        { id: 'calendar', name: 'Calendar', icon: Calendar, description: 'Schedule practice' },
        { id: 'company-research', name: 'Research', icon: Building, description: 'Company insights' },
        { id: 'learning-path', name: 'Learning Path', icon: GraduationCap, description: 'Custom roadmap' },
      ].map((item) => (
        <li key={item.id}>
          <Button
            variant={activeTab === item.id ? 'default' : 'ghost'}
            className={`w-full justify-start p-3 ${
              activeTab === item.id 
                ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-lg shadow-green-400/20'
                : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
            } transition-all duration-200 rounded-lg group relative`}
            onClick={() => setActiveTab(item.id)}
          >
            <div className="flex items-center">
              <item.icon className={`h-5 w-5 mr-3 ${
                activeTab === item.id 
                  ? 'text-white' 
                  : 'text-gray-400 group-hover:text-white'
              }`} />
              <div className="flex flex-col items-start">
                <span className="font-medium">{item.name}</span>
                <span className={`text-xs ${
                  activeTab === item.id 
                    ? 'text-gray-100' 
                    : 'text-gray-500 group-hover:text-gray-300'
                }`}>
                  {item.description}
                </span>
              </div>
            </div>
            {activeTab === item.id && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <div className="h-2 w-2 rounded-full bg-white"></div>
              </div>
            )}
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
                  { id: 'calendar', name: 'Calendar', icon: Calendar },
                  { id: 'company-research', name: 'Research', icon: Building },
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
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'input' && (
              <Card className='bg-[#1a1a1a] border-gray-800'>
                <CardHeader>
                  <CardTitle className="text-2xl text-white">Input Information</CardTitle>
                  <CardDescription className="text-gray-400">Provide your resume and job description</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="resume" className="text-gray-200">Resume</Label>
                    <Textarea
                      id="resume"
                      placeholder="Paste your resume here..."
                      value={resume}
                      onChange={(e) => setResume(e.target.value)}
                      className="h-40 bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="jobDescription" className="text-gray-200">Job Description</Label>
                    <Textarea
                      id="jobDescription"
                      placeholder="Paste the job description here..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="h-40 bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="difficulty" className="text-gray-200">Difficulty Level</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger id="difficulty" className="bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-500">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2a2a2a] border-gray-700 text-white">
                        <SelectItem value="beginner" className='focus:bg-[#3a3a3a] focus:text-white'>Beginner</SelectItem>
                        <SelectItem value="intermediate" className='focus:bg-[#3a3a3a] focus:text-white'>Intermediate</SelectItem>
                        <SelectItem value="advanced" className='focus:bg-[#3a3a3a] focus:text-white'>Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="industry" className="text-gray-200">Industry</Label>
                    <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                      <SelectTrigger id="industry" className="bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-500">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2a2a2a] border-gray-700 text-white">
                        <SelectItem value="general" className='focus:bg-[#3a3a3a] focus:text-white'>General (No specific industry)</SelectItem>
                        {industrySpecificSets.map((industry) => (
                          <SelectItem key={industry.id} value={industry.id}
                          className='focus:bg-[#3a3a3a] focus:text-white'
                          >{industry.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-200">Question Types</Label>
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
                          className="flex-grow bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-500"
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
                      <Button
  onClick={() => setIsAddingQuestionType(true)}
  className="mt-2 bg-gray-200 text-black hover:bg-gray-300 "
>
  <Plus className="h-4 w-4" />
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
              <Card className='bg-[#1a1a1a] border-gray-800'>
                <CardHeader>
                  <CardTitle className="text-2xl text-white">Interview Preparation Tips</CardTitle>
                  <CardDescription>Get tailored tips based on your resume and the job description</CardDescription>
                </CardHeader>
                <CardContent>
                  {interviewTips.length > 0 ? (
                    <ul className="list-disc list-inside space-y-2 text-gray-200">
                      {interviewTips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul> 
                  ) : (
                    <p className="text-gray-400">No tips generated yet. Click the button below to generate tips.</p>
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
              <Card className="bg-[#1a1a1a] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-2xl text-white">Generated Interview Questions</CardTitle>
                  <CardDescription className="text-gray-400">Review, answer, and get feedback on these tailored interview questions.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isMockInterviewMode ? (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-white">Mock Interview Mode</h3>
                      <div className="flex justify-between items-center text-gray-400">
                        <p>Question {currentQuestionIndex + 1} of {questions.length}</p>
                        <p>Time: {formatTime(interviewTimer)} / {formatTime(interviewDuration)}</p>
                      </div>
                      <Progress value={(interviewTimer / interviewDuration) * 100} className="w-full" />
                      <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="w-full" />
                      <Card className="bg-[#2a2a2a] border-gray-700">
                        <CardContent className="pt-6">
                          <p className="text-lg font-medium text-white">{questions[currentQuestionIndex].question}</p>
                        </CardContent>
                      </Card>
                      <Textarea
                        value={questions[currentQuestionIndex].userAnswer || ''}
                        onChange={(e) => {
                          const updatedQuestions = [...questions]
                          updatedQuestions[currentQuestionIndex] = { ...updatedQuestions[currentQuestionIndex], userAnswer: e.target.value }
                          setQuestions(updatedQuestions)
                        }}
                        placeholder="Type your answer here..."
                        className="h-32 bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-500"
                      />
                      <div className="flex justify-between items-center">
                        <Button onClick={() => handleEvaluateAnswer(currentQuestionIndex)} disabled={isEvaluating || !questions[currentQuestionIndex].userAnswer} className="bg-green-500 text-white hover:bg-green-600">
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
                              onEvaluate={() => handleEvaluateAnswer(index)}
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
                          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                                <Save className="mr-2 h-4 w-4" />
                                Save Question Set
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Save Question Set</DialogTitle>
                                <DialogDescription>
                                  Enter a name for this question set to save it for future use.
                                </DialogDescription>
                              </DialogHeader>
                              <Input
                                value={currentSetName}
                                onChange={(e) => setCurrentSetName(e.target.value)}
                                placeholder="Question Set Name"
                              />
                              <Button 
                                onClick={saveQuestionSet} 
                                className="w-full bg-green-500 text-white hover:bg-green-600"
                              >
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
              <Card className='bg-[#1a1a1a] border-gray-800'>
                <CardHeader>
                  <CardTitle className="text-2xl text-white">Saved Question Sets</CardTitle>
                  <CardDescription>Your saved interview question sets</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[60vh] pr-4">
                    {savedSets.length > 0 ? (
                      savedSets.map((set: SavedSet) => (
                        <Card key={set.id} className="mb-4 bg-[#2a2a2a] border-gray-700">
                          <CardHeader>
                            <CardTitle className='text-white text-lg'>{set.name}</CardTitle>
                            <CardDescription className='text-gray-400'>Difficulty: {set.difficulty}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className='text-gray-400'>{Array.isArray(set.questions) ? set.questions.length : 0} questions</p>
                            {set.industry && (
                              <p className='text-gray-400'>Industry: {industrySpecificSets.find(i => i.id === set.industry)?.name || set.industry}</p>
                            )}
                          </CardContent>
                          <CardFooter className="flex justify-between">
                            <Button 
                              onClick={() => loadQuestionSet(set)} 
                              className="bg-green-500 text-white hover:bg-green-600"
                            >
                              Load Set
                            </Button>
                            <Button 
                              className='bg-red-500 text-white hover:bg-red-600'
                              onClick={() => deleteQuestionSet(set.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </CardFooter>
                        </Card>
                      ))
                    ) : (
                      <EmptyState
                        icon={<Save className="h-12 w-12 text-gray-400" />}
                        title= {<span className='text-white'>No Saved Sets</span>}
                        description={<span className='text-gray-400'>Save your question sets to access them later</span>}
                      />
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {activeTab === 'progress' && (
              <Card className="bg-[#1a1a1a] border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl text-white">Progress Tracking</CardTitle>
                    <CardDescription className="text-gray-400">Comprehensive analysis of your interview performance</CardDescription>
                  </div>
                  
                  {/* Reset Progress Dialog */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        className="bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400"
                      >
                        Reset Progress
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#2a2a2a] border-gray-700">
                      <DialogHeader>
                        <DialogTitle className="text-white">Reset Progress</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          This will permanently delete all your interview results and progress data. This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button 
                          variant="outline" 
                          className="border-gray-700 text-gray-400 hover:bg-gray-800"
                          onClick={() => {
                            const dialogClose = document.querySelector('[data-dialog-close]') as HTMLButtonElement;
                            dialogClose?.click();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="destructive"
                          className="bg-red-500 hover:bg-red-600"
                          onClick={() => {
                            setInterviewResults([]);
                            localStorage.removeItem('interviewResults'); // Add this if you're using localStorage
                            const dialogClose = document.querySelector('[data-dialog-close]') as HTMLButtonElement;
                            dialogClose?.click();
                            toast({
                              title: "Progress Reset",
                              description: "All progress data has been cleared.",
                              variant: "destructive",
                            });
                          }}
                        >
                          Reset All Data
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>

                <CardContent>
                  {interviewResults.length > 0 ? (
                    <div className="space-y-8">
                      {/* Overall Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-[#2a2a2a] border-gray-700">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <h3 className="text-white text-sm font-medium">Total Interviews</h3>
                              <div className="mt-2 text-3xl font-bold text-white">{interviewResults.length}</div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-[#2a2a2a] border-gray-700">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <h3 className="text-white text-sm font-medium">Average Score</h3>
                              <div className="mt-2 text-3xl font-bold text-emerald-500">
                                {(interviewResults.reduce((acc, result) => acc + result.averageScore, 0) / interviewResults.length).toFixed(1)}/5
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-[#2a2a2a] border-gray-700">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <h3 className="text-white text-sm font-medium">Improvement Rate</h3>
                              <div className="mt-2 text-3xl font-bold text-amber-500">
                                {calculateImprovementRate(interviewResults)}%
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Score Trend */}
                      <Card className="bg-[#2a2a2a] border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">Performance Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={interviewResults}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis 
                                  dataKey="date" 
                                  stroke="#9CA3AF"
                                  tick={{ fill: '#9CA3AF' }}
                                />
                                <YAxis 
                                  domain={[0, 5]} 
                                  stroke="#9CA3AF"
                                  tick={{ fill: '#9CA3AF' }}
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#374151',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff'
                                  }}
                                />
                                <Legend />
                                <Line 
                                  type="monotone" 
                                  dataKey="averageScore" 
                                  stroke="#10B981" 
                                  name="Average Score"
                                  strokeWidth={2}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Question Type Performance */}
                      <Card className="bg-[#2a2a2a] border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">Performance by Question Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {Object.entries(
                              interviewResults.reduce((acc, result) => {
                                Object.entries(result.questionTypes).forEach(([type, score]) => {
                                  if (!acc[type]) acc[type] = []
                                  acc[type].push(score)
                                })
                                return acc
                              }, {} as { [key: string]: number[] })
                            ).map(([type, scores]) => {
                              const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
                              const performance = getPerformanceLabel(avgScore);
                              
                              return (
                                <div key={type} className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-white font-medium">{type}</h4>
                                    <span className={performance.color}>
                                      {avgScore.toFixed(2)}/5
                                    </span>
                                  </div>
                                  <Progress 
                                    value={calculateProgress(scores)} 
                                    className="h-2 bg-gray-700"
                                    indicatorClassName={avgScore >= 4 ? 'bg-emerald-500' : 
                                                      avgScore >= 3 ? 'bg-green-500' : 
                                                      avgScore >= 2 ? 'bg-amber-500' : 'bg-red-500'}
                                  />
                                  <div className="flex justify-between text-xs text-gray-400">
                                    <span>Lowest: {Math.min(...scores).toFixed(1)}</span>
                                    <span>Highest: {Math.max(...scores).toFixed(1)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Recent Interviews */}
                      <Card className="bg-[#2a2a2a] border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">Recent Interviews</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[300px]"> {/* Add fixed height ScrollArea */}
                            <div className="space-y-4 pr-4"> {/* Add right padding for scrollbar */}
                              {interviewResults.slice(-5).reverse().map((result, index) => {
                                const performance = getPerformanceLabel(result.averageScore);
                                return (
                                  <div 
                                    key={index} 
                                    className="flex items-center justify-between p-4 rounded-lg bg-[#1a1a1a] border border-gray-700"
                                  >
                                    <div>
                                      <p className="text-white">
                                        {format(new Date(result.date), 'MMM dd, yyyy')}
                                      </p>
                                      <p className="text-sm text-gray-400">
                                        Questions: {result.totalQuestions}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-lg font-semibold text-emerald-500">
                                        {result.averageScore.toFixed(1)}/5
                                      </p>
                                      <p className={`text-sm ${performance.color}`}>
                                        {performance.text}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <EmptyState
                      icon={<ChartBar className="h-12 w-12 text-gray-500" />}
                      title={<span className="text-white">No Interview Data</span>}
                      description={<span className="text-gray-400">Complete a mock interview to see your progress tracking</span>}
                    />
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
              <Card className='bg-[#1a1a1a] border-none'>
                <CardHeader>
                  <CardTitle className="text-2xl text-white">Company Research</CardTitle>
                  <CardDescription>Learn about your target company</CardDescription>
                </CardHeader>
                <CardContent>
                  {companyResearch ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Products/Services</h3>
                        <p className="text-gray-300">{companyResearch.products_services}</p>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Recent News</h3>
                        <p className="text-gray-300">{companyResearch.recent_news}</p>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Company Culture</h3>
                        <p className="text-gray-300">{companyResearch.culture_values}</p>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Key Competitors</h3>
                        <p className="text-gray-300">{companyResearch.key_competitors}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Input
                        placeholder="Enter company name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="text-white border-gray-700 placeholder:text-gray-400"
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
  <Card className='bg-[#1a1a1a] border-none'>
    <CardHeader>
      <CardTitle className="text-2xl text-white">Personalized Learning Path</CardTitle>
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
              className="p-4 rounded-lg border border-gray-700"
            >
              {/* Skill Header */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold text-white">{item.skill}</h3>
                <Badge variant='secondary'>
                  {item.importance || 'medium'} priority
                </Badge>
              </div>
              
              {/* Explanation */}
              <p className="text-gray-300 mb-2">
                {item.explanation}
              </p>

              {/* Time to Learn */}
              <p className="text-sm text-gray-500 mb-4">
                Estimated Time: {item.timeToLearn}
              </p>

              {/* Resources Collapsible */}
              <Collapsible className="w-full mb-4">
                <CollapsibleTrigger asChild>
                  <Button className="w-full flex items-center justify-between bg-[#2a2a2a] hover:bg-[#2a2a2a]">
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
                            className="text-gray-300 hover:underline"
                          >
                            {resource.title}
                          </a>
                          <Badge variant="secondary" className="text-xs">
                            {resource.type}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            {resource.difficulty}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
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
                    <Button className="w-full flex items-center justify-between bg-[#2a2a2a] hover:bg-[#2a2a2a]">
                      <span>Practice Projects</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="space-y-4 pl-4">
                      {item.practiceProjects.map((project, idx) => (
                        <div key={idx} className="border-l-2 border-gray-200 pl-4 py-2">
                          <h4 className="font-medium text-white">{project.name}</h4>
                          <p className="text-sm text-gray-400">
                            {project.description}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {project.techStack.map((tech, techIdx) => (
                              <Badge key={techIdx} variant="secondary" className="text-xs">
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
                    <Button className="w-full flex items-center justify-between bg-[#2a2a2a] hover:bg-[#2a2a2a]">
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
                              className="text-gray-300 hover:underline"
                            >
                              {community.name}
                            </a>
                            <Badge variant="secondary" className="text-xs">
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
          title={<span className='text-white'>No Learning Path Generated</span>}
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
    <AccordionItem value={`item-${index}`} className="border-gray-700">
      <AccordionTrigger className="text-white hover:text-gray-300">
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            {questionType.name}
          </Badge>
          <span className="text-sm font-medium">Question {index + 1}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-2">
        <p className="text-lg font-medium text-white">{question.question}</p>
        <p className="text-sm text-gray-400">
          <span className="font-semibold">Rationale:</span> {question.rationale}
        </p>
        <Textarea
          value={question.userAnswer || ''}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Type your answer here..."
          className="h-32 bg-[#2a2a2a] border-gray-700 text-white placeholder-gray-500"
        />
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={copyToClipboard}
            className="border-gray-700 text-gray-300 hover:text-white hover:bg-[#2a2a2a]"
          >
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
          <Button 
            onClick={onEvaluate} 
            disabled={isEvaluating || !question.userAnswer} 
            className="bg-green-500 text-white hover:bg-green-600"
          >
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
          <Card className="mt-4 bg-[#2a2a2a] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Feedback</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300">
              <p className="mb-2">Overall Rating: {question.feedback.overallRating}/5</p>
              <h5 className="font-semibold mb-1 text-white">Strengths:</h5>
              <ul className="list-disc list-inside mb-2">
                {question.feedback.strengths.map((strength, index) => (
                  <li key={index}>{strength}</li>
                ))}
              </ul>
              <h5 className="font-semibold mb-1 text-white">Areas for Improvement:</h5>
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

const getPerformanceLabel = (score: number) => {
  if (score >= 4.5) return { text: 'Excellent', color: 'text-emerald-500' };
  if (score >= 3.5) return { text: 'Very Good', color: 'text-green-500' };
  if (score >= 2.5) return { text: 'Good', color: 'text-amber-500' };
  if (score >= 1.5) return { text: 'Fair', color: 'text-orange-500' };
  return { text: 'Needs Improvement', color: 'text-red-500' };
};

const calculateProgress = (scores: number[]) => {
  if (!scores.length) return 0;
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  return (average / 5) * 100; // Convert to percentage
};