import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

function extractJSONFromText(text: string): string {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    return text.substring(jsonStart, jsonEnd + 1);
  }
  throw new Error('No valid JSON found in the response');
}

export async function POST(req: Request) {
  try {
    console.log('Received request in API route');
    const { resumeText, jobDescription } = await req.json();

    if (!resumeText || !jobDescription) {
      console.log('Missing resume text or job description');
      return NextResponse.json({ error: 'Missing resume text or job description' }, { status: 400 });
    }

    console.log('Initializing AI model');
    const model = genAI.getGenerativeModel({ model: "gemini-pro"});

    const prompt = `
      Analyze the following resume and job description. Provide suggestions to optimize the resume for this specific job. Structure your response in the following JSON format:

      {
        "analysis": [
          {
            "title": "Summary",
            "content": "A brief overview of the analysis"
          },
          {
            "title": "Key Skills Match",
            "content": ["Skill 1", "Skill 2", "Skill 3"]
          },
          {
            "title": "Experience Alignment",
            "content": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
          },
          {
            "title": "Areas for Improvement",
            "content": ["Area 1", "Area 2", "Area 3"]
          },
          {
            "title": "Additional Recommendations",
            "content": "Any other suggestions for improving the resume"
          }
        ]
      }

      Resume:
      ${resumeText}

      Job Description:
      ${jobDescription}

      Provide your analysis and suggestions in the specified JSON format. Do not include any additional text or formatting outside of the JSON structure.
    `;

    console.log('Sending request to AI model');
    const result = await model.generateContent(prompt);
    console.log('Received response from AI model');
    const analysisText = result.response.text();

    console.log('Raw AI response:', analysisText);

    // Extract JSON from the response text
    const jsonString = extractJSONFromText(analysisText);

    // Parse the JSON response
    const analysisData = JSON.parse(jsonString);

    return NextResponse.json(analysisData);
  } catch (error) {
    console.error('Detailed error in resume analysis:', error);
    return NextResponse.json({ error: 'An error occurred during resume analysis', details: error.message }, { status: 500 });
  }
}