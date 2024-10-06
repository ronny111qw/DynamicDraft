"use client"

import React, { useEffect, useState } from "react"
import { Inter } from 'next/font/google'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle, Trash2, Download, Menu, FileText, Loader2, GripVertical } from "lucide-react"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
const inter = Inter({ subsets: ['latin'] })
import Joyride, { CallBackProps, STATUS } from 'react-joyride'


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
  }>
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
  const [isExporting, setIsExporting] = useState(false)
  const [sectionOrder, setSectionOrder] = useState(['personal', 'education', 'experience', 'projects', 'skills'])
  const [aiSuggestions, setAiSuggestions] = useState<string>("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [theme, setTheme] = useState('default')
  const [font, setFont] = useState('inter')
  const [showHelp, setShowHelp] = useState(false)
  const [runTour, setRunTour] = useState(false)

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour')
    if (!hasSeenTour) {
      setRunTour(true)
      localStorage.setItem('hasSeenTour', 'true')
    }
  }, [])

  const steps = [
    {
      target: '.resume-section',
      content: 'Start building your resume by adding sections here.',
      disableBeacon: true,
    },
    {
      target: '.preview-section',
      content: 'Your resume will be previewed in real-time here.',
    },
    {
      target: '.ai-suggestions',
      content: 'Get AI-powered suggestions to improve your resume.',
    },
    {
      target: '.customization-section',
      content: 'Customize the look of your resume with different themes and fonts.',
    },
    {
      target: '.export-button',
      content: 'Export your finished resume as a PDF.',
    },
  ]

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false)
    }
  }

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

  const updateField = (field: keyof ResumeData, value: any) => {
    setResumeData((prev) => ({ ...prev, [field]: value }))
  }

  const addListItem = (field: "education" | "experience" | "projects") => {
    setResumeData((prev) => ({
      ...prev,
      [field]: [
        ...prev[field],
        field === "education"
          ? { school: "", degree: "", location: "", graduationDate: "" }
          : field === "experience"
          ? { title: "", company: "", location: "", startDate: "", endDate: "", responsibilities: [""] }
          : { name: "", technologies: "", startDate: "", endDate: "", details: [""] },
      ],
    }))
  }

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

  const addResponsibility = (field: "experience" | "projects", index: number) => {
    setResumeData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) =>
        i === index
          ? { ...item, [field === "experience" ? "responsibilities" : "details"]: [...item[field === "experience" ? "responsibilities" : "details"], ""] }
          : item
      ),
    }))
  }

  const updateResponsibility = (field: "experience" | "projects", itemIndex: number, respIndex: number, value: string) => {
    setResumeData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              [field === "experience" ? "responsibilities" : "details"]: item[field === "experience" ? "responsibilities" : "details"].map((resp, j) =>
                j === respIndex ? value : resp
              ),
            }
          : item
      ),
    }))
  }

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
                  {exp.responsibilities.map((resp, respIndex) => (
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
          <div className="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-2 sm:py-0">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <FileText className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-2xl font-bold text-gray-900">Rapid Resume</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center mt-2 sm:mt-0">
              <Button
                onClick={exportToPDF}
                disabled={isExporting}
                className="w-full sm:w-auto mb-2 sm:mb-0 sm:mr-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 export-button"
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
                className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-md transition duration-300 ease-in-out flex items-center justify-center"
              >
                Reset to Default
              </Button>
            </div>
            <div className="sm:hidden flex items-center mt-2">
              <Button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              >
                <span className="sr-only">Open main menu</span>
                <Menu className="block h-6 w-6" aria-hidden="true" />
              </Button>
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
                                  <Input
                                    placeholder="School"
                                    value={edu.school}
                                    onChange={(e) => updateListItem("education", eduIndex, "school", e.target.value)}
                                    className="mb-2"
                                  />
                                  <Input
                                    placeholder="Degree"
                                    value={edu.degree}
                                    onChange={(e) => updateListItem("education", eduIndex, "degree", e.target.value)}
                                    className="mb-2"
                                  />
                                  <Input
                                    placeholder="Location"
                                    value={edu.location}
                                    onChange={(e) => updateListItem("education", eduIndex, "location", e.target.value)}
                                    className="mb-2"
                                  />
                                  <Input
                                    placeholder="Graduation Date"
                                    value={edu.graduationDate}
                                    onChange={(e) => updateListItem("education", eduIndex, "graduationDate", e.target.value)}
                                    className="mb-2"
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
                                  <Input
                                    placeholder="Title"
                                    value={exp.title}
                                    onChange={(e) => updateListItem("experience", expIndex, "title", e.target.value)}
                                    className="mb-2"
                                  />
                                  <Input
                                    placeholder="Company"
                                    value={exp.company}
                                    onChange={(e) => updateListItem("experience", expIndex, "company", e.target.value)}
                                    className="mb-2"
                                  />
                                  <Input
                                    placeholder="Location"
                                    value={exp.location}
                                    onChange={(e) => updateListItem("experience", expIndex, "location", e.target.value)}
                                    className="mb-2"
                                  />
                                  <Input
                                    placeholder="Start Date"
                                    value={exp.startDate}
                                    onChange={(e) => updateListItem("experience", expIndex, "startDate", e.target.value)}
                                    className="mb-2"
                                  />
                                  <Input
                                    placeholder="End Date"
                                    value={exp.endDate}
                                    onChange={(e) => updateListItem("experience", expIndex, "endDate", e.target.value)}
                                    className="mb-2"
                                  />
                                  <h4 className="font-semibold mt-2 mb-1">Responsibilities</h4>
                                  {exp.responsibilities.map((responsibility, respIndex) => (
                                    <div key={respIndex} className="flex mb-2">
                                      <Input
                                        placeholder="Responsibility"
                                        value={responsibility}
                                        onChange={(e) => updateResponsibility("experience", expIndex, respIndex, e.target.value)}
                                        className="mr-2"
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
                                  <Input
                                    placeholder="Project Name"
                                    value={project.name}
                                    onChange={(e) => updateListItem("projects", projectIndex, "name", e.target.value)}
                                    className="mb-2"
                                  />  
                                  <Input
                                    placeholder="Technologies"
                                                                    value={project.technologies}
                                    onChange={(e) => updateListItem("projects", projectIndex, "technologies", e.target.value)}
                                    className="mb-2"
                                  />
                                  <Input
                                    placeholder="Start Date"
                                    value={project.startDate}
                                    onChange={(e) => updateListItem("projects", projectIndex, "startDate", e.target.value)}
                                    className="mb-2"
                                  />
                                  <Input
                                    placeholder="End Date"
                                    value={project.endDate}
                                    onChange={(e) => updateListItem("projects", projectIndex, "endDate", e.target.value)}
                                    className="mb-2"
                                  />
                                  <h4 className="font-semibold mt-2 mb-1">Details</h4>
                                  {project.details.map((detail, detailIndex) => (
                                    <div key={detailIndex} className="flex mb-2">
                                      <Input
                                        placeholder="Detail"
                                        value={detail}
                                        onChange={(e) => updateResponsibility("projects", projectIndex, detailIndex, e.target.value)}
                                        className="mr-2"
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
                              <Textarea
                                placeholder="Languages"
                                value={resumeData.skills.languages}
                                onChange={(e) => updateField("skills", { ...resumeData.skills, languages: e.target.value })}
                                className="mb-2"
                              />
                              <Textarea
                                placeholder="Frameworks"
                                value={resumeData.skills.frameworks}
                                onChange={(e) => updateField("skills", { ...resumeData.skills, frameworks: e.target.value })}
                                className="mb-2"
                              />
                              <Textarea
                                placeholder="Developer Tools"
                                value={resumeData.skills.developerTools}
                                onChange={(e) => updateField("skills", { ...resumeData.skills, developerTools: e.target.value })}
                                className="mb-2"
                              />
                              <Textarea
                                placeholder="Libraries"
                                value={resumeData.skills.libraries}
                                onChange={(e) => updateField("skills", { ...resumeData.skills, libraries: e.target.value })}
                                className="mb-2"
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
          <div id="resume-preview" className={`bg-white p-6 rounded shadow ${theme} ${font}`}>
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
      <Joyride
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





??????????????

"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"

const templates = [
  {
    id: 'template1',
    name: 'Professional',
    content: {
      name: "Alex Johnson",
      phone: "123-456-7890",
      email: "alex@example.com",
      linkedin: "linkedin.com/in/alexjohnson",
      github: "github.com/alexj",
      education: [
        {
          school: "University of Technology",
          degree: "Bachelor of Science in Computer Science",
          location: "New York, NY",
          graduationDate: "May 2020",
        },
      ],
      experience: [
        {
          title: "Software Engineer",
          company: "Tech Solutions Inc.",
          location: "San Francisco, CA",
          startDate: "June 2020",
          endDate: "Present",
          responsibilities: [
            "Developed and maintained web applications using React and Node.js",
            "Collaborated with cross-functional teams to deliver high-quality software products",
            "Implemented CI/CD pipelines to improve development efficiency",
          ],
        },
      ],
      projects: [
        {
          name: "E-commerce Platform",
          technologies: "React, Redux, Node.js, MongoDB",
          startDate: "Jan 2020",
          endDate: "Apr 2020",
          details: [
            "Built a full-stack e-commerce platform with user authentication and payment integration",
            "Implemented responsive design for optimal user experience across devices",
            "Utilized Redux for state management and MongoDB for data persistence",
          ],
        },
      ],
      skills: {
        languages: "JavaScript, Python, Java, SQL",
        frameworks: "React, Node.js, Express, Django",
        developerTools: "Git, Docker, Jenkins, AWS",
        libraries: "Redux, Mongoose, Jest",
      },
    },
  },
  {
    id: 'template2',
    name: 'Creative',
    content: {
      name: "Sam Rivera",
      phone: "987-654-3210",
      email: "sam@creativestudio.com",
      linkedin: "linkedin.com/in/samrivera",
      github: "github.com/samr",
      education: [
        {
          school: "Design Institute",
          degree: "Bachelor of Fine Arts in Graphic Design",
          location: "Los Angeles, CA",
          graduationDate: "June 2019",
        },
      ],
      experience: [
        {
          title: "UI/UX Designer",
          company: "Creative Studio",
          location: "Los Angeles, CA",
          startDate: "July 2019",
          endDate: "Present",
          responsibilities: [
            "Created user-centered designs for web and mobile applications",
            "Conducted user research and usability testing to inform design decisions",
            "Collaborated with development teams to ensure design implementation accuracy",
          ],
        },
      ],
      projects: [
        {
          name: "Brand Redesign",
          technologies: "Adobe Creative Suite, Figma",
          startDate: "Mar 2019",
          endDate: "May 2019",
          details: [
            "Led a comprehensive brand redesign for a major tech startup",
            "Created a new visual identity including logo, color palette, and typography",
            "Designed marketing materials and website mockups to showcase the new brand",
          ],
        },
      ],
      skills: {
        languages: "HTML, CSS, JavaScript",
        frameworks: "React, Vue.js",
        developerTools: "Git, Sketch, Figma, Adobe XD",
        libraries: "D3.js, Three.js",
      },
    },
  },
  {
    "id": "template3",
    "name": "Data Analyst",
    "content": {
      "name": "Alex Morgan",
      "phone": "987-654-3210",
      "email": "alex.morgan@dataanalyst.com",
      "linkedin": "linkedin.com/in/alexmorgan",
      "github": "github.com/alexmorgan",
      "education": [
        {
          "school": "University of Data Science",
          "degree": "Bachelor of Science in Data Analytics",
          "location": "San Francisco, CA",
          "graduationDate": "June 2020"
        }
      ],
      "experience": [
        {
          "title": "Data Analyst",
          "company": "Tech Solutions Inc.",
          "location": "New York, NY",
          "startDate": "August 2020",
          "endDate": "Present",
          "responsibilities": [
            "Analyzed large datasets to uncover trends and insights, driving business strategy",
            "Created dashboards and visualizations using tools like Tableau and Power BI",
            "Developed data models to forecast business growth and identify key KPIs",
            "Collaborated with cross-functional teams to integrate data-driven decision-making"
          ]
        },
        {
          "title": "Data Analyst Intern",
          "company": "FinTech Corp",
          "location": "San Francisco, CA",
          "startDate": "June 2019",
          "endDate": "August 2019",
          "responsibilities": [
            "Assisted in analyzing financial data to support investment strategies",
            "Prepared weekly reports on market trends using R and Python",
            "Cleaned and processed raw datasets, improving data accuracy by 20%"
          ]
        }
      ],
      "projects": [
        {
          "name": "Sales Data Optimization",
          "technologies": "Python, Pandas, SQL",
          "startDate": "Jan 2021",
          "endDate": "Mar 2021",
          "details": [
            "Developed a model to predict sales trends based on historical data",
            "Increased sales forecast accuracy by 15% through data cleansing and feature engineering",
            "Built SQL queries to retrieve and process large datasets efficiently"
          ]
        },
        {
          "name": "Customer Segmentation Analysis",
          "technologies": "Python, KMeans, Tableau",
          "startDate": "July 2020",
          "endDate": "Sept 2020",
          "details": [
            "Performed customer segmentation analysis using clustering techniques",
            "Presented findings to marketing team, enabling targeted campaign strategies",
            "Used Tableau to visualize customer clusters and behavioral patterns"
          ]
        }
      ],
      "skills": {
        "languages": "Python, R, SQL",
        "tools": "Tableau, Power BI, Excel, Google Analytics",
        "libraries": "Pandas, NumPy, Scikit-learn",
        "technologies": "SQL, Hadoop, Spark"
      }
    }
  }
]

export default function ResumeTemplates() {
  const router = useRouter()

  const useTemplate = (templateId: string) => {
    const selectedTemplate = templates.find(template => template.id === templateId)
    if (selectedTemplate) {
      localStorage.setItem('selectedTemplate', JSON.stringify(selectedTemplate.content))
      router.push('/')
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Resume Templates</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">{template.name}</h2>
            <Button onClick={() => useTemplate(template.id)} className="bg-purple-600 hover:bg-purple-700">
              Use Template
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}