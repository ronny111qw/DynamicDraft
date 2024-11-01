'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mic, MicOff, Volume2, VolumeX, ChevronRight, Clock, UserIcon, CodeIcon } from "lucide-react"
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast"
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

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
  synthesis: SpeechSynthesis;
  recognition: SpeechRecognition | null;
  voices: SpeechSynthesisVoice[];
  onInterimTranscript?: (text: string, confidence?: number) => void;
  private transcriptBuffer: string[] = [];
  private isProcessing: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      this.voices = [];
      
      if ('webkitSpeechRecognition' in window) {
        this.recognition = new (window.webkitSpeechRecognition as any)();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 3; // Get multiple alternatives
        // Increase stability
        this.recognition.interimResults = true;
      } else {
        this.recognition = null;
        console.warn('Speech recognition not supported');
      }

      // Initialize voices
      if (this.synthesis.getVoices().length > 0) {
        this.voices = this.synthesis.getVoices();
      } else {
        this.synthesis.addEventListener('voiceschanged', () => {
          this.voices = this.synthesis.getVoices();
        });
      }
    }
  }

  private cleanTranscript(text: string): string {
    return text
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove duplicate adjacent words
      .replace(/\b(\w+)\s+\1\b/gi, '$1')
      // Capitalize first letter of sentences
      .replace(/(^\w|\.\s+\w)/g, letter => letter.toUpperCase())
      // Add proper spacing after punctuation
      .replace(/([.!?])\s*(\w)/g, '$1 $2')
      // Remove extra periods
      .replace(/\.+/g, '.')
      .trim();
  }

  startListening = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject('Speech recognition not supported');
        return;
      }

      this.transcriptBuffer = [];
      this.isProcessing = false;

      this.recognition.onstart = () => {
        console.log('Speech recognition started');
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        // Process results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            // Get the most confident result
            let bestTranscript = transcript;
            let bestConfidence = result[0].confidence;

            // Check alternatives if available
            for (let j = 1; j < result.length; j++) {
              if (result[j].confidence > bestConfidence) {
                bestTranscript = result[j].transcript;
                bestConfidence = result[j].confidence;
              }
            }

            finalTranscript = this.cleanTranscript(bestTranscript);
            
            // Add to buffer if it's not a duplicate
            if (!this.transcriptBuffer.includes(finalTranscript)) {
              this.transcriptBuffer.push(finalTranscript);
            }
          } else {
            interimTranscript = transcript;
          }
        }

        // Update the UI with current state
        if (this.onInterimTranscript) {
          const currentText = this.cleanTranscript(
            this.transcriptBuffer.join(' ') + 
            (interimTranscript ? ' ' + interimTranscript : '')
          );
          
          if (!this.isProcessing) {
            this.isProcessing = true;
            setTimeout(() => {
              this.onInterimTranscript?.(currentText);
              this.isProcessing = false;
            }, 100); // Debounce updates
          }
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        reject(event.error);
      };

      this.recognition.onend = () => {
        const finalText = this.cleanTranscript(this.transcriptBuffer.join(' '));
        resolve(finalText);
      };

      try {
        this.recognition.start();
      } catch (error) {
        reject('Failed to start speech recognition');
      }
    });
  };

  stopListening = () => {
    if (this.recognition) {
      this.recognition.stop();
    }
  };

  speak = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice properties
      const voices = this.synthesis.getVoices();
      const englishVoices = voices.filter(voice => voice.lang.startsWith('en-'));
      utterance.voice = englishVoices[0] || voices[0];
      
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Debug logging
      console.log('Speaking:', text);
      console.log('Selected voice:', utterance.voice?.name);

      utterance.onend = () => {
        console.log('Speech ended');
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('Speech error:', event);
        resolve();
      };

      this.synthesis.speak(utterance);
    });
  }
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY_INTRV_QUES!)

// Add this new component for the interview guide
const InterviewGuide = () => (
  <div className="bg-blue-50 p-4 rounded-lg mb-6">
    <h3 className="font-semibold text-blue-800 mb-2">Quick Guide</h3>
    <ul className="space-y-2 text-sm text-blue-700">
      <li>• Speak clearly and at a normal pace</li>
      <li>• Take a moment to think before answering</li>
      <li>• Keep your answers between 1-3 minutes</li>
      <li>• Use the STAR method for behavioral questions</li>
    </ul>
  </div>
)

