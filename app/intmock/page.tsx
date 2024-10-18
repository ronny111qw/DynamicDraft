'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mic, MicOff, Camera, CameraOff, ChevronRight } from "lucide-react"
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import dynamic from 'next/dynamic'
import { GoogleGenerativeAI } from '@google/generative-ai'

// AI Interviewer Component
interface AiInterviewerProps {
  isInterviewerTurn: boolean
}

export const AiInterviewer: React.FC<AiInterviewerProps> = ({ isInterviewerTurn }) => {
  return (
    <div className="relative w-48 h-48">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 200 200"
        className="w-full h-full"
        style={{
          filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
        }}
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
                dur="1s"
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
          <use href="#neutral-face" opacity="1">
            <animate 
              attributeName="opacity"
              dur="4s"
              repeatCount="indefinite"
              values="1;0;1"
              begin="0s"
            />
          </use>
          <use href="#speaking-face" opacity="0">
            <animate 
              attributeName="opacity"
              dur="4s"
              repeatCount="indefinite"
              values="0;1;0"
              begin="0s"
            />
          </use>
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
}

// Dynamic import for AceEditor
const AceEditor = dynamic(
  async () => {
    const ace = await import('react-ace')
    await import('ace-builds/src-noconflict/mode-javascript')
    await import('ace-builds/src-noconflict/mode-python')
    await import('ace-builds/src-noconflict/theme-monokai')
    return ace
  },
  { ssr: false }
)

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY_INTRV_QUES!)

// Types for TypeScript support
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

export default function MockInterviewPlatform() {
  // State management
  const [currentStep, setCurrentStep] = useState('prep')
  const [interviewType, setInterviewType] = useState('behavioral')
  const [programmingLanguage, setProgrammingLanguage] = useState('javascript')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [codeAnswer, setCodeAnswer] = useState('')
  const [isInterviewerTurn, setIsInterviewerTurn] = useState(true)
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [thinkingProgress, setThinkingProgress] = useState(0)
  const [interviewHistory, setInterviewHistory] = useState<InterviewHistoryItem[]>([])
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [startTime, setStartTime] = useState<number>(0)
  
  const videoRef = useRef<HTMLVideoElement>(null)

  // Question generation using Gemini AI
  // ... (previous imports and AI Interviewer component remain the same)

// Question generation using Gemini AI
const generateQuestion = async () => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" })
  
  const previousQuestions = interviewHistory.map(item => item.question).join('\n')
  const prompt = `Generate a challenging ${interviewType} interview question for a software engineering position.
  ${previousQuestions ? `Previously asked questions (don't repeat these):\n${previousQuestions}` : ''}
  ${interviewType === 'technical' ? `The candidate is using ${programmingLanguage}` : ''}
  
  Rules for question formatting:
  1. Use clear, natural language without special characters or markdown
  2. Include proper spacing and paragraphs
  3. If providing code examples, format them naturally within the text
  4. For technical questions, clearly separate the problem statement from examples
  5. For behavioral questions, make them specific and contextual
  
  Example format for technical:
  "Write a function that finds the longest palindromic substring in a given string.
  
  Input: A string containing lowercase letters
  Output: The longest palindromic substring
  
  Example:
  Input: 'babad'
  Output: 'bab' or 'aba'
  
  Please explain your approach before coding."
  
  Example format for behavioral:
  "Tell me about a time when you had to deal with a significant technical debt in your project. What was the situation, how did you approach it, and what was the outcome?"
  
  Generate a single, well-formatted question following these guidelines.`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const formattedQuestion = response.text()
      .replace(/\*\*/g, '')
      .replace(/```/g, '')
      .trim()
    
    return formattedQuestion
  } catch (error) {
    console.error('Error generating question:', error)
    showNotification('Failed to generate question. Using fallback question.')
    return interviewType === 'behavioral' 
      ? "Tell me about a challenging project you worked on. What was your role, what challenges did you face, and how did you overcome them?"
      : "Write a function that reverses a string without using built-in reverse methods. Please explain your approach before implementing the solution."
  }
}

