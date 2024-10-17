'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Save, Upload, Download, Trash2, CheckCircle, XCircle, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Types
type SubscriptionTier = 'free' | 'pro' | 'premium';

interface UserSubscription {
  tier: SubscriptionTier;
  analysisCount: number;
}

interface FormInputs {
  resumeText: string;
  jobDescription: string;
}

interface AnalysisDetails {
  matches: string[];
  missingKeywords: string[];
  suggestions: string[];
  impact: 'low' | 'medium' | 'high';
}

interface AnalysisSection {
  title: string;
  content: string;
  score: number;
  details: AnalysisDetails;
}

interface SavedAnalysis {
  id: string;
  date: Date;
  overallScore: number;
  sections: AnalysisSection[];
}

const TIER_LIMITS = {
  free: { analyses: 1, sections: 1 },
  pro: { analyses: 5, sections: 4 },
  premium: { analyses: Infinity, sections: 4 }
};

// Initial states
const initialInputs: FormInputs = {
  resumeText: '',
  jobDescription: ''
};

// CircularProgress component
const CircularProgress = ({ value }: { value: number }) => (
  <div className="relative h-16 w-16">
    <svg className="h-full w-full" viewBox="0 0 36 36">
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
      />
    </svg>
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg font-semibold">
      {value}%
    </div>
  </div>
);

