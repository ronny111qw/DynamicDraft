"use client"


   import React, { useState } from 'react';
   import axios from 'axios';
   import JobDetails from '../JobDetail/page';

   const JobSearch = () => {
       const [jobTitle, setJobTitle] = useState('');
       const [location, setLocation] = useState('');
       const [jobs, setJobs] = useState([]);
       const [selectedJob, setSelectedJob] = useState(null);

       const handleSearch = async () => {
           try {
               const response = await axios.get(`http://localhost:5000/api/jobs?title=${jobTitle}&location=${location}`);
               setJobs(response.data);
           } catch (error) {
               console.error("Error fetching jobs:", error);
           }
       };

       return (
           <div>
               <h2>Job Search</h2>
               <input type="text" placeholder="Job Title" onChange={(e) => setJobTitle(e.target.value)} />
               <input type="text" placeholder="Location" onChange={(e) => setLocation(e.target.value)} />
               <button onClick={handleSearch}>Search</button>
               <div>
                   {jobs.map(job => (
                       <div key={job.id}>
                           <h3>{job.title}</h3>
                           <p>{job.company}</p>
                           <button onClick={() => setSelectedJob(job)}>View Details</button>
                           <button>Apply Now</button>
                       </div>
                   ))}
               </div>
               {selectedJob && <JobDetails job={selectedJob} />}
               <div>
        <a href='https://www.glassdoor.com/index.htm'>powered by <img src='https://www.glassdoor.com/static/img/api/glassdoor_logo_80.png' title='Job Search' /></a>
        </div>
           </div>
       );
   };

   export default JobSearch;