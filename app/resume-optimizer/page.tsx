'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, CheckCircle, Sparkles, AlertCircle, ArrowRight, BookOpen, Brain, Target, Zap, HelpCircle, Info, CheckCircle2, XCircle, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { Poppins } from 'next/font/google'
import { motion } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";


const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
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

interface DetailedAnalysisSection extends AnalysisSection {
  content: string | string[] | {
    matching_skills?: string[];
    missing_skills?: string[];
    irrelevant_skills?: string[];
    strong_points?: string[];
    improvement_areas?: string[];
    recommendations?: string[];
  };
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
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
    <DialogContent className="max-w-2xl max-h-[90vh]">
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
            <Card className="border-green-100">
              <CardHeader>
                <CardTitle className="text-green-600 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Do's
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
            <Card className="border-red-100">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Don'ts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
          <Card className="bg-blue-50/50 border-blue-100">
            <CardHeader>
              <CardTitle className="text-blue-600 flex items-center gap-2">
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
                  <div key={i} className="p-3 bg-white rounded-lg">
                    <h4 className="font-semibold text-blue-700">{tip.title}</h4>
                    <p className="text-sm text-gray-600">{tip.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Additional Resources */}
          <Card className="border-purple-100">
            <CardHeader>
              <CardTitle className="text-purple-600 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Additional Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                  <div key={i} className="p-3 bg-purple-50/50 rounded-lg">
                    <h4 className="font-semibold text-purple-700">{resource.title}</h4>
                    <p className="text-sm text-gray-600">{resource.description}</p>
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
    if (!section.content) return null;

    if (typeof section.content === 'string') {
      return <p className="text-gray-700">{section.content}</p>;
    }
    
    if (Array.isArray(section.content)) {
      return (
        <ul className="space-y-3">
          {section.content.map((item, i) => {
            // Handle string items
            if (typeof item === 'string') {
              return (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </li>
              );
            }
            
            // Handle priority improvement objects
            if (typeof item === 'object' && item !== null && 'priority' in item) {
              const improvement = item as { priority: string; change: string; reason: string };
              return (
                <li key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Badge 
                    variant={
                      improvement.priority === 'high' ? 'destructive' : 
                      improvement.priority === 'medium' ? 'default' : 
                      'secondary'
                    }
                    className="flex-shrink-0"
                  >
                    {improvement.priority}
                  </Badge>
                  <div>
                    <p className="font-medium text-gray-900">{improvement.change}</p>
                    <p className="text-sm text-gray-600 mt-1">{improvement.reason}</p>
                  </div>
                </li>
              );
            }
            return null;
          })}
        </ul>
      );
    }

    // Handle object content (skills, experiences, etc.)
    if (typeof section.content === 'object' && section.content !== null) {
      return (
        <div className="space-y-4">
          {Object.entries(section.content).map(([key, values]) => (
            <div key={key} className="space-y-2">
              <h4 className="font-semibold text-gray-900 capitalize">
                {key.replace(/_/g, ' ')}
              </h4>
              {Array.isArray(values) && (
                <ul className="space-y-2">
                  {values.map((value, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-gray-700">{value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  const MetricsCard = ({ title, value, description, icon: Icon, threshold = 70 }) => (
    <Card className={`transition-all hover:shadow-md ${value >= threshold ? 'border-green-200' : 'border-yellow-200'}`}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${value >= threshold ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <Icon className={`h-4 w-4 ${value >= threshold ? 'text-green-600' : 'text-yellow-600'}`} />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <div className="text-2xl font-bold">{value}%</div>
        </div>
        <Progress 
          value={value} 
          className={`mt-4 h-2 ${value >= threshold ? 'bg-green-100' : 'bg-yellow-100'}`}
          indicatorClassName={value >= threshold ? 'bg-green-500' : 'bg-yellow-500'}
        />
      </CardHeader>
    </Card>
  );

  const PriorityImprovementsSection = ({ improvements }: { improvements: any[] }) => (
    <Card className="bg-gradient-to-br from-gray-50 to-white border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-full">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Priority Improvements</CardTitle>
              <CardDescription>Critical changes to improve your resume</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
                  ? 'bg-red-50 border-red-100' 
                  : improvement.priority === 'medium'
                  ? 'bg-yellow-50 border-yellow-100'
                  : 'bg-green-50 border-green-100'}
              `}
            >
              <div className={`
                p-2 rounded-full flex-shrink-0
                ${improvement.priority === 'high' 
                  ? 'bg-red-100' 
                  : improvement.priority === 'medium'
                  ? 'bg-yellow-100'
                  : 'bg-green-100'}
              `}>
                <AlertCircle className={`
                  h-4 w-4
                  ${improvement.priority === 'high' 
                    ? 'text-red-600' 
                    : improvement.priority === 'medium'
                    ? 'text-yellow-600'
                    : 'text-green-600'}
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
                <p className="font-medium text-gray-900">{improvement.change}</p>
                <p className="text-sm text-gray-600 mt-1">{improvement.reason}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
        <div className={`bg-black text-white ${poppins.className}`}>
    <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-5 pointer-events-none"></div>
    <div className="relative z-10">
      {/* Add navbar here */}
      <nav className="border-b border-gray-800 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Sparkles className="w-8 h-8 text-green-400" />
              <span className={"text-2xl font-bold text-}"}>
                Dynamic<span className="text-green-400">Draft</span>
              </span>
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/dashboard" className="text-gray-300 hover:text-white">Dashboard</Link>
              <Link href="/choose-template" className="text-gray-300 hover:text-white">Templates</Link>
              <Link href="/IntrviewPrep" className="text-gray-300 hover:text-white">Interview Prep</Link>
            </div>
          </div>
        </div>
      </nav>
      </div>
      </div>

    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            AI Resume Optimizer
          </h1>
          <p className="text-gray-500">Optimize your resume for ATS and hiring managers</p>
        </div>
        <div className="flex items-center gap-4">
          <UserGuidanceButton />
          {/* Add any other header actions here */}
        </div>
      </div>

      

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="input">Input</TabsTrigger>
    
        </TabsList>

       
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Resume Text</CardTitle>
                <CardDescription>Paste your resume text here</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
              <Card>
                <CardHeader>
                  <CardTitle>Job Description</CardTitle>
                  <CardDescription>Paste the job description here</CardDescription>
                </CardHeader>
                <CardContent>
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

          <div className="flex gap-2">
            <Button 
              onClick={analyzeResume} 
              disabled={isAnalyzing}
              className="w-full md:w-auto"
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
        
      </Tabs>

      {analysis && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.filter(section => section.title !== "Priority Improvements").map((section, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {section.title}
                    {section.impact && (
                      <Badge variant={section.impact === 'high' ? 'destructive' : 
                                    section.impact === 'medium' ? 'default' : 'secondary'}>
                        {section.impact} impact
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderAnalysisContent(section)}
                </CardContent>
                {section.confidence && (
                  <CardFooter>
                    <div className="w-full">
                      <div className="flex justify-between text-sm mb-1">
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
          <Card>
            <CardHeader>
              <CardTitle>Tailored Recommendations</CardTitle>
              <CardDescription>Specific suggestions for your target role and industry</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(customSuggestions).map(([key, suggestions]) => (
                  <div key={key} className="space-y-2">
                    <h4 className="font-semibold capitalize">{key.replace('_', ' ')}</h4>
                    <ul className="space-y-1">
                      {suggestions.map((suggestion, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                          {suggestion}
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