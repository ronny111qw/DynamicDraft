"use client"

import React, { useCallback, useEffect, useState, useRef } from "react"
import debounce from 'lodash/debounce'
import { checkGrammar, isResumeSpecificTerm } from '../utils/grammarCheck';
import { GrammarSuggestions } from '../components/GrammarSuggestions';
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Inter, Roboto, Open_Sans } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
const roboto = Roboto({ weight: ['400', '700'], subsets: ['latin'] })
const openSans = Open_Sans({ subsets: ['latin'] })
import { Button } from "@/components/ui/button"  
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SpellCheck, Check, PlusCircle, Trash2, Download, Menu, FileText, Loader2, GripVertical } from "lucide-react"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import Joyride, { CallBackProps, STATUS } from 'react-joyride'
import Link from 'next/link'
import '../app/globals.css'


const GrammarCheckInputWrapper = ({ 
  value, 
  onChange, 
  onGrammarCheck, 
  isChecking, 
  placeholder,
  className
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGrammarCheck: () => void;
  isChecking: boolean;
  placeholder: string;
  className?: string;
}) => {
  return (
    <div className="relative w-full">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`pr-8 ${className}`}  // Add right padding to make room for the button
      />
      <button
        onClick={onGrammarCheck}
        disabled={isChecking}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-blue-500 transition-colors"
        title="Check Grammar"
      >
        {isChecking ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <SpellCheck className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

export  function Home() {
  const router = useRouter()

  useEffect(() => {
    router.push('/dashboard')
  }, [router]) 

  return null
}


interface ResumeData {
  name: string 
  phone: string
  email: string
  linkedin: string
  github: string
  education: Array<{
    school: string
    degree: string
    location: string
    graduationDate: string
  }>
  experience: Array<{
    title: string
    company: string
    location: string
    startDate: string
    endDate: string
    responsibilities: string[]
  }>;
  projects: Array<{
    name: string
    technologies: string
    startDate: string
    endDate: string
    details: string[]
  }>
  skills: {
    languages: string
    frameworks: string
    developerTools: string
    libraries: string
  }
}

const JoyrideNoSSR = dynamic(
() => import('react-joyride').then((mod) => mod.default),
{ ssr: false}
)


export default function ResumeBuilder() {
  const [resumeData, setResumeData] = useState<ResumeData>({
    name: "Jake Ryan",
    phone: "123-456-7890",
    email: "jake@su.edu",
    linkedin: "linkedin.com/in/jake",
    github: "github.com/jake",
    education: [
      {
        school: "Southwestern University",
        degree: "Bachelor of Arts in Computer Science, Minor in Business",
        location: "Georgetown, TX",
        graduationDate: "Aug. 2018 - May 2021",
      },
      {
        school: "Blinn College",
        degree: "Associate's in Liberal Arts",
        location: "Bryan, TX",
        graduationDate: "Aug. 2014 - May 2018",
      },
    ],
    experience: [
      {
        title: "Undergraduate Research Assistant",
        company: "Texas A&M University",
        location: "College Station, TX",
        startDate: "June 2020",
        endDate: "Present",
        responsibilities: [
          "Developed a REST API using FastAPI and PostgreSQL to store data from learning management systems",
          "Developed a full-stack web application using Flask, React, PostgreSQL and Docker to analyze GitHub data",
          "Explored ways to visualize GitHub collaboration in a classroom setting",
        ],
      },
      {
        title: "Information Technology Support Specialist",
        company: "Southwestern University",
        location: "Georgetown, TX",
        startDate: "Sep. 2018",
        endDate: "Present",
        responsibilities: [
          "Communicate with managers to set up campus computers used on campus",
          "Assess and troubleshoot computer problems brought by students, faculty and staff",
          "Maintain upkeep of computers, classroom equipment, and 200 printers across campus",
        ],
      },
    ],
    projects: [
      {
        name: "Gitlytics",
        technologies: "Python, Flask, React, PostgreSQL, Docker",
        startDate: "June 2020",
        endDate: "Present",
        details: [
          "Developed a full-stack web application using with Flask serving a REST API with React as the frontend",
          "Implemented GitHub OAuth to get data from user's repositories",
          "Visualized GitHub data to show collaboration",
          "Used Celery and Redis for asynchronous tasks",
        ],
      },
      {
        name: "Simple Paintball",
        technologies: "Spigot API, Java, Maven, TravisCI, Git",
        startDate: "May 2018",
        endDate: "May 2020",
        details: [
          "Developed a Minecraft server plugin to entertain kids during free time for a previous job",
          "Published plugin to websites gaining 2K+ downloads and an average 4.5/5-star review",
          "Implemented continuous delivery using TravisCI to build the plugin upon new a release",
          "Collaborated with Minecraft server administrators to suggest features and get feedback about the plugin",
        ],
      },
    ],
    skills: {
      languages: "Java, Python, C/C++, SQL (Postgres), JavaScript, HTML/CSS, R",
      frameworks: "React, Node.js, Flask, JUnit, WordPress, Material-UI, FastAPI",
      developerTools: "Git, Docker, TravisCI, Google Cloud Platform, VS Code, Visual Studio, PyCharm, IntelliJ, Eclipse",
      libraries: "pandas, NumPy, Matplotlib",
    },
  })

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [grammarSuggestions, setGrammarSuggestions] = useState<{[key: string]: GrammarSuggestion[]}>({});
  const textCache = useRef<{[key: string]: string}>({});
  const apiCallTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastApiCallTimeRef = useRef<number>(0);
  const [checkingField, setCheckingField] = useState<string | null>(null);
  const pendingChecksRef = useRef<{[key: string]: string}>({});
  const [isExporting, setIsExporting] = useState(false)
  const [sectionOrder, setSectionOrder] = useState(['personal', 'education', 'experience', 'projects', 'skills'])
  const [aiSuggestions, setAiSuggestions] = useState<string>("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [theme, setTheme] = useState('default')
  const [font, setFont] = useState('inter')
  const [showHelp, setShowHelp] = useState(false)
  const [runTour, setRunTour] = useState(false)
  const [lastApiCallTime, setLastApiCallTime] = useState(0);
  const [isAdvancedCheckLoading, setIsAdvancedCheckLoading] = useState(false);
const [isApiCallLoading, setIsApiCallLoading] = useState(false); 



  const handleAdvancedCheck = useCallback(async (field: string) => {
    setIsAdvancedCheckLoading(true);
    try {
      const text = getNestedValue(resumeData, field);
      const results = await checkGrammar(text, true);
      setGrammarSuggestions(prev => ({
        ...prev,
        [field]: results.filter(result => !isResumeSpecificTerm(result.original))
      }));
    } catch (error) {
      console.error('Error in advanced grammar check:', error);
    } finally {
      setIsAdvancedCheckLoading(false);
    }
  }, [resumeData]);

  const handleFeedback = useCallback((suggestion: GrammarSuggestion, isHelpful: boolean) => {
    console.log(`Feedback for suggestion "${suggestion.original}": ${isHelpful ? 'Helpful' : 'Not helpful'}`);
    // Here you can implement logic to store feedback or adjust suggestions based on user input
  }, []);

  const debouncedCheckGrammar = useCallback(
    debounce(async (text: string, field: string, useApi: boolean = false) => {
      console.log(`Grammar check for field ${field}. Use API: ${useApi}`);
      try {
        const results = await checkGrammar(text, useApi);
        setGrammarSuggestions(prev => ({
          ...prev,
          [field]: results.filter(result => !isResumeSpecificTerm(result.original))
        }));
      } catch (error) {
        console.error('Error checking grammar:', error);
      }
    }, 300),
    []
  );

  const handleApiGrammarCheck = useCallback(async (field: string) => {
    const now = Date.now();
    if (now - lastApiCallTime < 60000) {
      console.log('API call on cooldown. Please wait before trying again.');
      return;
    }
  
    setCheckingField(field);
  try {
    const text = getNestedValue(resumeData, field);
    if (typeof text !== 'string') {
      console.error(`Field ${field} is not a string:`, text);
      return;
    }
    const results = await checkGrammar(text, true);
    setGrammarSuggestions(prev => ({
      ...prev,
      [field]: results.filter(result => !isResumeSpecificTerm(result.original))
    }));
    setLastApiCallTime(now);
  } catch (error) {
    console.error('Error in API grammar check:', error);
  } finally {
    setCheckingField(null);
  }
}, [resumeData, lastApiCallTime]);
  
  



  const batchCheckGrammar = useCallback(
    debounce((updates: {[key: string]: string}) => {
      const changedFields = Object.entries(updates).filter(
        ([key, value]) => value !== textCache.current[key]
      );

      if (changedFields.length === 0) return;

      const newSuggestions = changedFields.reduce((acc, [key, value]) => {
        const results = checkGrammar(value);
        acc[key] = results.filter(result => !isResumeSpecificTerm(result.original));
        return acc;
      }, {} as {[key: string]: any[]});

      setGrammarSuggestions(prev => ({...prev, ...newSuggestions}));
      textCache.current = {...textCache.current, ...updates};
    }, 500),
    []
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setResumeData(prevData => updateNestedField(prevData, name, value));
  
    // Always perform local checks immediately
    debouncedCheckGrammar(value, name, false);
  
    // Schedule API check
    const now = Date.now();
    if (now - lastApiCallTime >= 60000) { // 1 minute cooldown
      console.log('Cooldown period over, calling API check');
      handleApiGrammarCheck(value, name);  // Use handleApiGrammarCheck instead of debouncedCheckGrammar
      setLastApiCallTime(now);
    } else {
      console.log('Cooldown period not over, skipping API check');
    }
  }, [debouncedCheckGrammar, lastApiCallTime]);
 

  

  const applySuggestion = useCallback((field: string, suggestion: GrammarSuggestion) => {
    setResumeData(prevData => {
      const currentText = getNestedValue(prevData, field);
      const newText = currentText.slice(0, suggestion.index) + 
                      suggestion.suggestion + 
                      currentText.slice(suggestion.index + suggestion.length);
      return updateNestedField(prevData, field, newText);
    });
  }, []);

  // Helper function to get nested value
  const getNestedValue = (obj: any, path: string) => {
    return path.split(/\.|\[|\]/).filter(Boolean).reduce((prev, curr) => {
      if (prev && typeof prev === 'object') {
        return prev[curr];
      }
      return undefined;
    }, obj);
  };


  const updateNestedField = (data: any, path: string, value: any) => {
    const fields = path.split('.');
    const result = {...data};
    let current = result;
    for (let i = 0; i < fields.length - 1; i++) {
      current[fields[i]] = {...current[fields[i]]};
      current = current[fields[i]];
    }
    current[fields[fields.length - 1]] = value;
    return result;
  };

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour')
    if (!hasSeenTour) {
      setRunTour(true)
      localStorage.setItem('hasSeenTour', 'true')
    }
  }, [])

  useEffect(() => {
    const savedResume = localStorage.getItem('currentResume')
    const selectedTemplate = localStorage.getItem('selectedTemplate')
    if(selectedTemplate){
      setResumeData(JSON.parse(selectedTemplate))
      localStorage.removeItem('selectedTemplate')
    } else if (savedResume) {
      setResumeData(JSON.parse(savedResume))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('currentResume', JSON.stringify(resumeData))
  }, [resumeData])

  const steps = [
    {
      target: '.personal-info-section',
      content: 'Start by filling in your personal information.',
      disableBeacon: true,
    },
    {
      target: '.education-section',
      content: 'Add your educational background here.',
    },
    {
      target: '.experience-section',
      content: 'List your work experiences in this section.',
    },
    {
      target: '.projects-section',
      content: 'Showcase your projects here.',
    },
    {
      target: '.skills-section',
      content: 'Highlight your skills in this section.',
    },
    {
      target: '.customization-section',
      content: 'Customize the look of your resume with different themes and fonts.',
    },
    {
      target: '.preview-section',
      content: 'Preview your resume in real-time here.',
    },
    {
      target: '.ai-suggestions',
      content: 'Get AI-powered suggestions to improve your resume content.',
    },
  ];

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
    }
    // You can add more logic here based on the Joyride events
    console.log('Joyride event:', type, status);
  }, []);


  const analyzeResume = async () => {
    setIsAnalyzing(true);
    try {
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: "gemini-pro"});

      const prompt = `Analyze the following resume and provide structured suggestions for improvement:

${JSON.stringify(resumeData, null, 2)}

Please provide feedback in the following format:

1. Overall Structure and Formatting:
[Your feedback here]

2. Content Relevance and Impact:
[Your feedback here]

3. Section-specific Improvements:
a) Personal Information:
[Your feedback here]
b) Education:
[Your feedback here]
c) Experience:
[Your feedback here]
d) Projects:
[Your feedback here] 
e) Skills:
[Your feedback here]

4. Missing Information:
[Your feedback here]

5. General Tips:
[Your feedback here]

Please ensure each section is clearly separated and labeled.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the structured response
      const parsedSuggestions = parseAISuggestions(text);

      setAiSuggestions(parsedSuggestions);
    } catch (error) {
      console.error("Error analyzing resume:", error);
      setAiSuggestions("An error occurred while analyzing the resume.");
    }
    setIsAnalyzing(false);
  };

  const parseAISuggestions = (text: string): string => {
    const sections = [
      "Overall Structure and Formatting",
      "Content Relevance and Impact",
      "Section-specific Improvements",
      "Missing Information",
      "General Tips"
    ];

    let parsedText = "";
    let currentSection = "";

    text.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (sections.some(section => trimmedLine.startsWith(section))) {
        currentSection = trimmedLine;
        parsedText += `\n\n### ${currentSection}\n`;
      } else if (trimmedLine.match(/^[a-e]\)/)) {
        parsedText += `\n#### ${trimmedLine}\n`;
      } else if (trimmedLine) {
        parsedText += `${trimmedLine}\n`;
      }
    });

    return parsedText.trim();
  };

  const ensureArray = (value: any): any[] => {
    if (Array.isArray(value)) {
      return value;
    }
    if (value === undefined || value === null) {
      return [];
    }
    return [value];
  };


  const updateField = (field: string, value: any) => {
    setResumeData((prevData) => {
      const newData = { ...prevData };
      const keys = field.split('.');
      let current: any = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      const lastKey = keys[keys.length - 1];
      if (lastKey === 'responsibilities') {
        current[lastKey] = ensureArray(value);
      } else {
        current[lastKey] = value;
      }
      return newData;
    });
  };

  const addListItem = (field: "experience" | "education" | "projects") => {
    setResumeData((prev) => ({
      ...prev,
      [field]: [
        ...prev[field],
        field === "experience"
          ? { title: "", company: "", location: "", startDate: "", endDate: "", responsibilities: [] }
          : field === "education"
          ? { degree: "", school: "", location: "", graduationDate: "" }
          : { name: "", technologies: "", startDate: "", endDate: "", details: [] },
      ], 
    }));
  };

  const updateListItem = (field: "education" | "experience" | "projects", index: number, key: string, value: any) => {
    setResumeData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }))
  }

  const removeListItem = (field: "education" | "experience" | "projects", index: number) => {
    setResumeData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }))
  }

  const addResponsibility = (field: "experience" | "projects", itemIndex: number) => {
    setResumeData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              [field === "experience" ? "responsibilities" : "details"]: [
                ...(item[field === "experience" ? "responsibilities" : "details"] || []),
                ""
              ],
            }
          : item
      ),
    }));
  };

  const updateResponsibility = (field: "experience" | "projects", itemIndex: number, respIndex: number, value: string) => {
    setResumeData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              [field === "experience" ? "responsibilities" : "details"]: 
                (field === "experience" ? item.responsibilities : item.details).map((resp, j) =>
                  j === respIndex ? value : resp
                ),
            }
          : item
      ),
    }));
  };

  const removeResponsibility = (field: "experience" | "projects", itemIndex: number, respIndex: number) => {
    setResumeData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              [field === "experience" ? "responsibilities" : "details"]: item[field === "experience" ? "responsibilities" : "details"].filter(
                (_, j) => j !== respIndex
              ),
            }
          : item
      ),
    }))
  }

  const removeExperienceSection = () => {
    setResumeData((prev) => ({
      ...prev,
      experience : [] 
    }));
      setSectionOrder((prev) =>prev.filter((section) => section !== "experience"));
    };

  const exportToPDF = () => {
    setIsExporting(true)
    const input = document.getElementById("resume-preview")
    if (input) {
      html2canvas(input, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png")
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "pt",
          format: "a4"
        })
        
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const imgWidth = canvas.width
        const imgHeight = canvas.height
        
        const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight)
        
        const scaledWidth = imgWidth * scale
        const scaledHeight = imgHeight * scale
        
        const x = (pageWidth - scaledWidth) / 2
        const y = (pageHeight - scaledHeight) / 2
  
        pdf.addImage(imgData, "PNG", x, y, scaledWidth, scaledHeight)
        pdf.save("resume.pdf")
        setIsExporting(false)
      })
    }
  }

  const resetToDefault = () => {
    setResumeData({
      name: "Jake Ryan",
      phone: "123-456-7890",
      email: "jake@su.edu",
      linkedin: "linkedin.com/in/jake",
      github: "github.com/jake",
      education: [
        {
          school: "Southwestern University",
          degree: "Bachelor of Arts in Computer Science, Minor in Business",
          location: "Georgetown, TX",
          graduationDate: "Aug. 2018 - May 2021",
        },
        {
          school: "Blinn College",
          degree: "Associate's in Liberal Arts",
          location: "Bryan, TX",
          graduationDate: "Aug. 2014 - May 2018",
        },
      ],
      experience: [
        {
          title: "Undergraduate Research Assistant",
          company: "Texas A&M University",
          location: "College Station, TX",
          startDate: "June 2020",
          endDate: "Present",
          responsibilities: [
            "Developed a REST API using FastAPI and PostgreSQL to store data from learning management systems",
            "Developed a full-stack web application using Flask, React, PostgreSQL and Docker to analyze GitHub data",
            "Explored ways to visualize GitHub collaboration in a classroom setting",
          ],
        },
        {
          title: "Information Technology Support Specialist",
          company: "Southwestern University",
          location: "Georgetown, TX",
          startDate: "Sep. 2018",
          endDate: "Present",
          responsibilities: [
            "Communicate with managers to set up campus computers used on campus",
            "Assess and troubleshoot computer problems brought by students, faculty and staff",
            "Maintain upkeep of computers, classroom equipment, and 200 printers across campus",
          ],
        },
      ],
      projects: [
        {
          name: "Gitlytics",
          technologies: "Python, Flask, React, PostgreSQL, Docker",
          startDate: "June 2020",
          endDate: "Present",
          details: [
            "Developed a full-stack web application using with Flask serving a REST API with React as the frontend",
            "Implemented GitHub OAuth to get data from user's repositories",
            "Visualized GitHub data to show collaboration",
            "Used Celery and Redis for asynchronous tasks",
          ],
        },
        {
          name: "Simple Paintball",
          technologies: "Spigot API, Java, Maven, TravisCI, Git",
          startDate: "May 2018",
          endDate: "May 2020",
          details: [
            "Developed a Minecraft server plugin to entertain kids during free time for a previous job",
            "Published plugin to websites gaining 2K+ downloads and an average 4.5/5-star review",
            "Implemented continuous delivery using TravisCI to build the plugin upon new a release",
            "Collaborated with Minecraft server administrators to suggest features and get feedback about the plugin",
          ],
        },
      ],
      skills: {
        languages: "Java, Python, C/C++, SQL (Postgres), JavaScript, HTML/CSS, R",
        frameworks: "React, Node.js, Flask, JUnit, WordPress, Material-UI, FastAPI",
        developerTools: "Git, Docker, TravisCI, Google Cloud Platform, VS Code, Visual Studio, PyCharm, IntelliJ, Eclipse",
        libraries: "pandas, NumPy, Matplotlib",
      },
    })
    setSectionOrder(['personal', 'education', 'experience', 'projects', 'skills'])
  }

  const onDragEnd = (result) => {
    if (!result.destination) {
      return
    }

    const newSectionOrder = Array.from(sectionOrder)
    const [reorderedItem] = newSectionOrder.splice(result.source.index, 1)
    newSectionOrder.splice(result.destination.index, 0, reorderedItem)

    setSectionOrder(newSectionOrder)
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
  }

  const getFontClass = (selectedFont: string) => {
    switch (selectedFont) {
      case 'inter': 
        return inter.className;
      case 'roboto':
        return roboto.className;
      case 'opensans':
        return openSans.className;
      default:
        return inter.className;
    }
  };

  const handleFontChange = (newFont: string) => {
    setFont(newFont)
  }

  const renderSection = (section: string) => {
    switch (section) {
      case 'personal':
        return (
          <div>
            <h1 className="text-3xl font-bold mb-2">{resumeData.name}</h1>
            <p>{resumeData.email} | {resumeData.phone}</p>
            <p>{resumeData.linkedin} | {resumeData.github}</p>
          </div>
        )
      case 'education':
        return (
          <div>
            <h2 className="text-2xl font-semibold mb-2">Education</h2>
            {resumeData.education.map((edu, index) => (
              <div key={index} className="mb-2">
                <div className="flex justify-between">
                  <strong>{edu.school}</strong>
                  <span>{edu.graduationDate}</span>
                </div>
                <div>{edu.degree}</div>
                <div>{edu.location}</div>
              </div>
            ))}
          </div>
        )
      case 'experience':
        return (
          <div>
            <h2 className="text-2xl font-semibold mb-2">Experience</h2>
            {resumeData.experience.map((exp, index) => (
              <div key={index} className="mb-2">
                <div className="flex justify-between">
                  <strong>{exp.title}</strong>
                  <span>{exp.startDate} - {exp.endDate}</span>
                </div>
                <div>{exp.company}, {exp.location}</div>
                <ul className="list-disc list-inside">
  {Array.isArray(exp.responsibilities) && exp.responsibilities.map((resp, respIndex) => (
    <li key={respIndex}>{resp}</li>
  ))}
</ul>
              </div>
            ))}
          </div>
        )
      case 'projects':
        return (
          <div>
            <h2 className="text-2xl font-semibold mb-2">Projects</h2>
            {resumeData.projects.map((project, index) => (
              <div key={index} className="mb-2">
                <div className="flex justify-between">
                  <strong>{project.name} | {project.technologies}</strong>
                  <span>{project.startDate} - {project.endDate}</span>
                </div>
                <ul className="list-disc list-inside">
                  {project.details.map((detail, detailIndex) => (
                    <li key={detailIndex}>{detail}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      case 'skills':
        return (
          <div>
            <h2 className="text-2xl font-semibold mb-2">Technical Skills</h2>
            <p><strong>Languages:</strong> {resumeData.skills.languages}</p>
            <p><strong>Frameworks:</strong> {resumeData.skills.frameworks}</p>
            <p><strong>Developer Tools:</strong> {resumeData.skills.developerTools}</p>
            <p><strong>Libraries:</strong> {resumeData.skills.libraries}</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className={`flex flex-col min-h-screen ${font === 'inter' ? inter.className : ''}`}>
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <FileText className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-2xl font-bold text-gray-900">Rapid Resume</span>
              </div>
            </div>
            <div className="flex items-center">
              <Button
                onClick={exportToPDF}
                disabled={isExporting}
                className="mr-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 export-button"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-3" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Export PDF
                  </>
                )}
              </Button>
              <Button
                onClick={resetToDefault}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-md transition duration-300 ease-in-out flex items-center justify-center"
              >
                Reset to Default
              </Button>
              <Link href="/manage-resumes" className="ml-4 text-indigo-600 hover:text-indigo-800">
                Manage Resumes
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-col md:flex-row flex-grow">
        <div className={`w-full md:w-1/2 p-4 overflow-y-auto ${isMenuOpen ? 'block' : 'hidden md:block'} resume-section`}>
          <h2 className="text-2xl font-bold mb-4">Resume Builder</h2>
          
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="resume-sections">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {sectionOrder.map((section, index) => (
                    <Draggable key={section} draggableId={section} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="mb-6 p-4 bg-white rounded-lg shadow"
                        >
                          <div className="flex items-center mb-2">
                            <GripVertical className="h-5 w-5 text-gray-400 mr-2" />
                            <h3 className="text-xl font-semibold capitalize">{section}</h3>
                          </div>
                          {section === 'personal' && (
                            <section>
                              <Input
                                placeholder="Name"
                                value={resumeData.name}
                                onChange={(e) => updateField("name", e.target.value)}
                                className="mb-2"
                              />
                              <Input
                                placeholder="Phone"
                                value={resumeData.phone}
                                onChange={(e) => updateField("phone", e.target.value)}
                                className="mb-2"
                              />
                              <Input
                                placeholder="Email"
                                value={resumeData.email}
                                onChange={(e) => updateField("email", e.target.value)}
                                className="mb-2"
                              />
                              <Input
                                placeholder="LinkedIn"
                                value={resumeData.linkedin}
                                onChange={(e) => updateField("linkedin", e.target.value)}
                                className="mb-2"
                              />
                              <Input
                                placeholder="GitHub"
                                value={resumeData.github}
                                onChange={(e) => updateField("github", e.target.value)}
                                className="mb-2"
                              />
                            </section>
                          )}
                          {section === 'education' && (
                            <section>
                              {resumeData.education.map((edu, eduIndex) => (
                                <div key={eduIndex} className="mb-4 p-4 border rounded">
                              
                                  <GrammarCheckInputWrapper
  placeholder="School"
  value={edu.school}
  onChange={(e) => {
    updateListItem("education", eduIndex, "school", e.target.value);
    debouncedCheckGrammar(e.target.value, `education[${eduIndex}].school`);
  }}
  onGrammarCheck={() => handleApiGrammarCheck(`education[${eduIndex}].school`)}
  isChecking={checkingField === `education[${eduIndex}].school`}
  className="mb-2"
/>
<GrammarSuggestions 
  suggestions={grammarSuggestions[`education[${eduIndex}].school`] || []} 
  onApply={(suggestion) => applySuggestion(`education[${eduIndex}].school`, suggestion)} 
/>


<GrammarCheckInputWrapper
  placeholder="Degree"
  value={edu.degree}
  onChange={(e) => {
    updateListItem("education", eduIndex, "degree", e.target.value);
    debouncedCheckGrammar(e.target.value, `education[${eduIndex}].degree`);
  }}
  onGrammarCheck={() => handleApiGrammarCheck(`education[${eduIndex}].degree`)}
  isChecking={checkingField === `education[${eduIndex}].degree`}
  className="mb-2"
/>
<GrammarSuggestions 
  suggestions={grammarSuggestions[`education[${eduIndex}].degree`] || []} 
    onApply={(suggestion) => applySuggestion(`education[${eduIndex}].degree`, suggestion)} 
/>
                      
<GrammarCheckInputWrapper
  placeholder="Location"
  value={edu.location}
  onChange={(e) => {
    updateListItem("education", eduIndex, "location", e.target.value);
    debouncedCheckGrammar(e.target.value, `education[${eduIndex}].location`);
  }}
  onGrammarCheck={() => handleApiGrammarCheck(`education[${eduIndex}].location`)}
  isChecking={checkingField === `education[${eduIndex}].location`}
  className="mb-2"
/>
<GrammarSuggestions 
  suggestions={grammarSuggestions[`education[${eduIndex}].location`] || []} 
    onApply={(suggestion) => applySuggestion(`education[${eduIndex}].location`, suggestion)} 
/>                        
                                
<GrammarCheckInputWrapper
  placeholder="Graduation Date"
  value={edu.graduationDate}
  onChange={(e) => {
    updateListItem("education", eduIndex, "graduationDate", e.target.value);
    debouncedCheckGrammar(e.target.value, `education[${eduIndex}].graduationDate`);
  }}
  onGrammarCheck={() => handleApiGrammarCheck(`education[${eduIndex}].graduationDate`)}
  isChecking={checkingField === `education[${eduIndex}].graduationDate`}
  className="mb-2"
/>
<GrammarSuggestions 
  suggestions={grammarSuggestions[`education[${eduIndex}].graduationDate`] || []} 
    onApply={(suggestion) => applySuggestion(`education[${eduIndex}].graduationDate`, suggestion)} 
/>
                                  <Button variant="destructive" onClick={() => removeListItem("education", eduIndex)}
                                      className="bg-red-600 text-white hover:bg-red-700 mt-2">
                                    Remove
                                  </Button>
                                </div>
                              ))}
                              <Button
                                onClick={() => addListItem("education")}
                                className="bg-black text-white hover:bg-gray-800">
                                <PlusCircle className="w-4 h-4 mr-2" /> Add Education
                              </Button>
                            </section>
                          )}
                          {section === 'experience' && (
                            <section>
                              {resumeData.experience.map((exp, expIndex) => (
                                <div key={expIndex} className="mb-4 p-4 border rounded">
                                 <GrammarCheckInputWrapper
  placeholder="Title"
  value={exp.title}
  onChange={(e) => {
    updateListItem("experience", expIndex, "title", e.target.value);
    debouncedCheckGrammar(e.target.value, `experience[${expIndex}].title`);
  }}
  onGrammarCheck={() => handleApiGrammarCheck(`experience[${expIndex}].title`)}
  isChecking={checkingField === `experience[${expIndex}].title`}
  className="mb-2"
/>
<GrammarSuggestions 
  suggestions={grammarSuggestions[`experience[${expIndex}].title`] || []} 
    onApply={(suggestion) => applySuggestion(`experience[${expIndex}].title`, suggestion)} 
/>
                                  
<GrammarCheckInputWrapper
  placeholder="Company Name"
  value={exp.company}
  onChange={(e) => {
    updateListItem("experience", expIndex, "company", e.target.value);
    debouncedCheckGrammar(e.target.value, `experience[${expIndex}].company`);
  }}
  onGrammarCheck={() => handleApiGrammarCheck(`experience[${expIndex}].company`)}
    isChecking={checkingField === `experience[${expIndex}].company`}
  className="mb-2"
/>
<GrammarSuggestions 
  suggestions={grammarSuggestions[`experience[${expIndex}].company`] || []} 
    onApply={(suggestion) => applySuggestion(`experience[${expIndex}].company`, suggestion)} 
/>

<GrammarCheckInputWrapper
  placeholder="Location (City, State) "
  value={exp.location}
  onChange={(e) => {
    updateListItem("experience", expIndex, "location", e.target.value);
      debouncedCheckGrammar(e.target.value, `experience[${expIndex}].location`);
  }}
  onGrammarCheck={() => handleApiGrammarCheck(`experience[${expIndex}].location`)}
    isChecking={checkingField === `experience[${expIndex}].location`}
  className="mb-2"
/>
<GrammarSuggestions 
  suggestions={grammarSuggestions[`experience[${expIndex}].location`] || []} 
    onApply={(suggestion) => applySuggestion(`experience[${expIndex}].location`, suggestion)} 
/>

<GrammarCheckInputWrapper
  placeholder="Start Date"        
  value={exp.startDate}
  onChange={(e) => {
    updateListItem("experience", expIndex, "startDate", e.target.value);
    debouncedCheckGrammar(e.target.value, `experience[${expIndex}].startDate`);
  }}
  onGrammarCheck={() => handleApiGrammarCheck(`experience[${expIndex}].startDate`)}
    isChecking={checkingField === `experience[${expIndex}].startDate`}
  className="mb-2"
/>
<GrammarSuggestions 
suggestions={grammarSuggestions[`experience[${expIndex}].startDate`] || []} 
    onApply={(suggestion) => applySuggestion(`experience[${expIndex}].startDate`, suggestion)} 
/>      
<GrammarCheckInputWrapper
  placeholder="End Date (if still working, leave blank)"
  value={exp.endDate}
  onChange={(e) => {
    updateListItem("experience", expIndex, "endDate", e.target.value);
      debouncedCheckGrammar(e.target.value, `experience[${expIndex}].endDate`);
  }}
  onGrammarCheck={() => handleApiGrammarCheck(`experience[${expIndex}].endDate`)}
    isChecking={checkingField === `experience[${expIndex}].endDate`}
  className="mb-2"
/>
<GrammarSuggestions 
  suggestions={grammarSuggestions[`experience[${expIndex}].endDate`] || []} 
onApply={(suggestion) => applySuggestion(`experience[${expIndex}].endDate`, suggestion)} 
/>
                                  <h4 className="font-semibold mt-2 mb-1">Responsibilities</h4>
{ensureArray(exp.responsibilities).map((responsibility, respIndex) => (
  <div key={respIndex} className="flex mb-2">
    <GrammarCheckInputWrapper
      placeholder="Responsibility"
      value={responsibility}
      onChange={(e) => {
        updateResponsibility("experience", expIndex, respIndex, e.target.value);
        debouncedCheckGrammar(e.target.value, `experience[${expIndex}].responsibilities[${respIndex}]`);
      }}
      onGrammarCheck={() => handleApiGrammarCheck(`experience[${expIndex}].responsibilities[${respIndex}]`)}
      isChecking={checkingField === `experience[${expIndex}].responsibilities[${respIndex}]`}
      className="mb-2 w-full"
    />
    <GrammarSuggestions 
      suggestions={grammarSuggestions[`experience[${expIndex}].responsibilities[${respIndex}]`] || []} 
      onApply={(suggestion) => applySuggestion(`experience[${expIndex}].responsibilities[${respIndex}]`, suggestion)} 
    />
                                      <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => removeResponsibility("experience", expIndex, respIndex)}
                                        className="bg-red-600 text-white hover:bg-red-700"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <div className="flex justify-between mt-4">
                                    <Button
                                      onClick={() => addResponsibility("experience", expIndex)}
                                      className="bg-black text-white hover:bg-gray-800"
                                    >
                                      <PlusCircle className="w-4 h-4 mr-2" /> Add Responsibility
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() => removeListItem("experience", expIndex)}
                                      className="bg-red-600 text-white hover:bg-red-700"
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4">
                                <Button
                                  onClick={() => addListItem("experience")}
                                  className="bg-black text-white hover:bg-gray-800 mb-2 sm:mb-0">
                                  <PlusCircle className="w-4 h-4 mr-2" /> Add Experience
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={removeExperienceSection}
                                  className="bg-red-600 text-white hover:bg-red-700"
                                >
                                  Remove Experience Section
                                </Button>
                              </div>
                            </section>
                          )}
                          {section === 'projects' && (
                            <section>
                              {resumeData.projects.map((project, projectIndex) => (
                                <div key={projectIndex} className="mb-4 p-4 border rounded">
              <GrammarCheckInputWrapper
  placeholder="Project Title"
  value={project.name}
  onChange={(e) => {
    updateListItem("projects", projectIndex, "name", e.target.value);
    debouncedCheckGrammar(e.target.value, `projects[${projectIndex}].name`);
  }}
  onGrammarCheck={() => handleApiGrammarCheck(`projects[${projectIndex}].name`)}
  isChecking={checkingField === `projects[${projectIndex}].name`}
  className="mb-2"
/>
<GrammarSuggestions 
  suggestions={grammarSuggestions[`projects[${projectIndex}].name`] || []} 
  onApply={(suggestion) => applySuggestion(`projects[${projectIndex}].name`, suggestion)} 
/>


<GrammarCheckInputWrapper
  placeholder="Technologies"
  value={project.technologies   }
  onChange={(e) => {
    updateListItem("projects", projectIndex, "technologies", e.target.value);
    debouncedCheckGrammar(e.target.value, `projects[${projectIndex}].technologies`);
  }}
  onGrammarCheck={() => handleApiGrammarCheck(`projects[${projectIndex}].technologies`)}
  isChecking={checkingField === `projects[${projectIndex}].technologies`}
  className="mb-2"
/>
<GrammarSuggestions 
  suggestions={grammarSuggestions[`projects[${projectIndex}].technologies`] || []} 
    onApply={(suggestion) => applySuggestion(`projects[${projectIndex}].technologies`, suggestion)} 
/>

                            
<GrammarCheckInputWrapper
  placeholder="Start Date"
  value={project.startDate}
  onChange={(e) => {
    updateListItem("projects", projectIndex, "startDate", e.target.value);
    debouncedCheckGrammar(e.target.value, `projects[${projectIndex}].startDate`);
  }}
  onGrammarCheck={() => handleApiGrammarCheck(`projects[${projectIndex}].startDate`)}
  isChecking={checkingField === `projects[${projectIndex}].startDate`}
  className="mb-2"
/>
<GrammarSuggestions 
  suggestions={grammarSuggestions[`projects[${projectIndex}].startDate`] || []} 
    onApply={(suggestion) => applySuggestion(`projects[${projectIndex}].startDate`, suggestion)} 
/>
                                  
<GrammarCheckInputWrapper
  placeholder="End Date"
  value={project.endDate}
  onChange={(e) => {
    updateListItem("projects", projectIndex, "endDate", e.target.value);
    debouncedCheckGrammar(e.target.value, `projects[${projectIndex}].endDate`);
  }}
  onGrammarCheck={() => handleApiGrammarCheck(`projects[${projectIndex}].endDate`)}
      isChecking={checkingField === `projects[${projectIndex}].endDate`}
  className="mb-2"
/>
<GrammarSuggestions 
  suggestions={grammarSuggestions[`projects[${projectIndex}].endDate`] || []} 
    onApply={(suggestion) => applySuggestion(`projects[${projectIndex}].endDate`, suggestion)} 
/>
                                  <h4 className="font-semibold mt-2 mb-1">Details</h4>
                                  {project.details.map((detail, detailIndex) => (
  <div key={detailIndex} className="flex mb-2">
    <GrammarCheckInputWrapper
      placeholder="Detail"
      value={detail}
      onChange={(e) => {
        updateResponsibility("projects", projectIndex, detailIndex, e.target.value);
        debouncedCheckGrammar(e.target.value, `projects[${projectIndex}].details[${detailIndex}]`);
      }}
      onGrammarCheck={() => handleApiGrammarCheck(`projects[${projectIndex}].details[${detailIndex}]`)}
      isChecking={checkingField === `projects[${projectIndex}].details[${detailIndex}]`}
      className="mr-2 w-full"
    />
    <GrammarSuggestions 
      suggestions={grammarSuggestions[`projects[${projectIndex}].details[${detailIndex}]`] || []} 
      onApply={(suggestion) => applySuggestion(`projects[${projectIndex}].details[${detailIndex}]`, suggestion)} 
    />



                                      <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => removeResponsibility("projects", projectIndex, detailIndex)}
                                        className="bg-red-600 text-white hover:bg-red-700"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <div className="flex justify-between mt-4">
                                    <Button
                                      onClick={() => addResponsibility("projects", projectIndex)}
                                      className="bg-black text-white hover:bg-gray-800">
                                      <PlusCircle className="w-4 h-4 mr-2" /> Add Detail
                                    </Button>
                                    <Button variant="destructive" onClick={() => removeListItem("projects", projectIndex)} 
                                      className="bg-red-600 text-white hover:bg-red-700">
                                      Remove 
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              <Button
                                onClick={() => addListItem("projects")}
                                className="bg-black text-white hover:bg-gray-800">
                                <PlusCircle className="w-4 h-4 mr-2" /> Add Project
                              </Button>
                            </section>
                          )}
                          {section === 'skills' && (
                            <section>
                              
                                <GrammarCheckInputWrapper
  value={resumeData.skills.languages}
  onChange={(e) => {
    const { value } = e.target;
    updateField("skills", { ...resumeData.skills, languages: value });
    debouncedCheckGrammar(value, 'skills.languages');
  }}
  onGrammarCheck={() => handleApiGrammarCheck('skills.languages')}
  isChecking={checkingField === 'skills.languages'}
  placeholder="Languages"
/>
<GrammarSuggestions 
  suggestions={grammarSuggestions['skills.languages'] || []} 
  onApply={(suggestion) => applySuggestion('skills.languages', suggestion)} 
/>


<GrammarCheckInputWrapper
  value={resumeData.skills.frameworks}
  onChange={(e) => {
    const { value } = e.target;
    updateField("skills", { ...resumeData.skills, frameworks: value });
    debouncedCheckGrammar(value, 'skills.frameworks');
  }}
  onGrammarCheck={() => handleApiGrammarCheck('skills.frameworks')}
  isChecking={checkingField === 'skills.frameworks'}
  placeholder="Frameworks"
/>
<GrammarSuggestions 
  suggestions={grammarSuggestions['skills.frameworks'] || []} 
  onApply={(suggestion) => applySuggestion('skills.frameworks', suggestion)} 
/>

<GrammarCheckInputWrapper
  value={resumeData.skills.developerTools}
  onChange={(e) => {
    const { value } = e.target;
    updateField("skills", { ...resumeData.skills, developerTools: value });
    debouncedCheckGrammar(value, 'skills.developerTools');
  }}
  onGrammarCheck={() => handleApiGrammarCheck('skills.developerTools')}
  isChecking={checkingField === 'skills.developerTools'}
  placeholder="Developer Tools"
/>
<GrammarSuggestions 
  suggestions={grammarSuggestions['skills.developerTools'] || []} 
  onApply={(suggestion) => applySuggestion('skills.developerTools', suggestion)} 
/>
<GrammarCheckInputWrapper
  value={resumeData.skills.libraries}
  onChange={(e) => {
    const { value } = e.target;
    updateField("skills", { ...resumeData.skills, libraries: value });
    debouncedCheckGrammar(value, 'skills.libraries');
  }}
  onGrammarCheck={() => handleApiGrammarCheck('skills.libraries')}
  isChecking={checkingField === 'skills.libraries'}
  placeholder="Libraries"
/>
<GrammarSuggestions 
  suggestions={grammarSuggestions['skills.libraries'] || []} 
  onApply={(suggestion) => applySuggestion('skills.libraries', suggestion)} 
/>  

                            </section>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          
          <Button
            onClick={analyzeResume}  
            disabled={isAnalyzing}
            className="w-full bg-green-600 text-white hover:bg-green-700 mt-4 ai-suggestions"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-3" />
                Analyzing...
              </>
            ) : (
              <>Analyze Resume</>
            )}
          </Button>
          {aiSuggestions && (
            <div className="mt-4 p-4 bg-blue-100 rounded-lg ai-suggestions">
              <h3 className="text-lg font-semibold mb-2">AI Suggestions:</h3>
              <div className="whitespace-pre-wrap">{aiSuggestions}</div>
            </div>
          )}

          {/* Add theme and font selectors */}
          <div className="mt-6 p-4 bg-white rounded-lg shadow customization-section">
            <h3 className="text-xl font-semibold mb-2">Customization</h3>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700">Theme</label>
              <select
                value={theme}
                onChange={(e) => handleThemeChange(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="default">Default</option>
                <option value="modern">Modern</option>
                <option value="classic">Classic</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Font</label>
              <select
                value={font}
                onChange={(e) => handleFontChange(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="inter">Inter</option>
                <option value="roboto">Roboto</option>
                <option value="opensans">Open Sans</option>
              </select>
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/2 p-4 bg-gray-100 overflow-y-auto preview-section">
          <div id="resume-preview" className={`bg-white p-6 rounded shadow ${theme} ${getFontClass(font)}`}>
            {sectionOrder.map((section, index) => (
              <div key={section} className="mb-6">
                {renderSection(section)}
                {index < sectionOrder.length - 1 && (
                  <hr className="my-6 border-t border-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div> 
      </div>

      {/* Floating Help Button */}
      <button
        className="fixed bottom-4 right-4 bg-indigo-600 text-white rounded-full p-3 shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        onClick={() => setShowHelp(!showHelp)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h2 className="text-2xl font-bold mb-4">How to Use Resume Builder</h2>
            <ul className="list-disc pl-5 mb-4">
              <li>Add and edit sections in the left panel</li>
              <li>Drag and drop sections to reorder them</li>
              <li>Use AI suggestions to improve your content</li>
              <li>Customize the look with different themes and fonts</li>
              <li>Preview your resume in real-time on the right</li>
              <li>Export your finished resume as a PDF</li>
            </ul>
            <Button
              onClick={() => setShowHelp(false)}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Joyride Tour */}
      <JoyrideNoSSR
        steps={steps}
        run={runTour}
        continuous={true}
        showSkipButton={true}
        showProgress={true}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#4F46E5',
          },
        }}
      />
    </div>
  )
}