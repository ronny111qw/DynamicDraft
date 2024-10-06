'use client'

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface AnalysisSection {
  title: string;
  content: string | string[];
}

export default function ResumeOptimizer() {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisSection[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeResume = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch('/api/resume-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze resume');
      }
      
      // Assuming the API returns a structured analysis
      setAnalysis(data.analysis);
    } catch (error) {
      console.error('Error analyzing resume:', error);
      setError(`An error occurred while analyzing the resume: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderAnalysisSection = (section: AnalysisSection) => (
    <div key={section.title} className="mb-4">
      <h3 className="text-lg font-semibold mb-2">{section.title}</h3>
      {Array.isArray(section.content) ? (
        <ul className="list-disc list-inside">
          {section.content.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{section.content}</p>
      )}
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">AI Resume Optimizer</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Your Resume</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume here..."
              rows={10}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              rows={10}
            />
          </CardContent>
        </Card>
      </div>
      <Button 
        onClick={analyzeResume} 
        disabled={isAnalyzing || !resumeText || !jobDescription}
        className="mt-4"
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
      {error && <p className="text-red-500 mt-2">Error: {error}</p>}
      {analysis && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.map(renderAnalysisSection)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}