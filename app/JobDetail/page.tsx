import React from "react";
import axios from "axios";

const JobDetails = ({ job }) => {
    const handleApply = async () => {
        const userId = '123';
    try {
        await axios.post('http://localhost:5000/api/applications', { userId, jobId: job.id});
        alert('Application submitted successfully')
    } catch (error) {
        console.error('Error applying for job;', error);
    }
    
    
    };
    return (
    <div>
    <h2>{job.title}</h2>
    <p>{job.description}</p>
    <p><strong>Company:</strong></p>
    <p><strong>Location:</strong></p>
    <p><strong>Apply</strong></p>
    </div>
    );
}

export default JobDetails;
