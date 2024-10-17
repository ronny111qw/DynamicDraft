'use client'
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import dynamic from 'next/dynamic';

// Dynamically import the AceEditor to avoid SSR issues
const AceEditor = dynamic(
  async () => {
    const ace = await import('react-ace');
    await import('ace-builds/src-noconflict/mode-javascript');
    await import('ace-builds/src-noconflict/theme-monokai');
    return ace;
  },
  { ssr: false }
);

// Simulated peer matching function
const findPeer = () => {
  const peers = ['Alice', 'Bob', 'Charlie', 'Diana'];
  return peers[Math.floor(Math.random() * peers.length)];
};

const MockInterviewPlatform = () => {
  const [currentStep, setCurrentStep] = useState('matching');
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds for matching
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isInterviewerTurn, setIsInterviewerTurn] = useState(true);
  const [interviewType, setInterviewType] = useState('behavioral');
  const [peerName, setPeerName] = useState('');
  const [codeAnswer, setCodeAnswer] = useState('');
  const [videoStream, setVideoStream] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    let timer;
    if (currentStep === 'matching' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && currentStep === 'matching') {
      setPeerName(findPeer());
      setCurrentStep('prep');
      setTimeLeft(300); // 5 minutes prep time
    } else if (currentStep === 'prep' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && currentStep === 'prep') {
      handleNextStep();
    }
    return () => clearInterval(timer);
  }, [currentStep, timeLeft]);

  useEffect(() => {
    if (currentStep === 'interview') {
      startVideoStream();
    } else {
      stopVideoStream();
    }
  }, [currentStep]);

  const startVideoStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const stopVideoStream = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
  };

  const handleNextStep = () => {
    switch (currentStep) {
      case 'prep':
        setCurrentStep('interview');
        setTimeLeft(1800); // 30 minutes interview time
        break;
      case 'interview':
        setCurrentStep('feedback');
        break;
      case 'feedback':
        setCurrentStep('complete');
        break;
      default:
        break;
    }
  };

  const handleSubmitAnswer = () => {
    setIsInterviewerTurn(true);
    // Simulate AI generating next question
    setTimeout(() => {
      if (interviewType === 'technical') {
        setQuestion("Implement a function to reverse a linked list.");
      } else {
        setQuestion("Tell me about a time when you had to deal with a difficult team member.");
      }
      setIsInterviewerTurn(false);
    }, 2000);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'matching':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Finding a Peer</CardTitle>
              <CardDescription>Please wait while we match you with an interview partner.</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={((30 - timeLeft) / 30) * 100} className="w-full" />
              <p className="mt-4">Time left: {timeLeft} seconds</p>
            </CardContent>
          </Card>
        );
      case 'prep':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Interview Preparation</CardTitle>
              <CardDescription>You have 5 minutes to prepare for your interview with {peerName}.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select onValueChange={setInterviewType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select interview type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="behavioral">Behavioral</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
              <Progress value={(300 - timeLeft) / 3} className="w-full mt-4" />
              <p className="mt-4">Time left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</p>
            </CardContent>
            <CardFooter>
              <Button onClick={handleNextStep}>Start Interview</Button>
            </CardFooter>
          </Card>
        );
      case 'interview':
        return (
          <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Mock Interview in Progress</CardTitle>
              <CardDescription>Time left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4 mb-4">
                <video ref={videoRef} autoPlay muted className="w-1/2 h-auto" />
                <div className="w-1/2 h-auto bg-gray-200 flex items-center justify-center">
                  <p>Peer's video</p>
                </div>
              </div>
              <div className="flex space-x-4 mb-4">
                <Avatar>
                  <AvatarImage src={`https://api.dicebear.com/6.x/avataaars/svg?seed=${peerName}`} />
                  <AvatarFallback>{peerName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{question || `Hello, I'm ${peerName}. Let's start with your introduction.`}</p>
                  {isInterviewerTurn && <p className="text-sm text-gray-500 mt-2">Interviewer is thinking...</p>}
                </div>
              </div>
              {interviewType === 'behavioral' ? (
                <Textarea
                  placeholder="Type your answer here..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full mb-4"
                  disabled={isInterviewerTurn}
                />
              ) : (
                <AceEditor
                  mode="javascript"
                  theme="monokai"
                  onChange={setCodeAnswer}
                  name="code_editor"
                  editorProps={{ $blockScrolling: true }}
                  setOptions={{
                    enableBasicAutocompletion: true,
                    enableLiveAutocompletion: true,
                    enableSnippets: true,
                    showLineNumbers: true,
                    tabSize: 2,
                  }}
                  style={{ width: '100%', height: '200px' }}
                />
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSubmitAnswer} disabled={isInterviewerTurn}>Submit Answer</Button>
            </CardFooter>
          </Card>
        );
      case 'feedback':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Interview Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Provide your feedback here..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full mb-4"
              />
            </CardContent>
            <CardFooter>
              <Button onClick={handleNextStep}>Complete Interview</Button>
            </CardFooter>
          </Card>
        );
      case 'complete':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Interview Complete</CardTitle>
              <CardDescription>Thank you for participating in the mock interview.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Your feedback: {feedback}</p>
              <p>Interview Type: {interviewType}</p>
              <p>Duration: 30 minutes</p>
              {/* Add more analytics here */}
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Advanced Mock Interview Platform</h1>
      {renderStep()}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="mt-4">Need Help?</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Interview Tips</DialogTitle>
            <DialogDescription>
              - Be concise and specific in your answers
              - Use the STAR method for behavioral questions
              - Ask thoughtful questions at the end of the interview
              - Remember to breathe and stay calm
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MockInterviewPlatform;