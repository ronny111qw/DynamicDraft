// components/MockInterview.tsx
'use client'
import React, { useState } from 'react';

const MockInterview: React.FC = () => {
    const [response, setResponse] = useState('');
    const [feedback, setFeedback] = useState('');

    const handleSubmit = async () => {
        try {
            const apiResponse = await fetch('https://api.gemini.google.com/endpoint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer YOUR_API_KEY` // Replace with your API key
                },
                body: JSON.stringify({ answer: response })
            });

            const result = await apiResponse.json();
            setFeedback(result.feedback); // Adjust based on API response
        } catch (error) {
            console.error('Error:', error);
            setFeedback('An error occurred. Please try again.');
        }
    };

    return (
        <div className="max-w-lg mx-auto p-4 bg-white shadow-md rounded-lg">
            <h1 className="text-xl font-semibold mb-4">Mock Interview Simulator</h1>
            <video controls className="w-full mb-4">
                <source src="/path_to_your_video/interview_video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <label className="block mb-2" htmlFor="response">Your Response:</label>
            <textarea
                id="response"
                rows={4}
                className="w-full border border-gray-300 rounded-md p-2 mb-4"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
            />
            <button
                className="w-full bg-blue-500 text-white rounded-md py-2 hover:bg-blue-600"
                onClick={handleSubmit}
            >
                Submit
            </button>
            {feedback && <div className="mt-4 text-green-600">{feedback}</div>}
        </div>
    );
};

export default MockInterview;
