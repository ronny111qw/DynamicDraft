'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Loader2, Clipboard, CheckCircle2, RefreshCw, Sparkles, Save, Download, Plus, X, Send, Play, Pause, StopCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { GoogleGenerativeAI } from "@google/generative-ai"

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

const defaultQuestionTypes: QuestionType[] = [
  { id: 'behavioral', name: 'Behavioral' },
  { id: 'technical', name: 'Technical' },
  { id: 'situational', name: 'Situational' },
]

async function generateQuestionsWithGemini(resume: string, jobDescription: string, difficulty: string, questionTypes: QuestionType[]) {
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
      
      Please generate ${questionTypes.length * 2} questions:
      ${questionTypes.map(type => `- 2 ${type.name.toLowerCase()} questions`).join('\n')}
      
      Ensure the questions are appropriate for the ${difficulty} difficulty level.
      
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

function EnhancedQuestionGenerator() {
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

  // Mock Interview States
  const [isMockInterviewMode, setIsMockInterviewMode] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [interviewTimer, setInterviewTimer] = useState(0)
  const [isInterviewPaused, setIsInterviewPaused] = useState(false)
  const [interviewDuration, setInterviewDuration] = useState(1800) // 30 minutes by default
  const [totalScore, setTotalScore] = useState(0)

  useEffect(() => {
    const savedSetsFromStorage = localStorage.getItem('savedQuestionSets')
    if (savedSetsFromStorage) {
      setSavedSets(JSON.parse(savedSetsFromStorage))
    }

    const savedQuestionTypes = localStorage.getItem('customQuestionTypes')
    if (savedQuestionTypes) {
      setQuestionTypes([...defaultQuestionTypes, ...JSON.parse(savedQuestionTypes)])
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
      const generatedQuestions = await generateQuestionsWithGemini(resume, jobDescription, difficulty, questionTypes)
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
    toast({
      title: "Mock Interview Ended",
      description: `You've completed the mock interview. Your average score is ${averageScore.toFixed(2)}/5. Review your answers and feedback.`,
    })
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

  return (
    <div className="bg-white min-h-screen text-black font-sans">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">Enhanced AI Interview Question Generator</h1>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-lg p-1">
            <TabsTrigger value="input" className="data-[state=active]:bg-white">Input</TabsTrigger>
            <TabsTrigger value="questions" className="data-[state=active]:bg-white" disabled={questions.length === 0}>Questions</TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-white">Saved Sets</TabsTrigger>
          </TabsList>
          <TabsContent value="input">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resume</CardTitle>
                  <CardDescription>Paste your resume here</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Paste your resume here..."
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                    className="h-64 resize-none"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Job Description</CardTitle>
                  <CardDescription>Paste the job description here</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Paste the job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="h-64 resize-none"
                  />
                </CardContent>
              </Card>
            </div>
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Interview Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      }}>
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
                  className="w-full"
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
          </TabsContent>
          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <CardTitle>Generated Interview Questions</CardTitle>
                <CardDescription>Review, answer, and get feedback on these tailored interview questions.</CardDescription>
              </CardHeader>
              <CardContent>
                {isMockInterviewMode ? (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">Mock Interview Mode</h3>
                    <div className="flex justify-between items-center">
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
                        const updatedQuestions = [...questions]
                        updatedQuestions[currentQuestionIndex] = { ...updatedQuestions[currentQuestionIndex], userAnswer: e.target.value }
                        setQuestions(updatedQuestions)
                      }}
                      placeholder="Type your answer here..."
                      className="h-32"
                    />
                    <div className="flex justify-between">
                      <Button onClick={() => evaluateAnswer(currentQuestionIndex)} disabled={isEvaluating || !questions[currentQuestionIndex].userAnswer}>
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
                        <Button onClick={nextQuestion}>
                          {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'End Interview'}
                        </Button>
                      </div>
                    </div>
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
                        <Button onClick={startMockInterview}>
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
                            <Button onClick={saveQuestionSet} className="w-full">
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
          </TabsContent>
          <TabsContent value="saved">
            <Card>
              <CardHeader>
                <CardTitle>Saved Question Sets</CardTitle>
                <CardDescription>Load or manage your saved question sets.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh] pr-4">
                  {savedSets.map((set, index) => (
                    <Card key={index} className="mb-4">
                      <CardHeader>
                        <CardTitle>{set.name}</CardTitle>
                        <CardDescription>Difficulty: {set.difficulty} | {set.questions.length} questions</CardDescription>
                      </CardHeader>
                      <CardFooter>
                        <Button onClick={() => loadQuestionSet(set)}>
                          Load Set
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
          <Badge variant="outline">
            {questionType.name}
          </Badge>
          <span className="text-sm font-medium">Question {index + 1}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2">
          <p className="text-lg font-medium">{question.question}</p>
          <p className="text-sm text-gray-500">
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
            <Button onClick={onEvaluate} disabled={isEvaluating || !question.userAnswer}>
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
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export default EnhancedQuestionGenerator