// UpgradeDialog component
const UpgradeDialog = ({ trigger }: { trigger: React.ReactNode }) => (
  <Dialog>
    <DialogTrigger asChild>
      {trigger}
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Upgrade to Unlock Premium Features</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="text-green-500" />
          <span>Detailed analysis across multiple categories</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="text-green-500" />
          <span>Missing keyword identification</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="text-green-500" />
          <span>Tailored improvement suggestions</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Button>Upgrade to Pro</Button>
          <Button variant="outline">Learn More</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

// SubscriptionToggle component
const SubscriptionToggle = ({ 
  userSubscription, 
  setUserSubscription 
}: { 
  userSubscription: UserSubscription, 
  setUserSubscription: (sub: UserSubscription) => void 
}) => {
  return (
    <div className="fixed top-4 right-4 bg-white p-2 rounded shadow">
      <select 
        value={userSubscription.tier}
        onChange={(e) => setUserSubscription({ 
          tier: e.target.value as SubscriptionTier, 
          analysisCount: 0 
        })}
        className="border rounded p-1"
      >
        <option value="free">Free Tier</option>
        <option value="pro">Pro Tier</option>
        <option value="premium">Premium Tier</option>
      </select>
    </div>
  );
};

// Main ResumeOptimizer component
export default function ResumeOptimizer() {
  const [inputs, setInputs] = useState<FormInputs>(initialInputs);
  const [analysis, setAnalysis] = useState<AnalysisSection[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [overallScore, setOverallScore] = useState<number>(0);
  const [userSubscription, setUserSubscription] = useState<UserSubscription>({
    tier: 'free',
    analysisCount: 0
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  const getAnalysisByTier = (tier: SubscriptionTier): AnalysisSection[] => {
    const fullAnalysis = [
      {
        title: "Skills Match",
        content: "Your technical skills align well with the job requirements.",
        score: 75,
        details: {
          matches: ["JavaScript", "React", "Node.js"],
          missingKeywords: ["TypeScript", "AWS"],
          suggestions: ["Add experience with TypeScript", "Highlight any cloud platform experience"],
          impact: "high" as const
        }
      },
      {
        title: "Experience Relevance",
        content: "Your experience matches 70% of the job requirements.",
        score: 70,
        details: {
          matches: ["Web development", "Agile methodology"],
          missingKeywords: ["Team leadership", "Microservices"],
          suggestions: ["Emphasize any team leadership experience", "Highlight system architecture knowledge"],
          impact: "medium" as const
        }
      },
      {
        title: "Resume Format",
        content: "Your resume is well-structured but could use some improvements.",
        score: 80,
        details: {
          matches: ["Clear sections", "Professional summary"],
          missingKeywords: ["Quantifiable achievements"],
          suggestions: ["Add more metrics to your achievements", "Use action verbs to start bullet points"],
          impact: "medium" as const
        }
      },
      {
        title: "ATS Compatibility",
        content: "Your resume is largely ATS-friendly but has some formatting issues.",
        score: 85,
        details: {
          matches: ["Simple formatting", "Standard section headings"],
          missingKeywords: [],
          suggestions: ["Remove any tables or graphics", "Ensure all text is selectable"],
          impact: "high" as const
        }
      }
    ];

    if (tier === 'free') {
      return [{
        title: "Overall Analysis",
        content: "Basic resume analysis complete. Upgrade for detailed insights!",
        score: 75,
        details: {
          matches: fullAnalysis.flatMap(section => section.details.matches).slice(0, 3),
          missingKeywords: [],
          suggestions: ["Upgrade to Pro for detailed suggestions and improvements!"],
          impact: "medium" as const
        }
      }];
    }

    return fullAnalysis;
  };

  const analyzeResume = async () => {
    if (!inputs.resumeText || !inputs.jobDescription) {
      setError("Both fields must be filled out before analyzing.");
      return;
    }

    if (userSubscription.analysisCount >= TIER_LIMITS[userSubscription.tier].analyses) {
      setError(`You've reached the analysis limit for your ${userSubscription.tier} plan.`);
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const tierAnalysis = getAnalysisByTier(userSubscription.tier);
      setAnalysis(tierAnalysis);
      setOverallScore(userSubscription.tier === 'free' ? 75 : 78);
      
      setUserSubscription(prev => ({
        ...prev,
        analysisCount: prev.analysisCount + 1
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error occurred.';
      setError(`An error occurred while analyzing the resume: ${errorMessage}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderLockedFeature = (feature: React.ReactNode) => (
    <div className="relative">
      <div className="absolute inset-0 bg-gray-100 bg-opacity-70 flex items-center justify-center z-10">
        <UpgradeDialog 
          trigger={
            <Button variant="outline" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Upgrade to Unlock
            </Button>
          }
        />
      </div>
      {feature}
    </div>
  );

  const renderAnalysisSection = (section: AnalysisSection) => (
    <Card key={section.title} className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{section.title}</CardTitle>
            <CardDescription>{section.content}</CardDescription>
          </div>
          <CircularProgress value={section.score} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Matching Keywords</h4>
            <div className="flex flex-wrap gap-2">
              {section.details.matches.map((keyword, i) => (
                <Badge key={i} variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
          
          {userSubscription.tier !== 'free' && section.details.missingKeywords.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Missing Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {section.details.missingKeywords.map((keyword, i) => (
                  <Badge key={i} variant="secondary" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <h4 className="font-semibold mb-2">Suggestions</h4>
            {userSubscription.tier === 'free' ? (
              renderLockedFeature(
                <ul className="list-disc list-inside space-y-1 blur-sm">
                  <li>Detailed suggestion 1</li>
                  <li>Detailed suggestion 2</li>
                  <li>Detailed suggestion 3</li>
                </ul>
              )
            ) : (
              <ul className="list-disc list-inside space-y-1">
                {section.details.suggestions.map((suggestion, i) => (
                  <li key={i}>{suggestion}</li>
                ))}
              </ul>
            )}
          </div>
          
          {userSubscription.tier !== 'free' && (
            <div className="flex items-center gap-2">
              <span className="font-semibold">Impact Level:</span>
              <Badge variant={
                section.details.impact === 'high' ? 'destructive' :
                section.details.impact === 'medium' ? 'default' : 'secondary'
              }>
                {section.details.impact.charAt(0).toUpperCase() + section.details.impact.slice(1)}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
      {userSubscription.tier === 'free' && (
        <CardFooter>
          <UpgradeDialog 
            trigger={
              <Button className="w-full">Upgrade for Full Analysis</Button>
            }
          />
        </CardFooter>
      )}
    </Card>
  );

  return (
    <div className="container mx-auto p-4">
      <SubscriptionToggle userSubscription={userSubscription} setUserSubscription={setUserSubscription} />
      
      <div className='flex justify-between items-center mb-8'>
        <h1 className="text-3xl font-bold">AI Resume Optimizer</h1>
        <Badge variant={userSubscription.tier === 'premium' ? 'default' : 'secondary'}>
          {userSubscription.tier.charAt(0).toUpperCase() + userSubscription.tier.slice(1)} Plan
        </Badge>
      </div>
      
      <Alert className="mb-4">
        <AlertTitle>Analysis Credits Remaining</AlertTitle>
        <AlertDescription>
          You have used {userSubscription.analysisCount} out of {TIER_LIMITS[userSubscription.tier].analyses} 
          {TIER_LIMITS[userSubscription.tier].analyses === Infinity ? '' : ' available'} analyses.
          {userSubscription.tier !== 'premium' && (
            <Button variant="link" className="p-0 ml-2">
              Upgrade for more
            </Button>
          )}
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="input">
        <TabsList className="mb-4">
          <TabsTrigger value="input">Input</TabsTrigger>
          <TabsTrigger value="saved">
            Saved Analyses ({savedAnalyses.length})
            {userSubscription.tier === 'free' && <Lock className="ml-1 h-3 w-3" />}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="input">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Resume Text</CardTitle>
                <CardDescription>Paste your resume text here</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  name="resumeText"
                  value={inputs.resumeText}
                  onChange={handleInputChange}
                  placeholder="Paste your resume here..."
                  className="min-h-[200px]"
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
                  name="jobDescription"
                  value={inputs.jobDescription}
                  onChange={handleInputChange}
                  placeholder="Paste the job description here..."
                  className="min-h-[200px]"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="saved">
          {userSubscription.tier === 'free' ? (
            <Card>
              <CardHeader>
                <CardTitle>Saved Analyses</CardTitle>
                <CardDescription>
                  Upgrade to Pro or Premium to save and compare multiple analyses!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UpgradeDialog 
                  trigger={
                    <Button className="w-full">Upgrade to Save Analyses</Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedAnalyses.map((savedAnalysis) => (
                <Card key={savedAnalysis.id}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Analysis #{savedAnalysis.id}</CardTitle>
                        <CardDescription>
                          {savedAnalysis.date.toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <CircularProgress value={savedAnalysis.overallScore} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-2">
                      Sections analyzed: {savedAnalysis.sections.length}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {savedAnalysis.sections.map((section, index) => (
                        <Badge key={index} variant="outline">
                          {section.title}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                    <Button size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Load
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 mt-4">
        <Button 
          onClick={analyzeResume} 
          disabled={isAnalyzing || userSubscription.analysisCount >= TIER_LIMITS[userSubscription.tier].analyses}
          className="w-full md:w-auto"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Resume'
          )}
        </Button>
        {analysis && (
          <>
            <Button 
              onClick={() => {
                if (userSubscription.tier !== 'free' && analysis) {
                  const newSavedAnalysis: SavedAnalysis = {
                    id: (savedAnalyses.length + 1).toString(),
                    date: new Date(),
                    overallScore: overallScore,
                    sections: analysis
                  };
                  setSavedAnalyses([...savedAnalyses, newSavedAnalysis]);
                }
              }} 
              variant="outline"
              disabled={userSubscription.tier === 'free'}
            >
              {userSubscription.tier === 'free' && <Lock className="mr-2 h-4 w-4" />}
              <Save className="mr-2 h-4 w-4" />
              Save Analysis
            </Button>
            <Button 
              onClick={() => {
                // Implement download functionality here
                console.log('Download report');
              }} 
              variant="outline"
              disabled={userSubscription.tier !== 'premium'}
            >
              {userSubscription.tier !== 'premium' && <Lock className="mr-2 h-4 w-4" />}
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          </>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {analysis && (
        <div className="mt-8">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Overall Match Score</CardTitle>
                  <CardDescription>Based on {userSubscription.tier === 'free' ? 'basic' : 'comprehensive'} analysis</CardDescription>
                </div>
                <CircularProgress value={overallScore} />
              </div>
            </CardHeader>
          </Card>
          
          <div className="space-y-6">
            {analysis.map(renderAnalysisSection)}
            {userSubscription.tier === 'free' && analysis.length === TIER_LIMITS.free.sections && (
              <Card className="border-dashed border-2 p-6">
                <CardHeader>
                  <CardTitle>Unlock More Insights</CardTitle>
                  <CardDescription>
                    Upgrade to Pro or Premium to receive detailed analysis across multiple categories:
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Experience Relevance Analysis
                    </li>
                    <li className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      ATS Compatibility Check
                    </li>
                    <li className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Resume Format Optimization
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <UpgradeDialog 
                    trigger={
                      <Button className="w-full">Upgrade Now</Button>
                    }
                  />
                </CardFooter>
              </Card>
            )}
          </div>
        </div>
      )}
      
      {userSubscription.tier === 'free' && (
        <div className="fixed bottom-4 right-4">
          <UpgradeDialog 
            trigger={
              <Button className="shadow-lg">
                Upgrade for Full Analysis
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
} 