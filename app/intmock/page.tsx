'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mic, MicOff, Volume2, VolumeX, ChevronRight } from "lucide-react"
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast"
import { GoogleGenerativeAI } from '@google/generative-ai'

// Types
interface InterviewHistoryItem {
  question: string
  answer: string
  timestamp: number
  duration: number
}

interface Evaluation {
  strengths: string[]
  improvements: string[]
  overallScore: number
  feedback: string
}

// Add new interface for interview settings
interface InterviewSettings {
  duration: number;  // minutes
  questionCount: number;
  difficulty: 'entry' | 'mid' | 'senior';
  role: string;
}

// AI Interviewer Component with Speaking Animation
const AiInterviewer = React.memo(({ isInterviewerTurn, isSpeaking }: { isInterviewerTurn: boolean, isSpeaking: boolean }) => {
  return (
    <div className="relative w-48 h-48">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 200 200"
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
      >
        <defs>
          <clipPath id="face-circle">
            <circle cx="100" cy="100" r="80"/>
          </clipPath>
          
          <g id="neutral-face">
            <circle cx="70" cy="85" r="8" fill="#2C3E50"/>
            <circle cx="130" cy="85" r="8" fill="#2C3E50"/>
            <path d="M70 120 Q100 140 130 120" fill="none" stroke="#2C3E50" stroke-width="4" stroke-linecap="round"/>
          </g>
          
          <g id="speaking-face">
            <circle cx="70" cy="85" r="8" fill="#2C3E50"/>
            <circle cx="130" cy="85" r="8" fill="#2C3E50"/>
            <path d="M70 120 Q100 130 130 120" fill="none" stroke="#2C3E50" stroke-width="4" stroke-linecap="round">
              <animate 
                attributeName="d" 
                dur="0.5s"
                repeatCount="indefinite"
                values="
                  M70 120 Q100 130 130 120;
                  M70 120 Q100 125 130 120;
                  M70 120 Q100 130 130 120"
              />
            </path>
          </g>
        </defs>
        
        <circle cx="100" cy="100" r="80" fill="#FFB6C1"/>
        <path d="M25 100 C 25 45, 175 45, 175 100" fill="#4A4A4A" clip-path="url(#face-circle)"/>
        
        <g id="expressions">
          <use href={isSpeaking ? "#speaking-face" : "#neutral-face"} />
        </g>
      </svg>
      {isInterviewerTurn && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
          </span>
        </div>
      )}
    </div>
  )
})

AiInterviewer.displayName = 'AiInterviewer'

// Speech synthesis and recognition utility
class SpeechHandler {
  private synthesis: SpeechSynthesis
  private recognition: SpeechRecognition
  private voices: SpeechSynthesisVoice[] = []
  
  constructor() {
    this.synthesis = window.speechSynthesis
    this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
    this.recognition.continuous = false
    this.recognition.interimResults = false
    this.loadVoices()
  }

  private loadVoices = () => {
    this.voices = this.synthesis.getVoices()
    if (this.voices.length === 0) {
      this.synthesis.addEventListener('voiceschanged', () => {
        this.voices = this.synthesis.getVoices()
      })
    }
  }

  speak = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text)
      // Enhanced voice selection
      const preferredVoices = this.voices.filter(voice => 
        (voice.name.toLowerCase().includes('female') || 
         voice.name.includes('Samantha') ||
         voice.name.includes('Karen')) &&
        voice.lang.startsWith('en-')  // Ensure English voice
      )
      utterance.voice = preferredVoices[0] || this.voices[0]
      utterance.rate = 0.9  // Slightly slower for clarity
      utterance.pitch = 1.1  // Slightly higher pitch
      utterance.onend = () => resolve()
      this.synthesis.speak(utterance)
    })
  }

  startListening = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        resolve(transcript)
      }
      this.recognition.onerror = (event) => {
        reject(event.error)
      }
      this.recognition.start()
    })
  }

  stopListening = () => {
    this.recognition.stop()
  }
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY_INTRV_QUES!)

