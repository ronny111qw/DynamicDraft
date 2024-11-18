'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, CheckCircle, Sparkles, AlertCircle, ArrowRight, BookOpen, Brain, Target, Zap, HelpCircle, Info, CheckCircle2, XCircle, X, Menu } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { Poppins } from 'next/font/google'
import { motion, AnimatePresence } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Fredoka } from 'next/font/google'



const fredoka = Fredoka({
  subsets: ['latin'],
  display: 'swap',
})

// Types
type ImpactLevel = 'low' | 'medium' | 'high';



interface FormInputs {
  resumeText: string;
  jobDescription: string;
  targetRole?: string;
  industry?: string;
}

interface AnalysisSection {
  title: string;
  content: string | string[];
  impact?: ImpactLevel;
  confidence?: number;
}


interface ResumeStats {
  wordCount: number;
  characterCount: number;
  bulletPoints: number;
  readabilityScore: number;
}

interface AnalysisMetrics {
  overall_match: number;
  keyword_match: number;
  experience_alignment: number;
  skills_coverage: number;
  ats_compatibility: number;
}

interface CustomSuggestions {
  role_specific: string[];
  industry_specific: string[];
  company_culture: string[];
}

interface PriorityImprovement {
  change: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

interface DetailedAnalysisSection {
  title: string;
  content: 
    | string 
    | string[] 
    | PriorityImprovement[] 
    | Record<string, string[]>
    | null;
  impact?: 'high' | 'medium' | 'low';
  confidence?: number;
}

interface AnalysisResponse {
  analysis: DetailedAnalysisSection[];
  metrics: AnalysisMetrics;
  custom_suggestions: CustomSuggestions;
  confidence_scores: {
    overall: number;
    sections: Array<{ title: string; confidence: number | null }>;
  };
}




// Initial states
const initialInputs: FormInputs = {
  resumeText: '',
  jobDescription: '',
  targetRole: '',
  industry: ''
};

// Helper Components
const CircularProgress = ({ value }: { value: number }) => (
  <div className="relative h-16 w-16">
    <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
      <path
        d="M18 2.0845
          a 15.9155 15.9155 0 0 1 0 31.831
          a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke="#eee"
        strokeWidth="3"
      />
      <path
        d="M18 2.0845
          a 15.9155 15.9155 0 0 1 0 31.831
          a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke="#3b82f6"
        strokeWidth="3"
        strokeDasharray={`${value}, 100`}
        className="transition-all duration-1000 ease-out"
      />
    </svg>
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg font-semibold">
      {value}%
    </div>
  </div>
);

          

const ResumeAnalytics = ({ stats }: { stats: ResumeStats }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    {[
      { key: 'wordCount', icon: BookOpen, label: 'Word Count', ideal: '250-650' },
      { key: 'characterCount', icon: Target, label: 'Character Count', ideal: '1500-3000' },
      { key: 'bulletPoints', icon: ArrowRight, label: 'Bullet Points', ideal: '15-25' },
      { key: 'readabilityScore', icon: Brain, label: 'Readability', ideal: '60-70' }
    ].map(({ key, icon: Icon, label, ideal }) => (
      <TooltipProvider key={key}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="transition-all hover:shadow-md">
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className="text-xs">
                    {ideal}
                  </Badge>
                </div>
                <CardTitle className="text-2xl mt-2">
                  {typeof stats[key] === 'number' ? stats[key].toFixed(1) : stats[key]}
                </CardTitle>
                <CardDescription>{label}</CardDescription>
              </CardHeader>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>Ideal range: {ideal}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ))}
  </div>
);

// Enhanced User Guidance Component
const UserGuidanceButton = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="outline" size="sm" className="gap-2">
        <HelpCircle className="h-4 w-4" />
        How to Use
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-2xl max-h-[90vh] bg-[#1a1a1a] text-white border-gray-800">
      <div className="flex justify-between items-start">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Info className="h-5 w-5 text-blue-500" />
            How to Get the Best Results
          </DialogTitle>
        </DialogHeader>
        <DialogClose asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogClose>
      </div>

      <ScrollArea className="max-h-[70vh] pr-4">
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Do's Section */}
            <Card className="bg-[#2a2a2a] border-gray-800">
              <CardHeader>
                <CardTitle className="text-green-400 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Do's
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-300">
                {[
                  'Paste complete resume text with formatting',
                  'Include full job description',
                  'Add specific role requirements',
                  'Wait for complete analysis',
                  'Review all suggestions carefully',
                  'Follow ATS-friendly formatting',
                  'Use industry-specific keywords',
                  'Highlight relevant achievements'
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-1" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Don'ts Section */}
            <Card className="bg-[#2a2a2a] border-gray-800">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Don'ts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-gray-300">
                {[
                  'Skip sections of your resume',
                  'Use incomplete job descriptions',
                  'Ignore ATS compatibility warnings',
                  'Rush through the improvements',
                  'Overlook formatting suggestions',
                  'Include personal information',
                  'Use complex formatting',
                  'Include irrelevant experience'
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-1" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Pro Tips */}
          <Card className="bg-[#2a2a2a] border-gray-800">
            <CardHeader>
              <CardTitle className="text-blue-400 flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Pro Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    title: 'Optimal Length',
                    description: 'Keep resume between 500-700 words for best results'
                  },
                  {
                    title: 'Keywords',
                    description: 'Include key terms from the job description naturally'
                  },
                  {
                    title: 'Format',
                    description: 'Use clear sections and bullet points for better scanning'
                  },
                  {
                    title: 'Updates',
                    description: 'Re-analyze after making suggested improvements'
                  },
                  {
                    title: 'Achievements',
                    description: 'Quantify results with numbers and metrics'
                  },
                  {
                    title: 'Customization',
                    description: 'Tailor content for each job application'
                  }
                ].map((tip, i) => (
                  <div key={i} className="p-3 bg-[#1a1a1a] rounded-lg">
                    <h4 className="font-semibold text-blue-400">{tip.title}</h4>
                    <p className="text-sm text-gray-400">{tip.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Additional Resources */}
          <Card className="bg-[#2a2a2a] border-gray-800">
            <CardHeader>
              <CardTitle className="text-purple-400 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Additional Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    title: 'ATS Guidelines',
                    description: 'Learn more about ATS-friendly formatting'
                  },
                  {
                    title: 'Industry Standards',
                    description: 'Best practices for your industry'
                  },
                  {
                    title: 'Skills Database',
                    description: 'Popular skills and keywords by role'
                  },
                  {
                    title: 'Sample Templates',
                    description: 'ATS-optimized resume templates'
                  }
                ].map((resource, i) => (
                  <div key={i} className="p-3 bg-[#1a1a1a] rounded-lg">
                    <h4 className="font-semibold text-purple-400">{resource.title}</h4>
                    <p className="text-sm text-gray-400">{resource.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </DialogContent>
  </Dialog>
);

// Main ResumeOptimizer component
export default function ResumeOptimizer() {
  const [inputs, setInputs] = useState<FormInputs>(initialInputs);
  const [analysis, setAnalysis] = useState<AnalysisSection[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overallScore, setOverallScore] = useState<number>(0);
  const [activeTab, setActiveTab] = useState('input');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [resumeStats, setResumeStats] = useState<ResumeStats>({
    wordCount: 0,
    characterCount: 0,
    bulletPoints: 0,
    readabilityScore: 0
  });
  const [autoSave, setAutoSave] = useState(false);
  const [metrics, setMetrics] = useState<AnalysisMetrics>({
    overall_match: 0,
    keyword_match: 0,
    experience_alignment: 0,
    skills_coverage: 0,
    ats_compatibility: 0
  });
  const [customSuggestions, setCustomSuggestions] = useState<CustomSuggestions>({
    role_specific: [],
    industry_specific: [],
    company_culture: []
  });

  const { data: session, status } = useSession();


  useEffect(() => {
    if (inputs.resumeText) {
      const words = inputs.resumeText.trim().split(/\s+/).length;
      const chars = inputs.resumeText.length;
      const bullets = (inputs.resumeText.match(/•|\-|\*/g) || []).length;
      const readability = calculateReadabilityScore(inputs.resumeText);

      setResumeStats({
        wordCount: words,
        characterCount: chars,
        bulletPoints: bullets,
        readabilityScore: readability
      });
    }
  }, [inputs.resumeText]);

  const calculateReadabilityScore = (text: string): number => {
    // Simplified Flesch Reading Ease score calculation
    const words = text.trim().split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const syllables = text.split(/[aeiou]/i).length;
    
    if (words === 0 || sentences === 0) return 0;
    
    return Math.min(100, Math.max(0,
      206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
    ));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  const analyzeResume = async () => {
    if (!inputs.resumeText || !inputs.jobDescription) {
      toast({
        title: "Missing Information",
        description: "Please provide both resume text and job description.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/resume-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to analyze resume');
      }

      const data: AnalysisResponse = await response.json();
      
      if (data.analysis) {
        setAnalysis(data.analysis);
        setMetrics(data.metrics);
        setCustomSuggestions(data.custom_suggestions);
        setOverallScore(data.confidence_scores.overall);
        
        
        toast({
          title: "Analysis Complete",
          description: "Your resume has been successfully analyzed!",
        });
      }
  
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error occurred.';
      setError(errorMessage);
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive"
      });
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const calculateOverallScore = (analysis: AnalysisSection[]): number => {
    const weights = {
      'Key Skills Match': 0.4,
      'Experience Relevance': 0.3,
      'ATS Compatibility': 0.2,
      'Format Quality': 0.1
    };

    let totalScore = 0;
    let totalWeight = 0;

    analysis.forEach(section => {
      const weight = weights[section.title as keyof typeof weights] || 0;
      if (Array.isArray(section.content)) {
        totalScore += (section.content.length / 10) * 100 * weight;
      } else if (section.confidence) {
        totalScore += section.confidence * weight;
      }
      totalWeight += weight;
    });

    return Math.round(totalWeight > 0 ? totalScore / totalWeight : 0);
  };

  
    

  const renderAnalysisContent = (section: DetailedAnalysisSection) => {
    // Handle string content
    if (typeof section.content === 'string') {
      return <p className="text-gray-300">{section.content}</p>;
    }

    // Handle array of strings
    if (Array.isArray(section.content)) {
      return (
        <ul className="space-y-3">
          {section.content.map((item, i) => {
            // If item is a string
            if (typeof item === 'string') {
              return (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-300">{item}</span>
                </li>
              );
            }

            // If item is a PriorityImprovement object
            if (item && typeof item === 'object' && 'priority' in item && 'change' in item && 'reason' in item) {
              return (
                <li key={i} className="flex items-start gap-3 p-3 bg-[#2a2a2a] rounded-lg">
                  <Badge 
                    variant={
                      item.priority === 'high' ? 'destructive' : 
                      item.priority === 'medium' ? 'default' : 
                      'secondary'
                    }
                  >
                    {item.priority}
                  </Badge>
                  <div>
                    <p className="font-medium text-white">{item.change}</p>
                    <p className="text-sm text-gray-400 mt-1">{item.reason}</p>
                  </div>
                </li>
              );
            }

            // Skip any other types
            return null;
          })}
        </ul>
      );
    }

    // Handle object content
    if (section.content && typeof section.content === 'object') {
      const entries = Object.entries(section.content);
      if (entries.length === 0) return null;

      return (
        <div className="space-y-4">
          {entries.map(([key, value]) => {
            // Skip if value is not an array or is empty
            if (!Array.isArray(value) || value.length === 0) return null;

            // Ensure all items in the array are strings
            const stringValues = value.filter((item): item is string => typeof item === 'string');

            if (stringValues.length === 0) return null;

            return (
              <div key={key} className="space-y-2">
                <h4 className="font-semibold text-white capitalize">
                  {key.replace(/_/g, ' ')}
                </h4>
                <ul className="space-y-2">
                  {stringValues.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      );
    }

    // If content is undefined or null
    return <p className="text-gray-400">No content available</p>;
  };

  const MetricsCard = ({ title, value, description, icon: Icon, threshold = 70 }) => (
    <Card className="bg-[#2a2a2a] border-gray-800 transition-all hover:shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${
              value >= threshold ? 'bg-green-900' : 'bg-yellow-900'
            }`}>
              <Icon className={`h-4 w-4 ${
                value >= threshold ? 'text-green-400' : 'text-yellow-400'
              }`} />
            </div>
            <div>
              <CardTitle className="text-lg text-white">{title}</CardTitle>
              <CardDescription className="text-gray-400">{description}</CardDescription>
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{value}%</div>
        </div>
        <Progress 
          value={value} 
          className={`mt-4 h-2 ${value >= threshold ? 'bg-green-900' : 'bg-yellow-900'}`}
          indicatorClassName={value >= threshold ? 'bg-green-400' : 'bg-yellow-400'}
        />
      </CardHeader>
    </Card>
  );

  const PriorityImprovementsSection = ({ improvements }: { improvements: any[] }) => (
    <Card className="bg-[#2a2a2a] border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-900 rounded-full">
              <Zap className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-white">Priority Improvements</CardTitle>
              <CardDescription className="text-gray-400">Critical changes to improve your resume</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-gray-300">
        <div className="space-y-4">
          {improvements.map((improvement, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                flex items-start gap-3 p-4 rounded-lg border
                ${improvement.priority === 'high' 
                  ? 'bg-red-900/20 border-red-900/30' 
                  : improvement.priority === 'medium'
                  ? 'bg-yellow-900/20 border-yellow-900/30'
                  : 'bg-green-900/20 border-green-900/30'}
              `}
            >
              <div className={`
                p-2 rounded-full flex-shrink-0
                ${improvement.priority === 'high' 
                  ? 'bg-red-900/30' 
                  : improvement.priority === 'medium'
                  ? 'bg-yellow-900/30'
                  : 'bg-green-900/30'}
              `}>
                <AlertCircle className={`
                  h-4 w-4
                  ${improvement.priority === 'high' 
                    ? 'text-red-400' 
                    : improvement.priority === 'medium'
                    ? 'text-yellow-400'
                    : 'text-green-400'}
                `} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge 
                    variant={
                      improvement.priority === 'high' ? 'destructive' : 
                      improvement.priority === 'medium' ? 'default' : 
                      'secondary'
                    }
                    className="uppercase text-xs"
                  >
                    {improvement.priority} priority
                  </Badge>
                </div>
                <p className="font-medium text-white">{improvement.change}</p>
                <p className="text-sm text-gray-400 mt-1">{improvement.reason}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
        <div className={`bg-black text-white`}>
    <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-5 pointer-events-none"></div>
    <div className="relative z-10">
      {/* Add navbar here */}
      <nav className="border-b bg-black border-gray-800 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
              <span className={`text-xl sm:text-3xl font-semibold text-white ${fredoka.className}`}>
                Dynamic<span className="text-green-400">Draft</span>
                  </span>
            </Link>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2 text-gray-400 hover:text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center space-x-6">
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

          {/* Mobile menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden mt-4 space-y-4"
              >
                <Link href="/dashboard" className="block text-gray-300 hover:text-white py-2">
                  Dashboard
                </Link>
                <Link href="/choose-template" className="block text-gray-300 hover:text-white py-2">
                  Templates
                </Link>
                <Link href="/intmock" className="block text-gray-300 hover:text-white py-2">
                  Mock Interview
                </Link>
                <button className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-black px-4 py-2 rounded-full text-sm font-medium hover:from-green-500 hover:to-blue-600 transition-all duration-300">
                  Upgrade
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
      </div>
      </div>

    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6 bg-[#1a1a1a]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            AI Resume Optimizer
          </h1>
          <p className="text-gray-400">Optimize your resume for ATS and hiring managers</p>
        </div>
        <div className="flex items-center gap-4">
          <UserGuidanceButton />
        </div>
      </div>

      

      

       
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-[#2a2a2a] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Resume Text</CardTitle>
                <CardDescription className="text-gray-400">Paste your resume text here</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-white">
                <Textarea
                  name="resumeText"
                  value={inputs.resumeText}
                  onChange={handleInputChange}
                  placeholder="Paste your resume here..."
                  className="min-h-[300px]"
                />
                {inputs.resumeText && <ResumeAnalytics stats={resumeStats} />}
              </CardContent>
            </Card>
            
            <div className="space-y-4">
              <Card className="bg-[#2a2a2a] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Job Description</CardTitle>
                  <CardDescription className="text-gray-400">Paste the job description here</CardDescription>
                </CardHeader>
                <CardContent className="text-white">
                  <Textarea
                    name="jobDescription"
                    value={inputs.jobDescription}
                    onChange={handleInputChange}
                    placeholder="Paste the job description here..."
                    className="min-h-[200px]"
                  />
                </CardContent>
              </Card>
              
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={analyzeResume} 
              disabled={isAnalyzing}
              className="w-full sm:w-auto mt-4"
              variant="secondary"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze Resume
                </>
              )}
            </Button>
          </div>
        


      {analysis && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricsCard 
              title="Overall Match"
              value={metrics.overall_match}
              description="Resume-Job Fit"
              icon={Target}
            />
            <MetricsCard 
              title="ATS Score"
              value={metrics.ats_compatibility}
              description="System Compatibility"
              icon={Zap}
            />
            <MetricsCard 
              title="Keyword Match"
              value={metrics.keyword_match}
              description="Required Skills Coverage"
              icon={BookOpen}
            />
            <MetricsCard 
              title="Experience Fit"
              value={metrics.experience_alignment}
              description="Role Alignment"
              icon={Brain}
            />
          </div>

          {/* Priority Improvements */}
          {analysis.find(section => section.title === "Priority Improvements")?.content && (
            <PriorityImprovementsSection 
              improvements={
                analysis.find(section => section.title === "Priority Improvements")
                ?.content as any[]
              } 
            />
          )}

          {/* Detailed Analysis Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {analysis.filter(section => section.title !== "Priority Improvements").map((section, index) => (
              <Card key={index} className="bg-[#2a2a2a] border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-white">
                    {section.title}
                    {section.impact && (
                      <Badge variant={section.impact === 'high' ? 'destructive' : 
                                    section.impact === 'medium' ? 'default' : 'secondary'}>
                        {section.impact} impact
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-300">
                  {section.content ? renderAnalysisContent(section) : null}
                </CardContent>
                {typeof section.confidence === 'number' && (
                  <CardFooter>
                    <div className="w-full">
                      <div className="flex justify-between text-sm mb-1 text-gray-400">
                        <span>Confidence</span>
                        <span>{section.confidence}%</span>
                      </div>
                      <Progress value={section.confidence} className="h-2" />
                    </div>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>

          {/* Custom Suggestions Section */}
         {/* Custom Suggestions Section */}
<Card className="bg-[#2a2a2a] border-gray-800">
  <CardHeader>
    <div className="flex items-center gap-2">
      <div className="p-2 bg-purple-900 rounded-full">
        <Target className="h-5 w-5 text-purple-400" />
      </div>
      <div>
        <CardTitle className="text-white">Tailored Recommendations</CardTitle>
        <CardDescription className="text-gray-400">Specific suggestions for your target role and industry</CardDescription>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(customSuggestions).map(([key, suggestions]) => (
        <div key={key} className="space-y-2">
          <h4 className="font-semibold text-white capitalize">{key.replace('_', ' ')}</h4>
          <ul className="space-y-1">
            {suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-gray-300 text-sm">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
        </div>
      )}
    </div>
    </>
  );
}