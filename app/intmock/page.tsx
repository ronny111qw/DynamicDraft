'use client'
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Mic, MicOff, Volume2, VolumeX, ChevronRight, Clock, UserIcon, CodeIcon, SkipForward, CheckIcon, ListIcon } from "lucide-react"
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast"
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Editor } from '@monaco-editor/react'
import { Switch } from "@/components/ui/switch"
import { ClockIcon } from "lucide-react"
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
// Add these new imports
import Link from 'next/link'
import Image from 'next/image'
import { Menu, Transition } from '@headlessui/react'
import { Sparkles, UserCircle } from 'lucide-react'
import { signOut } from 'next-auth/react'

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

interface AnswerInputProps {
  answer: string;
  setAnswer: (answer: string) => void;
  isListening: boolean;
  onSubmit: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  confidence: number;
  interviewType: 'behavioral' | 'technical-theory' | 'technical-coding';
  programmingLanguage: string;
  setProgrammingLanguage: (language: string) => void;
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
const AnswerInput: React.FC<AnswerInputProps> = React.memo(({
  answer,
  setAnswer,
  isListening,
  onSubmit,
  onStartListening,
  onStopListening,
  confidence,
  interviewType,
  programmingLanguage,
  setProgrammingLanguage
}) => {
  // Define available languages
  const programmingLanguages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'typescript', label: 'TypeScript' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Your Response</span>
          {isListening && interviewType !== 'technical-coding' && (
            <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full animate-pulse">
              Recording... Speak clearly
            </span>
          )}
        </div>

        {/* Voice controls for non-coding questions */}
        {interviewType !== 'technical-coding' && (
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
        )}
      </div>

      {/* Code Editor with Language Selector */}
      {interviewType === 'technical-coding' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 bg-gray-800 rounded-t-lg border-b border-gray-700">
            <Select
              value={programmingLanguage}
              onValueChange={setProgrammingLanguage}
            >
              <SelectTrigger className="w-40 h-8 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {programmingLanguages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Editor
            height="300px"
            language={programmingLanguage}
            theme="vs-dark"
            value={answer}
            onChange={(value) => setAnswer(value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              ...getLanguageSpecificSettings(programmingLanguage)
            }}
          />
        </div>
      ) : (
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={isListening ? "Speaking... Your words will appear here" : "Type your answer or click 'Start Recording' to speak"}
          className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          readOnly={isListening}
        />
      )}

      {/* Submit Controls */}
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
});

// Add language-specific editor settings
const getLanguageSpecificSettings = (language: string) => {
  const commonSettings = {
    formatOnPaste: true,
    formatOnType: true,
  };

  switch (language) {
    case 'python':
      return {
        ...commonSettings,
        tabSize: 4,
        insertSpaces: true,
      };
    case 'java':
    case 'cpp':
    case 'csharp':
      return {
        ...commonSettings,
        tabSize: 4,
        insertSpaces: true,
        bracketPairColorization: true,
      };
    default: // javascript, typescript
      return {
        ...commonSettings,
        tabSize: 2,
        insertSpaces: true,
        bracketPairColorization: true,
      };
  }
};