// Add this new component for the answer input
const AnswerInput = ({ 
  answer, 
  setAnswer, 
  isListening, 
  onSubmit, 
  onStartListening, 
  onStopListening,
  confidence 
}: {
  answer: string;
  setAnswer: (text: string) => void;
  isListening: boolean;
  onSubmit: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  confidence: number;
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-medium">Your Response</span>
        {isListening && (
          <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full animate-pulse">
            Recording... Speak clearly
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={isListening ? "destructive" : "outline"}
          onClick={isListening ? onStopListening : onStartListening}
        >
          {isListening ? (
            <>
              <MicOff className="h-4 w-4 mr-2" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-2" />
              Start Recording
            </>
          )}
        </Button>
      </div>
    </div>
    
    <textarea
      value={answer}
      onChange={(e) => setAnswer(e.target.value)}
      placeholder={isListening ? "Speaking... Your words will appear here" : "Type your answer or click 'Start Recording' to speak"}
      className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      readOnly={isListening}
    />
    
    <div className="flex justify-between items-center">
      <div className="text-sm text-gray-500">
        {answer.length > 0 && `${answer.length} characters`}
      </div>
      <div className="flex gap-2">
        <Button 
          variant="outline"
          onClick={() => setAnswer('')}
          disabled={answer.length === 0}
        >
          Clear
        </Button>
        <Button 
          onClick={onSubmit}
          disabled={answer.trim().length === 0}
        >
          Submit Answer
        </Button>
      </div>
    </div>
  </div>
);

// Add this component
const RecordingIndicator = ({ confidence }: { confidence: number }) => (
  <div className="flex items-center gap-2">
    <span className="flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
    </span>
    <span className="text-xs text-gray-600">
      Recognition Quality: {Math.round(confidence * 100)}%
    </span>
  </div>
);

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

  // Add these states to your component
  const [recognitionConfidence, setRecognitionConfidence] = useState<number>(0)
  const [transcriptBuffer, setTranscriptBuffer] = useState<string[]>([])

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
    if (!speechHandler.current) {
      console.error('Speech handler not initialized');
      return;
    }

    setIsListening(true);
    setAnswer(''); // Clear previous answer
    setTranscriptBuffer([]); // Clear buffer

    try {
      speechHandler.current.onInterimTranscript = (text: string) => {
        setAnswer(text);
      };

      const finalTranscript = await speechHandler.current.startListening();
      setAnswer(finalTranscript);
    } catch (error) {
      console.error('Speech recognition error:', error);
      // Show error message to user
    } finally {
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (!speechHandler.current) return;
    
    speechHandler.current.stopListening();
    setIsListening(false);
    
    // Clean up the final answer
    setAnswer(prev => {
      const cleaned = prev
        .replace(/\s+/g, ' ')
        .replace(/(\w)\s+\1/gi, '$1')
        .trim();
      return cleaned;
    });
  };

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Interview Setup Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="text-2xl flex items-center gap-3">
            <UserIcon className="w-6 h-6" />
            AI Mock Interview
            <Badge variant="secondary" className="bg-white/20">Beta</Badge>
          </CardTitle>
          <CardDescription className="text-gray-100">
            Get ready for your next interview with our AI-powered practice platform
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          {/* Progress Steps */}
          <div className="flex justify-between relative">
            {['Setup', 'Practice', 'Feedback'].map((step, index) => (
              <div key={step} className="flex flex-col items-center relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center
                  ${index === 0 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  {index + 1}
                </div>
                <span className="text-sm mt-2">{step}</span>
              </div>
            ))}
            <div className="absolute top-4 left-0 w-full h-[2px] bg-gray-200 -z-0" />
          </div>

          {/* Interview Type Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Choose Interview Type</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  type: 'behavioral',
                  icon: UserIcon,
                  title: 'Behavioral Interview',
                  description: 'Focus on past experiences and soft skills'
                },
                {
                  type: 'technical',
                  icon: CodeIcon,
                  title: 'Technical Interview',
                  description: 'Programming and problem-solving questions'
                }
              ].map((option) => (
                <button
                  key={option.type}
                  onClick={() => setInterviewType(option.type)}
                  className={`p-4 rounded-lg border-2 transition-all
                    ${interviewType === option.type 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-200'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <option.icon className={`w-5 h-5 
                      ${interviewType === option.type ? 'text-blue-600' : 'text-gray-500'}`} 
                    />
                    <span className="font-medium">{option.title}</span>
                  </div>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Experience Level */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Experience Level</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'entry', label: 'Entry Level', years: '0-2 years' },
                { value: 'mid', label: 'Mid Level', years: '2-5 years' },
                { value: 'senior', label: 'Senior Level', years: '5+ years' }
              ].map((level) => (
                <button
                  key={level.value}
                  onClick={() => setSettings(prev => ({ ...prev, difficulty: level.value }))}
                  className={`p-4 rounded-lg border text-left transition-all
                    ${settings.difficulty === level.value 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-200'}`}
                >
                  <div className="font-medium mb-1">{level.label}</div>
                  <div className="text-sm text-gray-600">{level.years}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Audio Settings */}
          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Audio Settings</h3>
              <Switch
                checked={isAudioEnabled}
                onCheckedChange={setIsAudioEnabled}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={testAudio}
                disabled={!isAudioEnabled || isSpeaking}
                className="w-full relative overflow-hidden"
              >
                {isSpeaking && (
                  <div className="absolute inset-0 bg-blue-100 animate-progress" />
                )}
                <div className="flex items-center gap-2">
                  {isSpeaking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing Audio...
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      Test Audio
                    </>
                  )}
                </div>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowMicTest(true)}
                disabled={!isAudioEnabled}
                className="w-full"
              >
                <Mic className="w-4 h-4 mr-2" />
                Test Microphone
              </Button>
            </div>

            {!isAudioEnabled && (
              <Alert variant="warning" className="mt-4">
                <AlertDescription>
                  Audio is currently disabled. Enable audio for the full interview experience.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>

        <CardFooter className="border-t bg-gray-50 p-6 rounded-b-lg">
          <div className="w-full space-y-4">
            <Button 
              onClick={() => setCurrentStep('interview')}
              disabled={!settings.role || isSpeaking}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Start Interview
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-center text-sm text-gray-600">
              {settings.questionCount} questions • Approximately {settings.duration} minutes
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );

  // Update the interview step UI
  const renderInterviewStep = () => (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Interview Guide */}
      <InterviewGuide />
      
      {/* Main Interview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Mock Interview</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                Question {interviewHistory.length + 1}/{settings.questionCount}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              >
                {isAudioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Progress 
            value={(interviewHistory.length / settings.questionCount) * 100} 
            className="w-full mt-2"
          />
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col items-center space-y-6">
            {/* AI Interviewer */}
            <div className="relative">
              <AiInterviewer isInterviewerTurn={isInterviewerTurn} isSpeaking={isSpeaking} />
              {isSpeaking && (
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    Speaking...
                  </span>
                </div>
              )}
            </div>
            
            {/* Question Display */}
            <div className="w-full">
              <div className={`p-4 rounded-lg transition-colors ${
                isInterviewerTurn ? 'bg-gray-50' : 'bg-blue-50'
              }`}>
                {isInterviewerTurn ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span className="text-gray-500">Thinking of next question...</span>
                  </div>
                ) : (
                  <>
                    <h3 className="font-medium mb-2">Question:</h3>
                    <p className="text-lg">{question}</p>
                    {interviewType === 'behavioral' && (
                      <div className="mt-4 text-sm text-gray-600">
                        <p>💡 Remember to use the STAR method:</p>
                        <ul className="list-disc ml-5 mt-1">
                          <li>Situation: Set the context</li>
                          <li>Task: Describe the challenge</li>
                          <li>Action: Explain what you did</li>
                          <li>Result: Share the outcome</li>
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Answer Section */}
              {!isInterviewerTurn && (
                <div className="mt-4">
                  <AnswerInput
                    answer={answer}
                    setAnswer={setAnswer}
                    isListening={isListening}
                    onSubmit={() => handleSubmitAnswer(answer)}
                    onStartListening={startListening}
                    onStopListening={stopListening}
                    confidence={recognitionConfidence}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interview History Card */}
      {interviewHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Previous Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {interviewHistory.map((item, index) => (
                <div key={index} className="text-sm">
                  <p className="font-medium">Q{index + 1}: {item.question}</p>
                  <p className="text-gray-600 mt-1">{item.answer}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Duration: {Math.round(item.duration / 1000)}s
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
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

  // Add debug button to test audio
  const testAudio = async () => {
    try {
      if (!speechHandler.current) {
        speechHandler.current = new SpeechHandler();
      }
      setIsSpeaking(true);
      await speechHandler.current.speak('This is a test message. Can you hear me?');
      setIsSpeaking(false);
    } catch (error) {
      console.error('Audio test failed:', error);
    }
  };

  // Add this to your preparation step UI
  const renderAudioTest = () => (
    <div className="mt-4">
      <Button 
        onClick={testAudio}
        disabled={isSpeaking}
      >
        Test Audio {isSpeaking && '(Speaking...)'}
      </Button>
      <p className="text-sm text-gray-500 mt-2">
        Click to test if audio is working. Make sure your device volume is turned on.
      </p>
    </div>
  );

  // Add these checks before trying to speak
  const handleInterviewerResponse = async () => {
    if (!speechHandler.current) {
      console.log('Initializing speech handler');
      speechHandler.current = new SpeechHandler();
    }

    if (!isAudioEnabled) {
      console.log('Audio is disabled');
      return;
    }

    try {
      setIsSpeaking(true);
      await speechHandler.current.speak(question);
      setIsSpeaking(false);
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Space bar to start/stop recording
      if (e.code === 'Space' && e.ctrlKey) {
        e.preventDefault();
        if (isListening) {
          stopListening();
        } else {
          startListening();
        }
      }
      
      // Enter to submit
      if (e.code === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        if (answer.trim()) {
          handleSubmitAnswer(answer);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isListening, answer]);

  const handleRecognitionError = (error: string) => {
    setIsListening(false);
    
    switch (error) {
      case 'not-allowed':
        return "Please enable microphone access to use voice input.";
      case 'no-speech':
        return "No speech was detected. Please try again.";
      case 'network':
        return "Network error occurred. Please check your connection.";
      default:
        return "An error occurred with speech recognition. Please try again.";
    }
  };

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