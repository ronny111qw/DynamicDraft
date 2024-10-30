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

  constructor() {
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      this.voices = [];
      
      // Initialize speech recognition
      if ('webkitSpeechRecognition' in window) {
        this.recognition = new (window.webkitSpeechRecognition as any)();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
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

  startListening = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject('Speech recognition not supported');
        return;
      }

      let finalTranscript = '';

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update the answer in real-time as the user speaks
        if (interimTranscript) {
          // You'll need to pass a callback function to update the UI
          this.onInterimTranscript?.(interimTranscript);
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        reject(event.error);
      };

      this.recognition.onend = () => {
        resolve(finalTranscript);
      };

      this.recognition.start();
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
  onStopListening 
}: {
  answer: string;
  setAnswer: (text: string) => void;
  isListening: boolean;
  onSubmit: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
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
    if (!speechHandler.current) return;
    
    setIsListening(true);
    try {
      const transcript = await speechHandler.current.startListening();
      if (transcript) {
        setAnswer(prev => prev + ' ' + transcript);
      }
    } catch (error) {
      console.error('Speech recognition error:', error);
      // Show error toast or message to user
    }
  };

  const stopListening = () => {
    if (!speechHandler.current) return;
    
    speechHandler.current.stopListening();
    setIsListening(false);
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
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>AI Mock Interview</span>
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">Beta</span>
        </CardTitle>
        <CardDescription>Practice your interview skills with our AI interviewer</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Interview Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Interview Type</label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={interviewType === 'behavioral' ? 'default' : 'outline'}
                onClick={() => setInterviewType('behavioral')}
                className="w-full"
              >
                <UserIcon className="w-4 h-4 mr-2" />
                Behavioral
              </Button>
              <Button
                variant={interviewType === 'technical' ? 'default' : 'outline'}
                onClick={() => setInterviewType('technical')}
                className="w-full"
              >
                <CodeIcon className="w-4 h-4 mr-2" />
                Technical
              </Button>
            </div>
          </div>

          {/* Experience Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Experience Level</label>
            <Select 
              onValueChange={(value: 'entry' | 'mid' | 'senior') => 
                setSettings(prev => ({ ...prev, difficulty: value }))}
              value={settings.difficulty}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your experience level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                <SelectItem value="mid">Mid Level (2-5 years)</SelectItem>
                <SelectItem value="senior">Senior Level (5+ years)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Role Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Role</label>
            <input
              type="text"
              placeholder="e.g., Full Stack Developer"
              className="w-full p-2 border rounded-md"
              value={settings.role}
              onChange={e => setSettings(prev => ({ ...prev, role: e.target.value }))}
            />
          </div>

          {/* Audio Test Section */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Audio Settings</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              >
                {isAudioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={testAudio}
              disabled={isSpeaking || !isAudioEnabled}
              className="w-full"
            >
              {isSpeaking ? 
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 
                <Volume2 className="w-4 h-4 mr-2" />
              }
              Test Audio
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button 
          onClick={() => setCurrentStep('interview')}
          className="w-full"
          disabled={!settings.role || isSpeaking}
        >
          Start Interview
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
        <p className="text-xs text-gray-500 text-center">
          Interview will consist of {settings.questionCount} questions • Approximately {settings.duration} minutes
        </p>
      </CardFooter>
    </Card>
  )

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