// Interview evaluation using Gemini AI
const evaluateInterview = async () => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" })
  
  const interviewDetails = interviewHistory.map(item => 
    `Question:\n${item.question}\n\nAnswer:\n${item.answer}\n\nTime taken: ${Math.round(item.duration / 1000)} seconds`
  ).join('\n\n---\n\n')

  const prompt = `You are an experienced technical interviewer. Please evaluate this ${interviewType} interview for a software engineering position.

  Interview Details:
  ${interviewDetails}

  Provide a thorough evaluation following these guidelines:
  1. Consider technical accuracy, problem-solving approach, and communication clarity
  2. For behavioral questions, evaluate using the STAR method
  3. Be specific and constructive in feedback
  4. Provide actionable improvements
  5. Consider both technical skills and soft skills

  Format your response as valid JSON with the following structure:
  {
    "strengths": ["strength1", "strength2", "strength3"],
    "improvements": ["improvement1", "improvement2", "improvement3"],
    "overallScore": <number between 1-5>,
    "feedback": "<detailed paragraph of constructive feedback>"
  }

  Ensure the feedback is specific, actionable, and constructive.`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    let evaluation: Evaluation
    
    try {
      evaluation = JSON.parse(response.text())
    } catch (parseError) {
      // Fallback if JSON parsing fails
      evaluation = {
        strengths: ["Clear communication", "Structured approach", "Good problem-solving skills"],
        improvements: ["Consider edge cases", "Explain reasoning more", "Practice time management"],
        overallScore: 3,
        feedback: "The candidate showed good potential but needs more practice with technical implementation details."
      }
    }
    
    // Validate evaluation structure and provide defaults if needed
    evaluation = {
      strengths: evaluation.strengths?.slice(0, 3) || ["Clear communication", "Good approach", "Technical knowledge"],
      improvements: evaluation.improvements?.slice(0, 3) || ["Practice more", "Consider edge cases", "Improve efficiency"],
      overallScore: Math.min(5, Math.max(1, evaluation.overallScore || 3)),
      feedback: evaluation.feedback || "The interview showed both strengths and areas for improvement."
    }
    
    setEvaluation(evaluation)
  } catch (error) {
    console.error('Error evaluating interview:', error)
    showNotification('Failed to generate evaluation. Using default evaluation.')
    
    // Provide a default evaluation
    setEvaluation({
      strengths: [
        "Demonstrated problem-solving ability",
        "Clear communication style",
        "Structured approach to questions"
      ],
      improvements: [
        "Consider practicing more complex scenarios",
        "Work on time management during responses",
        "Expand on technical explanations"
      ],
      overallScore: 3,
      feedback: "The candidate showed good potential with room for growth. The responses were structured and clear, though more depth could be added in technical explanations."
    })
  }
}

