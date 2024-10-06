import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { rateLimit } from '@/lib/rate-limit';
import { cache } from '@/lib/cache';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500 // Max 500 users per minute
});

export async function POST(req: Request) {
  try {
    await limiter.check(5, 'CACHE_TOKEN'); // 5 requests per minute
  } catch {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let resumeData, jobDescription;
  try {
    ({ resumeData, jobDescription } = await req.json());
  } catch (error) {
    console.error('Error parsing request body:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!resumeData || !jobDescription) {
    return NextResponse.json({ error: 'Missing resumeData or jobDescription' }, { status: 400 });
  }

  const cacheKey = `job-match:${JSON.stringify(resumeData)}:${jobDescription}`;
  const cachedResult = await cache.get(cacheKey);
  if (cachedResult) {
    return NextResponse.json(JSON.parse(cachedResult));
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro"});

    const prompt = `
    Analyze the following resume and job description. Provide:
      1. A match score (percentage)
      2. Keywords present in both the resume and job description
      3. Keywords missing from the resume but present in the job description
      4. Section-specific suggestions for improving the resume (skills, experience, education, projects)

      Resume:
      ${JSON.stringify(resumeData)}

      Job Description:
      ${jobDescription}

      Respond with a JSON object in the following format, without any additional text or formatting:
      {
        "score": number,
        "presentKeywords": string[],
        "missingKeywords": string[],
        "suggestions": {
          "skills": string[],
          "experience": string[],
          "education": string[],
          "projects": string[]
        }
      }

      The score should be an integer between 0 and 100. Provide concise, actionable suggestions for each section.
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text().trim();
    
    console.log("AI Response:", text); // Log the raw response

    // Remove any potential JSON formatting or code block indicators
    text = text.replace(/^```json\s?|\s?```$/g, '');

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return NextResponse.json({ error: 'Invalid response from AI model' }, { status: 500 });
    }

    if (!Number.isInteger(jsonResponse.score) || 
        jsonResponse.score < 0 || 
        jsonResponse.score > 100 || 
        !Array.isArray(jsonResponse.presentKeywords) ||
        !Array.isArray(jsonResponse.missingKeywords) ||
        typeof jsonResponse.suggestions !== 'object') {
      console.error("Unexpected response structure:", jsonResponse);
      return NextResponse.json({ error: 'Unexpected response structure from AI model' }, { status: 500 });
    }

    // Ensure each suggestion section is an array
    ['skills', 'experience', 'education', 'projects'].forEach(section => {
      if (!Array.isArray(jsonResponse.suggestions[section])) {
        jsonResponse.suggestions[section] = [];
      }
    });

    await cache.set(cacheKey, JSON.stringify(jsonResponse), 300);

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Error in job matching:', error);
    return NextResponse.json({ error: 'An error occurred during job matching' }, { status: 500 });
  }
}