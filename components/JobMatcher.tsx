// components/JobMatcher.tsx

import React, { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface JobMatcherProps {
  resumeData: any;
}

interface MatchResult {
  score: number;
  presentKeywords: {
    technical: string[];
    soft: string[];
    industry: string[];
  };
  missingKeywords: {
    critical: string[];
    preferred: string[];
  };
  gapAnalysis: {
    experience: string;
    education: string;
    technical: string[];
    certifications: string[];
  };
  suggestions: {
    skills: string[];
    experience: string[];
    education: string[];
    projects: string[];
  };
}

// Add this utility function for score colors
const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
};

export default function JobMatcher({ resumeData }: JobMatcherProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeJobMatch = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch('/api/job-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resumeData, jobDescription }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const results: MatchResult = await response.json();
      setMatchResults(results);
    } catch (error) {
      console.error('Error analyzing job match:', error);
      setError('An error occurred while analyzing the job match. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderKeywords = (keywords: { [key: string]: string[] } | undefined, isPresent: boolean) => {
    if (!keywords) return null;
    
    return (
      <div className="space-y-4">
        {Object.entries(keywords).map(([category, words]) => (
          <div key={category}>
            <h5 className="font-medium capitalize mb-2 text-gray-300">{category}:</h5>
            <div className="flex flex-wrap gap-2">
              {words.length > 0 ? (
                words.map((word, index) => (
                  <span 
                    key={index} 
                    className={`inline-block rounded-full px-3 py-1 text-sm font-semibold 
                      ${isPresent 
                        ? 'bg-green-900/50 text-green-300 border border-green-700' 
                        : 'bg-red-900/50 text-red-300 border border-red-700'}`}
                  >
                    {word}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 italic">No {category} keywords found in the job description</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSectionSuggestions = (section: string, suggestions: string[]) => (
    <div className="mt-4">
      <h5 className="font-semibold capitalize text-gray-300">{section}:</h5>
      {suggestions.length > 0 ? (
        <ul className="list-disc list-inside text-gray-300">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="text-gray-400">{suggestion}</li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 italic">No suggestions available for this section</p>
      )}
    </div>
  );

  return (
    <Card className="mt-6 bg-[#1a1a1a] border-2 border-gray-800 shadow-xl">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="text-2xl font-bold text-white">Job Description Matcher</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <Textarea
          placeholder="Paste the job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          className="mb-4 h-32 bg-[#2a2a2a] text-gray-200 border-gray-700 focus:border-gray-600 placeholder:text-gray-500"
        />
        <Button 
          onClick={analyzeJobMatch} 
          disabled={isAnalyzing || !jobDescription.trim()}
          className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-700"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Job Match'
          )}
        </Button>
        {error && <p className="text-red-400 mt-2">{error}</p>}
        {matchResults && (
          <div className="mt-6 space-y-6">
            <h3 className="text-xl font-semibold text-white">Match Results:</h3>
            <div className="flex items-center gap-4 bg-[#2a2a2a] p-4 rounded-lg border border-gray-800">
              <Progress 
                value={matchResults.score} 
                className="w-full bg-gray-700"
                indicatorClassName={`${getScoreColor(matchResults.score)} bg-current transition-all`}
              />
              <span className={`text-lg font-semibold whitespace-nowrap ${getScoreColor(matchResults.score)}`}>
                {matchResults.score}%
              </span>
            </div>
            
            <div className="bg-[#2a2a2a] p-4 rounded-lg border border-gray-800">
              <h4 className="font-semibold mb-3 text-white">Keywords Present in Resume:</h4>
              {renderKeywords(matchResults.presentKeywords, true)}
            </div>
            
            <div className="bg-[#2a2a2a] p-4 rounded-lg border border-gray-800">
              <h4 className="font-semibold mb-3 text-white">Missing Keywords:</h4>
              {renderKeywords(matchResults.missingKeywords, false)}
            </div>

            <div className="bg-[#2a2a2a] p-4 rounded-lg border border-gray-800">
              <h4 className="font-semibold mb-3 text-white">Gap Analysis:</h4>
              <div className="space-y-3 text-gray-300">
                <p><strong className="text-white">Experience:</strong> {matchResults.gapAnalysis.experience}</p>
                <p><strong className="text-white">Education:</strong> {matchResults.gapAnalysis.education}</p>
                <div>
                  <strong className="text-white">Technical Gaps:</strong>
                  {matchResults.gapAnalysis.technical.length > 0 ? (
                    <ul className="list-disc list-inside mt-1 text-gray-400">
                      {matchResults.gapAnalysis.technical.map((gap, index) => (
                        <li key={index}>{gap}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-gray-500 italic">No technical gaps identified</p>
                  )}
                </div>
                <div>
                  <strong className="text-white">Required Certifications:</strong>
                  {matchResults.gapAnalysis.certifications.length > 0 ? (
                    <ul className="list-disc list-inside mt-1 text-gray-400">
                      {matchResults.gapAnalysis.certifications.map((cert, index) => (
                        <li key={index}>{cert}</li>
                      ))}
                    </ul>  
                  ) : (
                    <p className="mt-1 text-gray-500 italic">No certification requirements found in the job description</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-[#2a2a2a] p-4 rounded-lg border border-gray-800">
              <h4 className="font-semibold mb-3 text-white">Improvement Suggestions:</h4>
              {Object.entries(matchResults.suggestions).map(([section, suggestions]) => 
                renderSectionSuggestions(section, suggestions)
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}