export default function MockInterviewPlatform() {
  // State management
  const [currentStep, setCurrentStep] = useState<'prep' | 'interview' | 'complete'>('prep')
  const [interviewType, setInterviewType] = useState<'behavioral' | 'technical-theory' | 'technical-coding'>('behavioral')
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
  const [programmingLanguage, setProgrammingLanguage] = useState('javascript')
  const programmingLanguages = [
    {value: 'javascript', label: 'JavaScript'},
    {value: 'python', label: 'Python'},
    {value: 'java', label: 'Java'},
    {value: 'csharp', label: 'C#'},
    {value: 'typescript', label: 'TypeScript'},
  ]
  
  

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
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    let prompt = '';
    
    if (interviewType === 'technical-coding') {
      prompt = `Generate a ${settings.difficulty} level coding question for a ${settings.role} position.

      Previous questions: ${interviewHistory.map(item => item.question).join('; ')}

      ${settings.difficulty === 'entry' ? 
        'Focus on: Arrays, Strings, Basic algorithms, Simple data structures' :
        settings.difficulty === 'mid' ? 
        'Focus on: Data structures, Algorithms, Optimization problems' :
        'Focus on: Complex algorithms, System design, Scalability challenges'}

      Format the response exactly as:
      Problem:
      [clear problem statement]

      Examples:
      Input: [example1]
      Output: [output1]

      Constraints:
      - [constraint1]
      - [constraint2]

      Expected Complexity: Time O(n), Space O(n)`;

    } else if (interviewType === 'technical-theory') {
      prompt = `Generate a ${settings.difficulty} level technical theory question for a ${settings.role} position.

      Previous questions: ${interviewHistory.map(item => item.question).join('; ')}

      ${settings.difficulty === 'entry' ? 
        'Focus on: Basic programming concepts, Data types, OOP basics, Simple architecture' :
        settings.difficulty === 'mid' ? 
        'Focus on: Design patterns, System design, Performance, Testing' :
        'Focus on: Advanced architecture, Scalability, Technical leadership'}

      Requirements:
      1. Single, clear question
      2. Focus on one concept
      3. Appropriate for ${settings.difficulty} level
      4. No markdown or special formatting

      Example format:
      What is [concept]? Explain how it works in [specific scenario].`;

    } else {
      // Behavioral questions
      prompt = `Generate a ${settings.difficulty} level behavioral question for a ${settings.role} position.

      Previous questions: ${interviewHistory.map(item => item.question).join('; ')}

      ${settings.difficulty === 'entry' ? 
        'Focus on: Team collaboration, Learning experiences, Basic problem-solving' :
        settings.difficulty === 'mid' ? 
        'Focus on: Project leadership, Technical decisions, Mentoring' :
        'Focus on: Strategic thinking, Team leadership, Complex problem-solving'}

      Requirements:
      1. Single, clear scenario-based question
      2. Focus on real workplace situations
      3. No hypotheticals
      4. No markdown or special formatting

      Example format:
      Tell me about a time when [specific situation]. What did you do and what was the outcome?`;
    }

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text()
        .trim()
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`/g, '')
        .replace(/#{1,6}\s/g, '')
        .replace(/\n{3,}/g, '\n\n');
    } catch (error) {
      console.error('Error generating question:', error);
      return getBackupQuestion(interviewType, settings.difficulty);
    }
  };

  // Backup questions for all types
  const getBackupQuestion = (type: string, difficulty: string) => {
    const questions = {
      'technical-coding': {
        entry: `Problem:
Find the first non-repeating character in a string.

Examples:
Input: "leetcode"
Output: 0 (index of 'l')

Constraints:
- String length <= 10^5
- Contains only lowercase letters

Expected Complexity: Time O(n), Space O(1)`,
        mid: `Problem:
Implement a LRU (Least Recently Used) Cache.

Examples:
Input: LRUCache(2), put(1,1), put(2,2), get(1)
Output: 1

Constraints:
- 1 <= capacity <= 3000
- Operations: get and put

Expected Complexity: Time O(1), Space O(n)`,
        senior: `Problem:
Design a time-based key-value store.

Examples:
Input: set("foo","bar",1), get("foo",1)
Output: "bar"

Constraints:
- All timestamps are monotonically increasing
- 1 <= key.length, value.length <= 100

Expected Complexity: Time O(log n), Space O(n)`
      },
      'technical-theory': {
        entry: "What are the main differences between var, let, and const in JavaScript? Provide examples of when to use each.",
        mid: "Explain the concept of dependency injection and its benefits in software development.",
        senior: "Discuss the trade-offs between monolithic and microservices architectures."
      },
      'behavioral': {
        entry: "Tell me about a time when you had to learn a new technology quickly. How did you approach it?",
        mid: "Describe a situation where you had to resolve a conflict within your team. What was your approach?",
        senior: "Tell me about a time when you had to make a difficult technical decision that impacted the entire team."
      }
    };

    return questions[type]?.[difficulty] || questions[type]?.['mid'] || "Question generation failed. Please try again.";
  };

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
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    let prompt = '';
  
    const validateAnswer = (answer: string): boolean => {
      // Check if answer is just random keystrokes or too short
      if (answer.length < 10 || /^[a-z]{1,5}$/i.test(answer)) {
        return false;
      }
      return true;
    };
  
    const validAnswers = interviewHistory.filter(item => validateAnswer(item.answer));
    const invalidAnswers = interviewHistory.filter(item => !validateAnswer(item.answer));
  
    if (interviewType === 'technical-coding') {
      prompt = `You are an expert coding interviewer evaluating a ${settings.difficulty} level ${settings.role} position.
  
      EVALUATION SUMMARY:
      Total Questions: ${interviewHistory.length}
      Valid Attempts: ${validAnswers.length}
      Invalid/Nonsensical Responses: ${invalidAnswers.length}
  
      CANDIDATE'S RESPONSES:
      ${interviewHistory.map((item, index) => `
      PROBLEM ${index + 1}:
      ${item.question}
  
      CANDIDATE'S SOLUTION (${programmingLanguage}):
      ${item.answer}
  
      ATTEMPT VALIDITY: ${validateAnswer(item.answer) ? 'Valid attempt' : 'Invalid/Nonsensical response'}
      Time taken: ${Math.round(item.duration / 1000)} seconds
      `).join('\n\n---\n\n')}
  
      STRICT SCORING CRITERIA:
      1/5 - Nonsensical responses or no valid attempts
      2/5 - Very basic attempts with major issues
      3/5 - Partial solutions with significant gaps
      4/5 - Good solutions with minor issues
      5/5 - Excellent, optimized solutions
  
      If more than 50% of answers are nonsensical/invalid, overall score must be 1.
      If any answer is just random keystrokes, note this as a critical issue.
  
      Provide evaluation in this exact JSON format:
      {
        "strengths": [
          "List only genuine strengths if they exist",
          "For invalid responses, state 'No valid strengths identified'",
          "Note any legitimate attempt to solve problems"
        ],
        "improvements": [
          "List specific improvements needed",
          "Address pattern of invalid responses if present",
          "Suggest proper coding practices"
        ],
        "overallScore": "Must be 1 if mostly invalid responses",
        "feedback": "Detailed analysis of response quality and professionalism",
        "technicalDetails": {
          "timeComplexity": "N/A if no valid solutions",
          "spaceComplexity": "N/A if no valid solutions",
          "codingStyle": "Score 1-5",
          "algorithmChoice": "Score 1-5",
          "edgeCaseHandling": "Score 1-5",
          "codeEfficiency": "Score 1-5",
          "technicalIssues": [
            "List all critical issues",
            "Note any pattern of invalid responses",
            "Highlight unprofessional approaches"
          ],
          "suggestedOptimizations": [
            "List specific improvements needed",
            "Include basic coding practices if missing",
            "Suggest professional approach improvements"
          ]
        }
      }
  
      CRITICAL EVALUATION NOTES:
      1. If answers are mostly random keystrokes, emphasize the need for professional approach
      2. If time spent is very low, note lack of effort
      3. Consider answer validity AND technical accuracy
      4. Note any pattern of unprofessional responses
      5. Provide constructive feedback for improvement`;
  
    } else if (interviewType === 'technical-theory') {
      prompt = `You are an expert technical interviewer evaluating a ${settings.difficulty} level ${settings.role} position.
  
      EVALUATION SUMMARY:
      Total Questions: ${interviewHistory.length}
      Valid Attempts: ${validAnswers.length}
      Invalid/Nonsensical Responses: ${invalidAnswers.length}
  
      CANDIDATE'S RESPONSES:
      ${interviewHistory.map((item, index) => `
      QUESTION ${index + 1}:
      ${item.question}
  
      ANSWER:
      ${item.answer}
  
      ATTEMPT VALIDITY: ${validateAnswer(item.answer) ? 'Valid attempt' : 'Invalid/Nonsensical response'}
      Time: ${Math.round(item.duration / 1000)} seconds
      `).join('\n\n---\n\n')}
  
      TECHNICAL THEORY EVALUATION CRITERIA:
  
      1. Technical Knowledge Depth:
         - Core concept understanding
         - Technical terminology usage
         - Implementation knowledge
         - Best practices awareness
         - Architecture understanding
         - Design pattern knowledge
  
      2. Problem Analysis:
         - System thinking ability
         - Trade-off consideration
         - Scalability understanding
         - Performance awareness
         - Security considerations
  
      3. Communication of Technical Concepts:
         - Clear explanation
         - Appropriate use of technical terms
         - Logical flow
         - Real-world examples
         - Ability to simplify complex concepts
  
      4. Experience Demonstration:
         - Practical application examples
         - Past project references
         - Challenge resolution
         - Tool/Technology familiarity
         - Industry awareness
  
      5. Technical Reasoning:
         - Decision justification
         - Alternative approaches
         - Pros/cons analysis
         - Future considerations
         - Edge case awareness
  
      ROLE-SPECIFIC EVALUATION:
      ${settings.role} Level Requirements:
      - Junior: Basic understanding with potential
      - Mid: Solid understanding with implementation experience
      - Senior: Deep understanding with architectural insights
  
      STRICT SCORING CRITERIA:
      1/5 - Incorrect or nonsensical technical responses
      2/5 - Basic understanding with significant gaps
      3/5 - Adequate knowledge but lacking depth
      4/5 - Strong understanding with minor gaps
      5/5 - Comprehensive expertise with practical insight
  
      Provide evaluation in this exact JSON format:
      {
        "strengths": [
          "List specific technical strengths",
          "Note areas of expertise",
          "Highlight unique insights"
        ],
        "improvements": [
          "List knowledge gaps",
          "Suggest learning areas",
          "Note missing concepts"
        ],
        "overallScore": "Score based on criteria (1-5)",
        "feedback": "Detailed analysis of technical knowledge",
        "technicalTheoryDetails": {
          "conceptualUnderstanding": "Score 1-5",
          "practicalKnowledge": "Score 1-5",
          "communicationSkills": "Score 1-5",
          "problemAnalysis": "Score 1-5",
          "technicalReasoning": "Score 1-5",
          "demonstratedExpertise": [
            "List proven technical areas"
          ],
          "knowledgeGaps": [
            "List areas needing improvement"
          ],
          "recommendedResources": [
            "Specific learning recommendations",
            "Suggested practice areas"
          ],
          "roleReadiness": {
            "currentLevel": "junior/mid/senior",
            "nextSteps": [
              "Specific growth recommendations"
            ]
          }
        }
      }
  
      CRITICAL EVALUATION NOTES:
      1. Verify technical accuracy of all responses
      2. Check for understanding vs. memorization
      3. Assess problem-solving approach
      4. Evaluate architectural thinking
      5. Consider scalability understanding
      6. Look for security awareness
      7. Assess system design knowledge
      8. Check for industry best practices
      9. Evaluate coding principles understanding
      10. Consider technology ecosystem knowledge
  
      ROLE-SPECIFIC CONSIDERATIONS:
      - For ${settings.role} position, focus on:
        * Required technical stack knowledge
        * System design capabilities
        * Architecture understanding
        * Team technical leadership
        * Technical decision-making`;
  }
  
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      text = text.replace(/```json\s*/g, '')
                 .replace(/```\s*/g, '')
                 .replace(/\n/g, ' ')
                 .trim();
      
      if (!text.startsWith('{') || !text.endsWith('}')) {
        throw new Error('Invalid JSON format received');
      }
  
      const evaluation = JSON.parse(text);
      
      // Force score to 1 if mostly invalid responses
      if (invalidAnswers.length > interviewHistory.length / 2) {
        evaluation.overallScore = 1;
        evaluation.feedback = `The majority of responses (${invalidAnswers.length} out of ${interviewHistory.length}) were invalid or nonsensical. A professional approach with genuine attempt to answer questions is required.`;
      }
      
      setEvaluation(evaluation);
    } catch (error) {
      console.error('Evaluation error:', error);
      setEvaluation(getFallbackEvaluation(interviewType, invalidAnswers.length));
    }
  };

  const handleSkipQuestion = () => {
    const skippedHistoryItem: InterviewHistoryItem = {
      question,
      answer: "Question skipped",
      timestamp: Date.now(),
      duration: 0
    }
    
    setInterviewHistory([...interviewHistory, skippedHistoryItem])
    setAnswer('')
    
    if (interviewHistory.length < settings.questionCount - 1) {
      handleInterviewerThinking()
    } else {
      setCurrentStep('complete')
      evaluateInterview()
    }
  }

  // Render functions for different steps
  const renderPreparationStep = () => (
    <Card className="max-w-3xl mx-auto backdrop-blur-sm bg-white/90 shadow-xl">
      <CardHeader className="space-y-4">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <span>AI Mock Interview</span>
          <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full">
            Beta
          </span>
        </CardTitle>
        <CardDescription className="text-base">
          Practice your interview skills with our AI-powered interviewer. Get real-time feedback and detailed analysis.
        </CardDescription>
        
        {/* Interview Type Cards */}
        <div className="grid grid-cols-3 gap-6 mt-6">
          {[
            {
              type: 'behavioral',
              icon: UserIcon,
              title: 'Behavioral',
              description: 'STAR method, soft skills, and experience-based questions'
            },
            {
              type: 'technical-theory',
              icon: CodeIcon,
              title: 'Technical Theory',
              description: 'System design, architecture, and technical concepts'
            },
            {
              type: 'technical-coding',
              icon: CodeIcon,
              title: 'Coding',
              description: 'Data structures, algorithms, and problem-solving'
            }
          ].map(item => (
            <div
              key={item.type}
              onClick={() => setInterviewType(item.type)}
              className={`relative p-6 rounded-xl cursor-pointer transition-all duration-200 ${
                interviewType === item.type 
                  ? 'bg-blue-50 border-2 border-blue-500 shadow-md' 
                  : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
              }`}
            >
              <item.icon className={`w-8 h-8 mb-3 ${
                interviewType === item.type ? 'text-blue-500' : 'text-gray-500'
              }`} />
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.description}</p>
              {interviewType === item.type && (
                <div className="absolute -top-2 -right-2">
                  <div className="bg-blue-500 text-white p-1 rounded-full">
                    <CheckIcon className="w-4 h-4" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Experience Level Selector */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Experience Level</label>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: 'entry', label: 'Entry Level', years: '0-2 years' },
              { value: 'mid', label: 'Mid Level', years: '2-5 years' },
              { value: 'senior', label: 'Senior Level', years: '5+ years' }
            ].map(level => (
              <div
                key={level.value}
                onClick={() => setSettings(prev => ({ ...prev, difficulty: level.value }))}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  settings.difficulty === level.value
                    ? 'bg-blue-50 border-2 border-blue-500'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                <h4 className="font-medium">{level.label}</h4>
                <p className="text-sm text-gray-600">{level.years}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Role Input with Suggestions */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Target Role</label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g., Full Stack Developer"
              className="w-full p-3 border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              value={settings.role}
              onChange={e => setSettings(prev => ({ ...prev, role: e.target.value }))}
            />
            {settings.role && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <CheckIcon className="w-5 h-5 text-green-500" />
              </div>
            )}
          </div>
        </div>

        {/* Audio Settings Panel */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium mb-1">Audio Settings</h3>
              <p className="text-sm text-gray-600">Configure voice interaction preferences</p>
            </div>
            <Switch
              checked={isAudioEnabled}
              onCheckedChange={setIsAudioEnabled}
              className="data-[state=checked]:bg-blue-500"
            />
          </div>

          {isAudioEnabled && (
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={testAudio}
                disabled={isSpeaking}
                className="w-full bg-white hover:bg-gray-50"
              >
                {isSpeaking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing Audio...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 mr-2" />
                    Test Audio Output
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Click to verify your audio settings
              </p>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 border-t pt-6">
        <Button
          onClick={() => setCurrentStep('interview')}
          className="w-full h-12 text-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          disabled={!settings.role || isSpeaking}
        >
          {!settings.role ? (
            'Please fill in required fields'
          ) : (
            <>
              Start Interview
              <ChevronRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
        
        <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
          <div className="flex items-center">
            <ClockIcon className="w-4 h-4 mr-1" />
            {settings.duration} minutes
          </div>
          <div className="w-1 h-1 bg-gray-300 rounded-full" />
          <div className="flex items-center">
            <ListIcon className="w-4 h-4 mr-1" />
            {settings.questionCount} questions
          </div>
        </div>
      </CardFooter>
    </Card>
  )

  // Update the interview step UI
  const renderInterviewStep = () => (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Status Bar */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">
              Question {interviewHistory.length + 1}/{settings.questionCount}
            </span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">{settings.role}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className="hover:bg-gray-100"
          >
            {isAudioEnabled ? 
              <Volume2 className="h-4 w-4 text-green-500" /> : 
              <VolumeX className="h-4 w-4 text-gray-400" />
            }
          </Button>
        </div>
      </div>

      {/* Main Interview Card */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-8">
            {/* AI Interviewer with Enhanced Animation */}
            <div className="relative">
              <AiInterviewer 
                isInterviewerTurn={isInterviewerTurn} 
                isSpeaking={isSpeaking} 
              />
              {isInterviewerTurn && (
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                    {isSpeaking ? 'Speaking...' : 'Thinking...'}
                  </div>
                </div>
              )}
            </div>

            {/* Question Display */}
            <div className="w-full">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={question}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="w-full"
                >
                  <div className={`p-4 rounded-lg transition-all duration-300 ${
                    isInterviewerTurn ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-100'
                  }`}>
                    <p className="text-lg font-medium text-center">{question}</p>
                    
                    {/* Interactive Question Controls */}
                    <div className="flex justify-end gap-2 mt-2">
                      <TooltipProvider>
                      <Tooltip content="Repeat Question">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInterviewerResponse()}
                          disabled={!isAudioEnabled}
                        >
                          <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                            <Volume2 className="h-4 w-4" />
                          </motion.div>
                          </Button>
                        </Tooltip>
                      </TooltipProvider>
                      
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Answer Input Section */}
            {!isInterviewerTurn && (
              <div className="w-full space-y-4">
                <AnswerInput
                  answer={answer}
                  setAnswer={setAnswer}
                  isListening={isListening}
                  onSubmit={() => handleSubmitAnswer(answer)}
                  onStartListening={startListening}
                  onStopListening={stopListening}
                  confidence={recognitionConfidence}
                  interviewType={interviewType}
                  programmingLanguage={programmingLanguage}
                  setProgrammingLanguage={setProgrammingLanguage}
                />
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Press Ctrl + Space to {isListening ? 'stop' : 'start'} recording
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleSkipQuestion}
                    className="flex items-center hover:bg-gray-50"
                  >
                    <SkipForward className="w-4 h-4 mr-2" />
                    Skip Question
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Interview Progress */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Interview Progress</span>
          <span className="text-sm text-gray-500">
            {Math.round((interviewHistory.length / settings.questionCount) * 100)}%
          </span>
        </div>
        <Progress 
          value={(interviewHistory.length / settings.questionCount) * 100} 
          className="h-2"
        />
      </div>
    </div>
  )

  const renderCompletionStep = () => (
    <Card className="w-full max-w-4xl mx-auto bg-white/90 backdrop-blur-sm shadow-lg border-0">
      <CardHeader className="border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Interview Complete</CardTitle>
            <CardDescription className="text-blue-100">
              {settings.role} • {settings.difficulty} Level
            </CardDescription>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <h3 className="text-3xl font-bold">{evaluation?.overallScore}/5</h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {evaluation ? (
          <div className="space-y-8">
            {/* Performance Overview */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <h4 className="text-sm font-medium text-green-800 mb-2">Strengths</h4>
                <div className="space-y-2">
                  {evaluation.strengths.map((strength, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckIcon className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      <p className="text-sm text-green-700">{strength}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                <h4 className="text-sm font-medium text-amber-800 mb-2">Areas for Improvement</h4>
                <div className="space-y-2">
                  {evaluation.improvements.map((improvement, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-amber-500 mt-1 flex-shrink-0" />
                      <p className="text-sm text-amber-700">{improvement}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Performance Score</h4>
                <div className="space-y-4">
                  <Progress 
                    value={evaluation.overallScore * 20} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Score</span>
                    <span className="font-medium">{evaluation.overallScore}/5</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Feedback */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
              <h3 className="font-semibold mb-4">Detailed Feedback</h3>
              <p className="text-gray-700 leading-relaxed">{evaluation.feedback}</p>
            </div>

            {/* Interview History */}
            <div className="space-y-4">
              <h3 className="font-semibold">Question History</h3>
              {interviewHistory.map((item, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">Question {index + 1}</p>
                      <p className="text-gray-600">{item.question}</p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {Math.round(item.duration / 1000)}s
                    </span>
                  </div>
                  <div className="pl-4 border-l-2 border-gray-200">
                    <p className="text-sm font-medium text-gray-700">Your Answer:</p>
                    <p className="text-gray-600">{item.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <div className="text-center">
              <p className="font-medium">Analyzing Your Performance</p>
              <p className="text-sm text-gray-500">Please wait while we evaluate your interview...</p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t p-6">
        <Button 
          onClick={() => {
            setCurrentStep('prep')
            setInterviewHistory([])
            setEvaluation(null)
            setQuestion('')
            setAnswer('')
            setIsInterviewerTurn(true)
          }}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
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
         <nav className="border-b bg-black border-gray-800 py-4 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Sparkles className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Nunito' }}>
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
              <Link href="/pricing" className="text-gray-300 hover:text-white">
                Pricing
              </Link>
              <button className="bg-gradient-to-r from-green-400 to-blue-500 text-black px-4 py-2 rounded-full text-sm font-medium hover:from-green-500 hover:to-blue-600 transition-all duration-300">
                Upgrade
              </button>

              <Menu as="div" className="relative inline-block text-left">
                <div>
                  <Menu.Button className="flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <UserCircle className="w-8 h-8 text-gray-400" />
                  </Menu.Button>
                </div>
                <Transition
                  as={React.Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none">
                    <div className="py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            href="/profile"
                            className={`${
                              active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                            } block px-4 py-2 text-sm`}
                          >
                            Profile
                          </Link>
                        )}
                      </Menu.Item>
                    </div>
                    <div className="py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => signOut({ redirect: true, callbackUrl: "/" })}
                            className={`${
                              active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                            } block w-full text-left px-4 py-2 text-sm`}
                          >
                            Sign out
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
          </div>
        </div>
      </nav>
      <div className="container mx-auto p-4 min-h-screen flex items-center justify-center">
        {currentStep === 'prep' && renderPreparationStep()}
        {currentStep === 'interview' && renderInterviewStep()}
        {currentStep === 'complete' && renderCompletionStep()}
      </div>
      <ToastViewport />
    </ToastProvider>
  )
}