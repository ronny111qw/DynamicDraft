'use client'
import React, { useState, useEffect } from 'react';
import { Search, Briefcase, MapPin, Calendar, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

const API_BASE_URL = 'http://localhost:3001/api';

function JobBoard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(null);

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [searchTerm]);

  const performSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/search-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: searchTerm,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      setJobs(data.matchingJobs);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setError('Failed to fetch jobs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreJobs = async () => {
    if (!nextPageToken || loading) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/search-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: searchTerm,
          pageToken: nextPageToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch more jobs');
      }

      const data = await response.json();
      setJobs([...jobs, ...data.matchingJobs]);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setError('Failed to load more jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJobSelect = async (jobName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/job/${encodeURIComponent(jobName)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      
      const jobDetails = await response.json();
      setSelectedJob(jobDetails);
    } catch (err) {
      setError('Failed to fetch job details. Please try again.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Job Board</h1>
      
      <div className="relative mb-6">
        <Input
          type="text"
          placeholder="Search jobs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          {loading && jobs.length === 0 ? (
            <Card className="p-4 text-center">
              <Loader2 className="animate-spin mx-auto" />
              <p className="mt-2">Loading jobs...</p>
            </Card>
          ) : jobs.length === 0 ? (
            <Card className="p-4 text-center">
              <p>No jobs found. Try adjusting your search.</p>
            </Card>
          ) : (
            <>
              {jobs.map(({ job }) => (
                <Card 
                  key={job.name}
                  className={`cursor-pointer hover:shadow-lg transition-shadow ${
                    selectedJob?.name === job.name ? 'border-blue-500 border-2' : ''
                  }`}
                  onClick={() => handleJobSelect(job.name)}
                >
                  <CardHeader>
                    <CardTitle className="flex justify-between">
                      <span>{job.title}</span>
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {job.employmentTypes?.[0] || 'Not specified'}
                      </span>
                    </CardTitle>
                    <CardDescription>{job.company}</CardDescription>
                  </CardHeader>
                  <CardFooter className="text-sm text-gray-500">
                    <div className="flex space-x-4">
                      <span className="flex items-center">
                        <MapPin size={16} className="mr-1" />
                        {job.locations?.[0]?.city || 'Location not specified'}
                      </span>
                      <span className="flex items-center">
                        <Calendar size={16} className="mr-1" />
                        {new Date(job.postingCreateTime).toLocaleDateString()}
                      </span>
                    </div>
                  </CardFooter>
                </Card>
              ))}
              {nextPageToken && (
                <Button 
                  onClick={loadMoreJobs} 
                  disabled={loading}
                  className="w-full mt-4"
                >
                  {loading ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : null}
                  Load More Jobs
                </Button>
              )}
            </>
          )}
        </div>

        <div>
          {selectedJob ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedJob.title}</CardTitle>
                <CardDescription className="flex items-center">
                  <Briefcase className="mr-2" size={16} />
                  {selectedJob.company}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="mb-4"
                  dangerouslySetInnerHTML={{ __html: selectedJob.description }}
                />
                {selectedJob.applicationInfo?.websites && (
                  <Button 
                    className="w-full"
                    onClick={() => window.open(selectedJob.applicationInfo.websites[0], '_blank')}
                  >
                    Apply Now
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Briefcase size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Select a job to see more details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default JobBoard;