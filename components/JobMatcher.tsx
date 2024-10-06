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
  presentKeywords: string[];
  missingKeywords: string[];
  suggestions: {
    skills: string[];
    experience: string[];
    education: string[];
    projects: string[];
  };
}

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

  const renderKeywords = (keywords: string[], isPresent: boolean) => (
    <div className={`mt-2 ${isPresent ? 'text-green-600' : 'text-red-600'}`}>
      {keywords.map((keyword, index) => (
        <span key={index} className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold mr-2 mb-2">
          {keyword}
        </span>
      ))}
    </div>
  );

  const renderSectionSuggestions = (section: string, suggestions: string[]) => (
    <div className="mt-4">
      <h5 className="font-semibold capitalize">{section}:</h5>
      <ul className="list-disc list-inside">
        {suggestions.map((suggestion, index) => (
          <li key={index}>{suggestion}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Job Description Matcher</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Paste the job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          className="mb-4 h-32"
        />
        <Button onClick={analyzeJobMatch} disabled={isAnalyzing || !jobDescription.trim()}>
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Job Match'
          )}
        </Button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
        {matchResults && (
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-2">Match Results:</h3>
            <div className="flex items-center mb-4">
              <Progress value={matchResults.score} className="w-full mr-4" />
              <span className="text-lg font-semibold">{matchResults.score}%</span>
            </div>
            
            <h4 className="font-semibold mt-4 mb-2">Keywords Present in Resume:</h4>
            {renderKeywords(matchResults.presentKeywords, true)}
            
            <h4 className="font-semibold mt-4 mb-2">Keywords Missing from Resume:</h4>
            {renderKeywords(matchResults.missingKeywords, false)}
            
            <h4 className="font-semibold mt-4 mb-2">Section-Specific Suggestions:</h4>
            {Object.entries(matchResults.suggestions).map(([section, suggestions]) => 
              renderSectionSuggestions(section, suggestions)
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}