// ... (rest of the component remains the same)

  // Video stream handling
  const startVideoStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: videoEnabled, 
        audio: audioEnabled 
      })
      setVideoStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Error accessing media devices:', error)
      showNotification('Failed to access camera or microphone')
    }
  }

  const stopVideoStream = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop())
      setVideoStream(null)
    }
  }

  // Interview flow handlers
  const handleInterviewerThinking = async () => {
    setIsInterviewerTurn(true)
    setThinkingProgress(0)
    
    const thinkingInterval = setInterval(() => {
      setThinkingProgress(prev => Math.min(prev + 10, 90))
    }, 200)

    try {
      const newQuestion = await generateQuestion()
      clearInterval(thinkingInterval)
      setThinkingProgress(100)
      
      setTimeout(() => {
        setQuestion(newQuestion)
        setIsInterviewerTurn(false)
        setThinkingProgress(0)
        setStartTime(Date.now())
      }, 500)
    } catch (error) {
      clearInterval(thinkingInterval)
      showNotification('Failed to generate question')
    }
  }

  const handleSubmitAnswer = () => {
    const currentAnswer = interviewType === 'behavioral' ? answer : codeAnswer
    const duration = Date.now() - startTime

    const newHistoryItem: InterviewHistoryItem = {
      question,
      answer: currentAnswer,
      timestamp: Date.now(),
      duration
    }
    
    setInterviewHistory([...interviewHistory, newHistoryItem])
    setAnswer('')
    setCodeAnswer('')
    
    if (interviewHistory.length < 4) {
      handleInterviewerThinking()
    } else {
      setCurrentStep('complete')
      evaluateInterview()
    }
  }

  // Utility functions
  const showNotification = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  // Effect hooks
  useEffect(() => {
    if (currentStep === 'interview') {
      startVideoStream()
      handleInterviewerThinking()
    } else {
      stopVideoStream()
    }
    return () => stopVideoStream()
  }, [currentStep])

  useEffect(() => {
    if (videoStream) {
      videoStream.getVideoTracks().forEach(track => {
        track.enabled = videoEnabled
      })
      videoStream.getAudioTracks().forEach(track => {
        track.enabled = audioEnabled
      })
    }
  }, [videoEnabled, audioEnabled, videoStream])

  // Step rendering functions
  const renderPreparationStep = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Prepare for Your Interview</CardTitle>
        <CardDescription>Choose your interview type and get ready!</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Select onValueChange={setInterviewType} value={interviewType}>
            <SelectTrigger>
              <SelectValue placeholder="Select interview type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="behavioral">Behavioral</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
            </SelectContent>
          </Select>

          {interviewType === 'technical' && (
            <Select onValueChange={setProgrammingLanguage} value={programmingLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Select programming language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Alert>
            <AlertDescription>
              {interviewType === 'behavioral' 
                ? "Use the STAR method: Situation, Task, Action, Result"
                : "Focus on explaining your thought process and consider optimization"}
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={() => setCurrentStep('interview')} className="w-full">
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
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              className="w-full h-auto rounded-lg bg-gray-100" 
            />
            <div className="absolute bottom-2 right-2 flex space-x-2">
              <Button variant="secondary" size="icon" onClick={() => setAudioEnabled(!audioEnabled)}>
                {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
              <Button variant="secondary" size="icon" onClick={() => setVideoEnabled(!videoEnabled)}>
                {videoEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center bg-gray-100 rounded-lg p-4">
            <AiInterviewer isInterviewerTurn={isInterviewerTurn} />
            <Progress value={(interviewHistory.length / 5) * 100} className="w-full mt-4" />
            <p className="text-sm text-gray-600 mt-2">Progress: {interviewHistory.length}/5 questions</p>
            </div>
        </div>

        <div className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <p className="font-semibold">{question}</p>
              {isInterviewerTurn && (
                <div className="flex items-center mt-2">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <Progress value={thinkingProgress} className="w-full" />
                </div>
              )}
            </div>
          </div>

          {interviewType === 'behavioral' ? (
            <Textarea
              placeholder="Type your answer here..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full min-h-[200px]"
              disabled={isInterviewerTurn}
            />
          ) : (
            <AceEditor
              mode={programmingLanguage}
              theme="monokai"
              onChange={setCodeAnswer}
              value={codeAnswer}
              name="code_editor"
              editorProps={{ $blockScrolling: true }}
              setOptions={{
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true,
                showLineNumbers: true,
                tabSize: 2,
              }}
              style={{ width: '100%', height: '300px', borderRadius: '0.5rem' }}
            />
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep('complete')}>
          End Interview
        </Button>
        <Button 
          onClick={handleSubmitAnswer} 
          disabled={isInterviewerTurn || (!answer && !codeAnswer)}
        >
          Submit Answer
        </Button>
      </CardFooter>
    </Card>
  )

  const renderCompletionStep = () => (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Interview Complete</CardTitle>
        <CardDescription>Here's your performance evaluation</CardDescription>
      </CardHeader>
      <CardContent>
        {evaluation ? (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Overall Score: {evaluation.overallScore}/5</h3>
              <Progress value={evaluation.overallScore * 20} className="mb-4" />
              <p className="text-gray-700">{evaluation.feedback}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5">
                    {evaluation.strengths.map((strength, index) => (
                      <li key={index} className="text-green-600">{strength}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Areas for Improvement</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5">
                    {evaluation.improvements.map((improvement, index) => (
                      <li key={index} className="text-amber-600">{improvement}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Interview History</h3>
              {interviewHistory.map((item, index) => (
                <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium">Q: {item.question}</p>
                  <p className="mt-2">A: {item.answer}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Time taken: {Math.round(item.duration / 1000)} seconds
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2">Generating evaluation...</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <div className="w-full space-y-4">
          <Button 
            onClick={() => {
              setCurrentStep('prep')
              setInterviewHistory([])
              setEvaluation(null)
              setQuestion('')
              setAnswer('')
              setCodeAnswer('')
            }} 
            className="w-full"
          >
            Start New Interview
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              const data = {
                type: interviewType,
                history: interviewHistory,
                evaluation: evaluation
              }
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `interview-results-${new Date().toISOString().split('T')[0]}.json`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }}
            className="w-full"
          >
            Export Results
          </Button>
        </div>
      </CardFooter>
    </Card>
  )

  return (
    <div className="container mx-auto py-8 px-4">
      <ToastProvider>
        {showToast && (
          <Toast>
            <p>{toastMessage}</p>
          </Toast>
        )}
        <ToastViewport />
      </ToastProvider>

      {currentStep === 'prep' && renderPreparationStep()}
      {currentStep === 'interview' && renderInterviewStep()}
      {currentStep === 'complete' && renderCompletionStep()}
    </div>
  )
} 