'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Save, Upload, Download, Trash2, CheckCircle, XCircle, Lock, History, Share2, FileText, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";

// Types
type SubscriptionTier = 'free' | 'pro' | 'premium';
type ImpactLevel = 'low' | 'medium' | 'high';

interface UserSubscription {
  tier: SubscriptionTier;
  analysisCount: number;
  expiryDate?: Date;
}

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

interface SavedAnalysis {
  id: string;
  date: Date;
  overallScore: number;
  sections: AnalysisSection[];
  inputs: FormInputs;
  tags?: string[];
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

const TIER_LIMITS = {
  free: { analyses: 1, sections: 1, history: 0 },
  pro: { analyses: 5, sections: 4, history: 10 },
  premium: { analyses: Infinity, sections: Infinity, history: Infinity }
};

const TIER_FEATURES = {
  free: ['Basic Analysis', 'Key Skills Match'],
  pro: ['Advanced Analysis', 'ATS Optimization', 'Industry Insights', 'Save History'],
  premium: ['Expert Analysis', 'Unlimited Saves', 'Priority Processing', 'Custom Templates']
};

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

const FeatureComparison = () => (
  <div className="grid grid-cols-3 gap-4 mt-4">
    {(['free', 'pro', 'premium'] as SubscriptionTier[]).map((tier) => (
      <Card key={tier} className={`${tier === 'premium' ? 'border-blue-500 shadow-lg' : ''}`}>
        <CardHeader>
          <CardTitle className="capitalize">{tier}</CardTitle>
          <CardDescription>
            {tier === 'free' ? 'Basic Analysis' : tier === 'pro' ? 'Advanced Features' : 'Complete Solution'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {TIER_FEATURES[tier].map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button className="w-full" variant={tier === 'premium' ? 'default' : 'outline'}>
            {tier === 'free' ? 'Current Plan' : `Upgrade to ${tier}`}
          </Button>
        </CardFooter>
      </Card>
    ))}
  </div>
);

const ResumeAnalytics = ({ stats }: { stats: ResumeStats }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    {Object.entries(stats).map(([key, value]) => (
      <Card key={key}>
        <CardHeader className="p-4">
          <CardDescription className="capitalize">
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </CardDescription>
          <CardTitle className="text-2xl">
            {typeof value === 'number' ? value.toFixed(1) : value}
          </CardTitle>
        </CardHeader>
      </Card>
    ))}
  </div>
);

// Main ResumeOptimizer component
export default function ResumeOptimizer() {
  const [inputs, setInputs] = useState<FormInputs>(initialInputs);
  const [analysis, setAnalysis] = useState<AnalysisSection[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [overallScore, setOverallScore] = useState<number>(0);
  const [activeTab, setActiveTab] = useState('input');
  const [resumeStats, setResumeStats] = useState<ResumeStats>({
    wordCount: 0,
    characterCount: 0,
    bulletPoints: 0,
    readabilityScore: 0
  });
  const [autoSave, setAutoSave] = useState(false);
  const [userSubscription, setUserSubscription] = useState<UserSubscription>({
    tier: 'free',
    analysisCount: 0,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });
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
        
        if (autoSave && userSubscription.tier !== 'free') {
          handleSaveAnalysis(data.analysis, data.confidence_scores.overall);
        }
        
        toast({
          title: "Analysis Complete",
          description: "Your resume has been successfully analyzed!",
        });
      }
    
      setUserSubscription(prev => ({
        ...prev,
        analysisCount: prev.analysisCount + 1
      }));
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

  const handleSaveAnalysis = (analysisData: AnalysisSection[], score: number) => {
    const newAnalysis: SavedAnalysis = {
      id: Date.now().toString(),
      date: new Date(),
      overallScore: score,
      sections: analysisData,
      inputs: { ...inputs },
    };
    
    setSavedAnalyses(prev => {
      const updated = [newAnalysis, ...prev];
      if (userSubscription.tier !== 'premium') {
        return updated.slice(0, TIER_LIMITS[userSubscription.tier].history);
      }
      return updated;
    });
  };

  const renderAnalysisContent = (section: DetailedAnalysisSection) => {
    if (!section.content) return null;

    if (typeof section.content === 'string') {
      return <p>{section.content}</p>;
    }
    
    if (Array.isArray(section.content)) {
      return (
        <ul className="space-y-2">
          {section.content.map((item, i) => {
            if (typeof item === 'string') {
              return (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                  <span>{item}</span>
                </li>
              );
            }
            // Handle priority improvement items
            if (typeof item === 'object' && item !== null) {
              return (
                <li key={i} className="flex items-start gap-2">
                  <Badge variant={(item as PriorityImprovement).priority === 'high' ? 'destructive' : 
                                (item as PriorityImprovement).priority === 'medium' ? 'default' : 'secondary'}>
                    {(item as PriorityImprovement).priority}
                  </Badge>
                  <div>
                    <p className="font-medium">{(item as PriorityImprovement).change}</p>
                    <p className="text-sm text-muted-foreground">{(item as PriorityImprovement).reason}</p>
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
      return Object.entries(section.content).map(([key, values]) => (
        <div key={key} className="mb-4">
          <h4 className="font-semibold mb-2 capitalize">{key.replace(/_/g, ' ')}</h4>
          <ul className="space-y-1">
            {Array.isArray(values) && values.map((value, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                <span>{value}</span>
              </li>
            ))}
          </ul>
        </div>
      ));
    }

    return null;
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Resume Optimizer</h1>
          <p className="text-gray-500">Optimize your resume for ATS and hiring managers</p>
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
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Overall Match</CardTitle>
                    <CardDescription>Resume-Job Fit</CardDescription>
                  </div>
                  <CircularProgress value={metrics.overall_match} />
                </div>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>ATS Score</CardTitle>
                <CardDescription>System Compatibility</CardDescription>
                <Progress value={metrics.ats_compatibility} className="mt-2" />
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Keyword Match</CardTitle>
                <CardDescription>Required Skills Coverage</CardDescription>
                <Progress value={metrics.keyword_match} className="mt-2" />
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Experience Fit</CardTitle>
                <CardDescription>Role Alignment</CardDescription>
                <Progress value={metrics.experience_alignment} className="mt-2" />
              </CardHeader>
            </Card>  
          </div>

          {/* Priority Improvements Section */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle>Priority Improvements</CardTitle>
              <CardDescription>Critical changes to improve your resume</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.find(section => section.title === "Priority Improvements")?.content && 
                  Array.isArray(analysis.find(section => section.title === "Priority Improvements")?.content) && 
                  (analysis.find(section => section.title === "Priority Improvements")?.content as any[]).map((improvement, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                      <Badge variant={improvement.priority === 'high' ? 'destructive' : 
                                  improvement.priority === 'medium' ? 'default' : 'secondary'}>
                        {improvement.priority}
                      </Badge>
                      <div>
                        <p className="font-medium">{improvement.change}</p>
                        <p className="text-sm text-muted-foreground">{improvement.reason}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

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
  );
}