export default function MockInterviewPlatform() {
  // State management
  const [currentStep, setCurrentStep] = useState<'prep' | 'interview' | 'complete'>('prep')
  const [interviewType, setInterviewType] = useState<'behavioral' | 'technical'>('behavioral')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [isInterviewerTurn, setIsInterviewerTurn] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [thinkingProgress, setThinkingProgress] = useState(0)
  const [interviewHistory, setInterviewHistory] = useState<InterviewHistoryItem[]>([])
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [startTime, setStartTime] = useState<number>(0)

  const speechHandler = useRef<SpeechHandler>()
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)

  // Add new states
  const [settings, setSettings] = useState<InterviewSettings>({
    duration: 30,
    questionCount: 5,
    difficulty: 'mid',
    role: 'Full Stack Developer'
  })
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isThinking, setIsThinking] = useState(false)

  // Initialize speech handler
  useEffect(() => {
    speechHandler.current = new SpeechHandler()
  }, [])

  // Question generation using Gemini AI
  const generateQuestion = async () => {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })
    
    const prompt = `As an experienced ${settings.difficulty}-level technical interviewer, generate a ${interviewType} interview question for a ${settings.role} position.
    
    Context:
    - Previous questions: ${interviewHistory.map(item => item.question).join('; ')}
    - Candidate's performance: ${interviewHistory.length > 0 ? 'Based on previous answers, adjust difficulty accordingly' : 'Initial question'}
    - Interview stage: Question ${interviewHistory.length + 1} of ${settings.questionCount}
    
    Requirements:
    1. Make the question challenging but appropriate for the level
    2. Keep it conversational and clear
    3. Don't repeat previous questions
    4. For behavioral questions, focus on real-world scenarios
    5. For technical questions, focus on practical problem-solving
    
    Response format: Just the question, no additional text.`

    try {
      const result = await model.generateContent(prompt)
      const response = await result.response
      return response.text().trim()
    } catch (error) {
      console.error('Error generating question:', error)
      return getBackupQuestion(interviewType, settings.difficulty)
    }
  }

  // Add interviewer thinking simulation
  const simulateThinking = async () => {
    setIsThinking(true)
    const thinkingTime = Math.random() * 2000 + 1000 // 1-3 seconds
    await new Promise(resolve => setTimeout(resolve, thinkingTime))
    setIsThinking(false)
  }

  // Interview flow handlers
  const handleInterviewerThinking = async () => {
    setIsInterviewerTurn(true)
    setThinkingProgress(0)
    
    await simulateThinking()
    
    try {
      const newQuestion = await generateQuestion()
      setThinkingProgress(100)
      
      // Add slight delay before speaking
      await new Promise(resolve => setTimeout(resolve, 500))
      setQuestion(newQuestion)
      
      if (isAudioEnabled) {
        setIsSpeaking(true)
        await speechHandler.current?.speak(newQuestion)
        setIsSpeaking(false)
      }
      
      setIsInterviewerTurn(false)
      setThinkingProgress(0)
      setStartTime(Date.now())
      startListening()
    } catch (error) {
      console.error('Error in interview flow:', error)
    }
  }

  const startListening = async () => {
    if (!isAudioEnabled) return
    
    setIsListening(true)
    try {
      const transcript = await speechHandler.current?.startListening()
      if (transcript) {
        setAnswer(transcript)
        handleSubmitAnswer(transcript)
      }
    } catch (error) {
      console.error('Error in speech recognition:', error)
    } finally {
      setIsListening(false)
    }
  }

  const handleSubmitAnswer = (finalAnswer: string) => {
    const duration = Date.now() - startTime

    const newHistoryItem: InterviewHistoryItem = {
      question,
      answer: finalAnswer,
      timestamp: Date.now(),
      duration
    }
    
    setInterviewHistory([...interviewHistory, newHistoryItem])
    setAnswer('')
    
    if (interviewHistory.length < 4) {
      handleInterviewerThinking()
    } else {
      setCurrentStep('complete')
      evaluateInterview()
    }
  }

  // Evaluation logic
  const evaluateInterview = async () => {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })
    
    const interviewDetails = interviewHistory.map(item => 
      `Question:\n${item.question}\n\nAnswer:\n${item.answer}\n\nTime taken: ${Math.round(item.duration / 1000)} seconds`
    ).join('\n\n---\n\n')

    const prompt = `You are an experienced technical interviewer. Please evaluate this ${interviewType} interview...`

    try {
      const result = await model.generateContent(prompt)
      const response = await result.response
      const evaluation = JSON.parse(response.text())
      setEvaluation(evaluation)
    } catch (error) {
      console.error('Error evaluating interview:', error)
      setEvaluation({
        strengths: ["Clear communication", "Good approach", "Technical knowledge"],
        improvements: ["Practice more", "Consider edge cases", "Improve efficiency"],
        overallScore: 3,
        feedback: "The interview showed both strengths and areas for improvement."
      })
    }
  }

  // Render functions for different steps
  const renderPreparationStep = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Voice-Based Mock Interview</CardTitle>
        <CardDescription>Prepare for your interview with our AI interviewer</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Select onValueChange={(value: 'behavioral' | 'technical') => setInterviewType(value)} value={interviewType}>
            <SelectTrigger>
              <SelectValue placeholder="Select interview type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="behavioral">Behavioral</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            onValueChange={(value: 'entry' | 'mid' | 'senior') => 
              setSettings(prev => ({ ...prev, difficulty: value }))}
            value={settings.difficulty}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select experience level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entry">Entry Level</SelectItem>
              <SelectItem value="mid">Mid Level</SelectItem>
              <SelectItem value="senior">Senior Level</SelectItem>
            </SelectContent>
          </Select>

          <input
            type="text"
            placeholder="Role (e.g., Full Stack Developer)"
            className="w-full p-2 border rounded"
            value={settings.role}
            onChange={e => setSettings(prev => ({ ...prev, role: e.target.value }))}
          />

          <Alert>
            <AlertDescription>
              This interview will use voice interaction. Make sure your microphone is working and you're in a quiet environment.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => setIsAudioEnabled(!isAudioEnabled)}
        >
          {isAudioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
        <Button onClick={() => setCurrentStep('interview')}>
          Start Interview <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )

  const renderInterviewStep = () => (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Mock Interview in Progress</CardTitle>
        <CardDescription>{interviewType} Interview - Question {interviewHistory.length + 1}/5</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-6">
          <AiInterviewer isInterviewerTurn={isInterviewerTurn} isSpeaking={isSpeaking} />
          
          <div className="w-full space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-semibold">{question}</p>
              {isInterviewerTurn && (
                <div className="flex items-center mt-2">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <Progress value={thinkingProgress} className="w-full" />
                </div>
              )}
            </div>

            {!isInterviewerTurn && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">Your Answer:</p>
                  {isListening ? (
                    <Mic className="h-4 w-4 text-red-500 animate-pulse" />
                  ) : (
                    <MicOff className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <p>{answer}</p>
              </div>
            )}
          </div>
          
          <Progress 
            value={(interviewHistory.length / 5) * 100} 
            className="w-full"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep('complete')}>
          End Interview
        </Button>
        <Button 
          onClick={() => startListening()}
          disabled={isInterviewerTurn || isListening}
        ></Button>
        <Button 
          onClick={() => startListening()}
          disabled={isInterviewerTurn || isListening}
        >
          {isListening ? 'Listening...' : 'Start Speaking'}
        </Button>
      </CardFooter>
    </Card>
  )

  const renderCompletionStep = () => (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Interview Complete</CardTitle>
        <CardDescription>Here's your performance evaluation</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {evaluation ? (
            <>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Strengths</h3>
                  <ul className="list-disc pl-5">
                    {evaluation.strengths.map((strength, index) => (
                      <li key={index}>{strength}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Areas for Improvement</h3>
                  <ul className="list-disc pl-5">
                    {evaluation.improvements.map((improvement, index) => (
                      <li key={index}>{improvement}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Overall Score</h3>
                  <Progress value={evaluation.overallScore * 20} className="w-full" />
                  <p className="mt-2 text-sm text-gray-600">{evaluation.overallScore}/5</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Detailed Feedback</h3>
                  <p className="text-gray-700">{evaluation.feedback}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Interview History</h3>
                <div className="space-y-4">
                  {interviewHistory.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <p className="font-medium">Question {index + 1}:</p>
                      <p className="mb-2">{item.question}</p>
                      <p className="font-medium">Your Answer:</p>
                      <p>{item.answer}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Time taken: {Math.round(item.duration / 1000)} seconds
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Evaluating your interview...</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => {
            setCurrentStep('prep')
            setInterviewHistory([])
            setEvaluation(null)
            setQuestion('')
            setAnswer('')
            setIsInterviewerTurn(true)
          }}
          className="w-full"
        >
          Start New Interview
        </Button>
      </CardFooter>
    </Card>
  )

  // Start the interview when entering the interview step
  useEffect(() => {
    if (currentStep === 'interview' && interviewHistory.length === 0) {
      handleInterviewerThinking()
    }
  }, [currentStep])

  // Main render function
  return (
    <ToastProvider>
      <div className="container mx-auto p-4 min-h-screen flex items-center justify-center">
        {currentStep === 'prep' && renderPreparationStep()}
        {currentStep === 'interview' && renderInterviewStep()}
        {currentStep === 'complete' && renderCompletionStep()}
      </div>
      <ToastViewport />
    </ToastProvider>
  )
}