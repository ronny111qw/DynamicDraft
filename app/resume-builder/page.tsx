"use client"
import React, { useState, useCallback, useEffect, useRef } from "react"
import debounce from 'lodash/debounce'
import Link from 'next/link'
import JobMatcher from "@/components/JobMatcher"
import { Save, Sparkles, Trash2 } from "lucide-react"
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import FontSelector, { fonts } from '@/app/fontSelector' 
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkGrammar, isResumeSpecificTerm } from '@/app/utils/grammarCheck';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { SpellCheck } from 'lucide-react';
import { GrammarSuggestion } from '@/app/utils/grammarCheck';
import { motion, AnimatePresence } from "framer-motion"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Download,GripVertical, Moon, Sun, Loader2 } from "lucide-react"
import dynamic from 'next/dynamic';
import { toast } from "@/components/ui/use-toast"
import { Fredoka } from '@next/font/google';

const fredoka = Fredoka({ weight: ['400','600'], subsets: ['latin'] });


 

const getDefaultResumeData = () => ({
  personalInfo: { name: "", email: "", phone: "", location: "", linkedin: "", github: "" },
  education: [{ institution: "", degree: "", graduationDate: "" }],
  experience: [{ company: "", position: "", startDate: "", endDate: "", responsibilities: [""] }],
  projects: [{ name: "", description: "", details: [""] }],
  skills: { languages: "", frameworks: "", developerTools: "", libraries: "" }
});


const GrammarCheckInputWrapper = ({ 
  value, 
  onChange, 
  onGrammarCheck, 
  isChecking,  
  placeholder,  
  className,
  field,
  onOpenModal
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGrammarCheck: (field: string) => void;
  isChecking: boolean;
  placeholder: string;
  className?: string;
  field: string;
  onOpenModal: (field: string) => void;
}) => {
  const InputComponent = field.includes('responsibilities') || field.includes('details') ? Textarea : Input;
  
  return (
    <div className="relative w-full">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`pr-16 ${className} border-gray-700`}
      />
      <button
        onClick={() => {
          onGrammarCheck(field);
          onOpenModal(field);
        }}
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


interface ResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    linkedin: string;
    location: string;
    github: string;
  };
  education: {
    institution: string;
    degree: string;
    graduationDate: string;
  }[];
  experience: {
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    responsibilities: string[];
  }[];
  projects: {
    name: string;
    description: string;
    details: string[];
  }[];
  skills: {   
    languages: string;
    frameworks: string;
    developerTools: string;
    libraries: string;
  };
}


const ResumeBuilder = () => {
  const [resumeData, setResumeData] = useState(() => {
    if (typeof window !== 'undefined') {
      console.log('Initializing resumeData');
      const selectedTemplateString = localStorage.getItem("selectedTemplate");
      if (selectedTemplateString) {
        console.log('Found selected template in localStorage');
        const selectedTemplate = JSON.parse(selectedTemplateString);
        console.log('Parsed selected template:', selectedTemplate);
        localStorage.removeItem("selectedTemplate"); // Clear the stored template
        console.log('Removed selected template from localStorage');
        // Adapt the template structure to match what the component expects
        return {
          personalInfo: {
            name: selectedTemplate.name || "",
            email: selectedTemplate.email || "",
            phone: selectedTemplate.phone || "",
            location: selectedTemplate.location || "",
            linkedin: selectedTemplate.linkedin || "",
            github: selectedTemplate.github || "",
          },
          education: selectedTemplate.education || [],
          experience: selectedTemplate.experience || [],
          projects: selectedTemplate.projects || [],
          skills: selectedTemplate.skills || {}
        };
      }
      const savedResume = localStorage.getItem("resumeData");
      if (savedResume) {
        console.log('Found saved resume data');
        return JSON.parse(savedResume);
      }
    }
    console.log('Using default resume data');
    return getDefaultResumeData();
  });

  useEffect(() => {
    console.log('Current resumeData:', resumeData);
  }, [resumeData]);


  // Function to get default resume data structure


  
  const [activeSection, setActiveSection] = useState("personalInfo")
  const [sectionOrder, setSectionOrder] = useState(["personalInfo", "education", "experience", "projects", "skills"])
  const { theme, setTheme } = useTheme()
  const [isClient, setIsClient] = useState(false);
  const [selectedFont, setSelectedFont] = useState('inter')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null)
  const [grammarSuggestions, setGrammarSuggestions] = useState<{[key: string]: GrammarSuggestion[]}>({});
  const textCache = useRef<{[key: string]: string}>({});
  const apiCallTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false);
  const [activeSuggestionField, setActiveSuggestionField] = useState<string | null>(null);
  const lastApiCallTimeRef = useRef<number>(0);
  const [checkingField, setCheckingField] = useState<string | null>(null);
  const pendingChecksRef = useRef<{[key: string]: string}>({});
  const [isAdvancedCheckLoading, setIsAdvancedCheckLoading] = useState(false);
  const [isApiCallLoading, setIsApiCallLoading] = useState(false); 
  const [isExporting, setIsExporting] = useState(false);
  const [newSkillCategory, setNewSkillCategory] = useState("");
  const [resumeName, setResumeName] = useState("Untitled Resume")
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      console.log('Saving resume with data:', {
        content: {
          ...resumeData,
          name: resumeName
        },
        template: "default"
      });

      const response = await fetch('/api/resumes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: {
            ...resumeData,
            name: resumeName
          },
          template: "default"
        }),
      })

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to save resume')
      }

      setLastSaved(new Date())
      toast({
        title: "Success",
        description: "Your resume has been saved successfully.",
      })
    } catch (error) {
      console.error('Error saving resume:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save resume. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
      setIsSaveDialogOpen(false)
    }
  }

  useEffect(() => {
    setIsClient(true);
  }, []);

  

  const handleOpenSuggestionsModal = (field: string) => {
    setActiveSuggestionField(field);
    setIsSuggestionsModalOpen(true);
  };

  const handleCloseSuggestionsModal = () => {
    setIsSuggestionsModalOpen(false);
    setActiveSuggestionField(null);
  };

  const handleApplySuggestion = (suggestion: string) => {
    if (activeSuggestionField) {
      const [section, index, field, subIndex] = activeSuggestionField.split('.');
      handleInputChange(section, index ? parseInt(index) : null, field, suggestion, subIndex ? parseInt(subIndex) : null);
    }
    handleCloseSuggestionsModal();
  };

  

  const debouncedCheckGrammar = useCallback(
    debounce(async (text: string, field: string) => {
      try {
        const results = await checkGrammar(text);
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
      setActiveSuggestionField(field);
      setIsSuggestionsModalOpen(true);
    } catch (error) {
      console.error('Error in API grammar check:', error);
    } finally {
      setCheckingField(null);
    }
  }, [resumeData]); // handleOpenSuggestionsModal

  const handleInputChange = useCallback((section, index, field, value, subIndex = null) => {
    setResumeData((prev) => {
      const newData = { ...prev };
      if (section === "personalInfo" || section === "skills") {
        newData[section][field] = value;
      } else if (Array.isArray(newData[section])) {
        if (subIndex !== null && Array.isArray(newData[section][index][field])) {
          newData[section][index][field][subIndex] = value;
        } else {
          newData[section][index][field] = value;
        }
      }
      return newData;
    });
  }, []);


  const addListItem = useCallback((section) => {
    setResumeData((prev) => {
      const newData = { ...prev };
      if (section === "education") {
        newData[section].push({ institution: "", degree: "", graduationDate: "" });
      } else if (section === "experience") {
        newData[section].push({ company: "", position: "", startDate: "", endDate: "", responsibilities: [""] });
      } else if (section === "projects") {
        newData[section].push({ name: "", description: "", details: [""] });
      }
      return newData;
    });
  }, []);

  const removeListItem = (section: string, index: number | string) => {
    setResumeData(prev => {
      if (section === "skills" && typeof index === "string") {
        const { [index]: _, ...rest } = prev.skills;
        return { ...prev, skills: rest };
      }
      return {
        ...prev,
        [section]: prev[section].filter((_, i) => i !== index)
      };
    });
  };

  function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }
  const onDragEnd = useCallback((result) => {
    if (!result.destination) return;

    const { source, destination } = result;

    if (source.droppableId === destination.droppableId) {
      // Reordering within the same list
      const items = Array.from(sectionOrder);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);

      setSectionOrder(items);
    } else {
      // Moving between lists (form to preview or vice versa)
      const sourceItems = Array.from(sectionOrder);
      const destItems = Array.from(sectionOrder);
      const [movedItem] = sourceItems.splice(source.index, 1);
      destItems.splice(destination.index, 0, movedItem);

      setSectionOrder(destItems);
    }
  }, [sectionOrder]);

  const handleSkillsCategoryChange = useCallback((oldCategory: string, newCategory: string) => {
    setResumeData(prevData => {
      const newSkills = { ...prevData.skills };
      if (oldCategory !== newCategory) {
        newSkills[newCategory] = newSkills[oldCategory];
        delete newSkills[oldCategory];
      }
      return { ...prevData, skills: newSkills };
    });
  }, []);



  const addSkillCategory = () => {
    if (newSkillCategory.trim()) {
      setResumeData(prev => ({
        ...prev,
        skills: {
          ...prev.skills,
          [newSkillCategory.trim()]: ""
        }
      }));
      setNewSkillCategory("");
    }
  };


  const addNestedListItem = useCallback((section, index, field) => {
    setResumeData((prev) => {
      const newData = { ...prev };
      if (Array.isArray(newData[section][index][field])) {
        newData[section][index][field].push('');
      }
      return newData;
    });
  }, []);

  const removeNestedListItem = useCallback((section, index, field, itemIndex) => {
    setResumeData((prev) => {
      const newData = { ...prev };
      if (Array.isArray(newData[section][index][field])) {
        newData[section][index][field].splice(itemIndex, 1);
      }
      return newData;
    });
  }, []);

  
  

  useEffect(() => {
    localStorage.setItem("resumeData", JSON.stringify(resumeData));
  }, [resumeData]);


  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const input = document.getElementById("resume-preview");
      if (!input) {
        throw new Error("Resume preview element not found");
      }

      const canvas = await html2canvas(input, { 
        scale: 2,
        logging: true, // Enable logging for debugging
        useCORS: true, // Try to load images from other domains
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4"
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
      
      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;
      
      const x = (pageWidth - scaledWidth) / 2;
      const y = (pageHeight - scaledHeight) / 2;

      pdf.addImage(imgData, "PNG", x, y, scaledWidth, scaledHeight);
      pdf.save("resume.pdf");
      toast({
        title: "PDF Exported",
        description: "Your resume has been successfully exported as a PDF.",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const resetToDefault = () => {
    setResumeData({
      personalInfo: { name: "Jake Ryan", email: "jake@su.edu", phone: "123-456-7890", location: "Georgetown, TX", linkedin: "linkedin.com/in/jakeryan", github: "github.com/jakeryan" },
      education: [
        { institution: "Southwestern University", degree: "Bachelor of Arts in Computer Science, Minor in Business", graduationDate: "Aug. 2018 - May 2021" },
        { institution: "Blinn College", degree: "Associate's in Liberal Arts", graduationDate: "Aug. 2014 - May 2018" }
      ],
      experience: [
        {
          company: "Texas A&M University",
          position: "Undergraduate Research Assistant",
          startDate: "June 2020",
          endDate: "Present",
          responsibilities: [
            "Developed a REST API using FastAPI and PostgreSQL to store data from learning management systems",
            "Developed a full-stack web application using Flask, React, PostgreSQL and Docker to analyze GitHub data",
            "Explored ways to visualize GitHub collaboration in a classroom setting"
          ]
        },
        {
          company: "Southwestern University",
          position: "Information Technology Support Specialist",
          startDate: "Sep. 2018",
          endDate: "Present",
          responsibilities: [
            "Communicate with managers to set up campus computers used on campus",
            "Assess and troubleshoot computer problems brought by students, faculty and staff",
            "Maintain upkeep of computers, classroom equipment, and 200 printers across campus"
          ]
        },
        {
          company: "Southwestern University",
          position: "Artificial Intelligence Research Assistant",
          startDate: "May 2019",
          endDate: "July 2019",
          responsibilities: [
            "Explored methods to generate video game dungeons based off of The Legend of Zelda",
            "Developed a game in Java to test the generated dungeons",
            "Contributed 50K+ lines of code to an established codebase via Git",
            "Conducted a human subject study to determine which video game dungeon generation technique is enjoyable",
            "Wrote an 8-page paper and gave multiple presentations on-campus",
            "Presented virtually to the World Conference on Computational Intelligence"
          ]
        }
      ],
      projects: [
        {
          name: "Gitlytics",
          description: "Python, Flask, React, PostgreSQL, Docker",
          details: [
            "Developed a full-stack web application using with Flask serving a REST API with React as the frontend",
            "Implemented GitHub OAuth to get data from user's repositories",
            "Visualized GitHub data to show collaboration",
            "Used Celery and Redis for asynchronous tasks"
          ]
        },
        {
          name: "Simple Paintball",
          description: "Spigot API, Java, Maven, TravisCI, Git",
          details: [
            "Developed a Minecraft server plugin to entertain kids during free time for a previous job",
            "Published plugin to websites gaining 2K+ downloads and an average 4.5/5-star review",
            "Implemented continuous delivery using TravisCI to build the plugin upon new a release",
            "Collaborated with Minecraft server administrators to suggest features and get feedback about the plugin"
          ]
        }
      ],
      skills: {
        languages: "Java, Python, C/C++, SQL (Postgres), JavaScript, HTML/CSS, R",
        frameworks: "React, Node.js, Flask, JUnit, WordPress, Material-UI, FastAPI",
        developerTools: "Git, Docker, TravisCI, Google Cloud Platform, VS Code, Visual Studio, PyCharm, IntelliJ, Eclipse",
        libraries: "pandas, NumPy, Matplotlib"
      }
    })
    setSectionOrder(['personalInfo', 'education', 'experience', 'projects', 'skills']);
  }

  const handleUpdateResume = (updatedData: any) => {
    setResumeData(updatedData);
  }

  const renderSection = useCallback((section: string) => {
    switch (section) {
      case "personalInfo":
        return (
          <Card className='bg-[#2a2a2a] border border-gray-800'>
            <CardHeader>
              <CardTitle className='text-white'>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-white">
                {Object.entries(resumeData.personalInfo || {}).map(([field, value]) => (
                  <div key={field}>
                    <GrammarCheckInputWrapper
                      value={value as string}
                      onChange={(e) => handleInputChange("personalInfo", null, field, e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`personalInfo.${field}`)}
                      isChecking={checkingField === `personalInfo.${field}`}
                      placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                      field={`personalInfo.${field}`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      case "education":
        return (
          <Card className='bg-[#2a2a2a] border border-gray-800'>
            <CardHeader>
              <CardTitle className='text-white'>Education</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-white">
                {(resumeData.education || []).map((edu, index) => (
                  <div key={index} className="space-y-2">
                    <GrammarCheckInputWrapper
                      value={edu.institution}
                      onChange={(e) => handleInputChange("education", index, "institution", e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`education.${index}.institution`)}
                      isChecking={checkingField === `education.${index}.institution`}
                      placeholder="Institution"
                      field={`education.${index}.institution`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                    <GrammarCheckInputWrapper
                      value={edu.degree}
                      onChange={(e) => handleInputChange("education", index, "degree", e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`education.${index}.degree`)}
                      isChecking={checkingField === `education.${index}.degree`}
                      placeholder="Degree"
                      field={`education.${index}.degree`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                    <GrammarCheckInputWrapper
                      value={edu.graduationDate}
                      onChange={(e) => handleInputChange("education", index, "graduationDate", e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`education.${index}.graduationDate`)}
                      isChecking={checkingField === `education.${index}.graduationDate`}
                      placeholder="Graduation Date"
                      field={`education.${index}.graduationDate`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                    <Button onClick={() => removeListItem("education", index)} variant="destructive">Remove</Button>
                  </div>
                ))}
                <Button onClick={() => addListItem("education")} variant='secondary'>Add Education</Button>
              </div>
            </CardContent>
          </Card>
        );
      case "experience":
        return (
          <Card className='bg-[#2a2a2a] border border-gray-800'>
            <CardHeader>
              <CardTitle className='text-white'>Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-white">
                {(resumeData.experience || []).map((exp, index) => (
                  <div key={index} className="space-y-2">
                    <GrammarCheckInputWrapper
                      value={exp.company}
                      onChange={(e) => handleInputChange("experience", index, "company", e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`experience.${index}.company`)}
                      isChecking={checkingField === `experience.${index}.company`}
                      placeholder="Company"
                      field={`experience.${index}.company`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                    <GrammarCheckInputWrapper
                      value={exp.position}
                      onChange={(e) => handleInputChange("experience", index, "position", e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`experience.${index}.position`)}
                      isChecking={checkingField === `experience.${index}.position`}
                      placeholder="Position"
                      field={`experience.${index}.position`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                    <GrammarCheckInputWrapper
                      value={exp.startDate}
                      onChange={(e) => handleInputChange("experience", index, "startDate", e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`experience.${index}.startDate`)}
                      isChecking={checkingField === `experience.${index}.startDate`}
                      placeholder="Start Date"
                      field={`experience.${index}.startDate`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                    <GrammarCheckInputWrapper
                      value={exp.endDate}
                      onChange={(e) => handleInputChange("experience", index, "endDate", e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`experience.${index}.endDate`)}
                      isChecking={checkingField === `experience.${index}.endDate`}
                      placeholder="End Date"
                      field={`experience.${index}.endDate`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                    {(exp.responsibilities || []).map((resp, respIndex) => (
                      <div key={respIndex} className="flex items-center space-x-2">
                        <GrammarCheckInputWrapper
                          value={resp}
                          onChange={(e) => handleInputChange("experience", index, "responsibilities", e.target.value, respIndex)}
                          onGrammarCheck={() => handleApiGrammarCheck(`experience.${index}.responsibilities.${respIndex}`)}
                          isChecking={checkingField === `experience.${index}.responsibilities.${respIndex}`}
                          placeholder={`Responsibility ${respIndex + 1}`}
                          field={`experience.${index}.responsibilities.${respIndex}`}
                          onOpenModal={handleOpenSuggestionsModal}
                        />
                        <Trash2 className="w-4 h-4 cursor-pointer hover:text-red-500" onClick={() => removeNestedListItem("experience", index, "responsibilities", respIndex)}/>
                      </div>
                    ))}
                    <div className="flex space-x-5 mt-4">
                      <Button onClick={() => addNestedListItem("experience", index, "responsibilities")}>Add Responsibility</Button>
                      <Button onClick={() => removeListItem("experience", index)} variant="destructive">Remove Experience</Button>
                    </div>
                  </div>
                ))}
                <Button onClick={() => addListItem("experience")}>Add Experience</Button>
              </div>
            </CardContent>
          </Card>
        );
      case "projects":
        return (
          <Card className='bg-[#2a2a2a] border border-gray-800'>
      <CardHeader>
        <CardTitle className='text-white'>Projects</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-white">
          {(resumeData.projects || []).map((project, index) => (
            <div key={index} className="space-y-2">
              <GrammarCheckInputWrapper
                value={project.name}
                onChange={(e) => handleInputChange("projects", index, "name", e.target.value)}
                onGrammarCheck={() => handleApiGrammarCheck(`projects.${index}.name`)}
                isChecking={checkingField === `projects.${index}.name`}
                placeholder="Project Name"
                field={`projects.${index}.name`}
                onOpenModal={handleOpenSuggestionsModal}
              />
              <GrammarCheckInputWrapper
                value={project.description}
                onChange={(e) => handleInputChange("projects", index, "description", e.target.value)}
                onGrammarCheck={() => handleApiGrammarCheck(`projects.${index}.description`)}
                isChecking={checkingField === `projects.${index}.description`}
                placeholder="Project Description"
                field={`projects.${index}.description`}
                onOpenModal={handleOpenSuggestionsModal}
              />
              {(project.details || []).map((detail, detailIndex) => (
                <div key={detailIndex} className="flex items-center space-x-2">
                  <GrammarCheckInputWrapper
                    value={detail}
                    onChange={(e) => handleInputChange("projects", index, "details", e.target.value, detailIndex)}
                    onGrammarCheck={() => handleApiGrammarCheck(`projects.${index}.details.${detailIndex}`)}
                    isChecking={checkingField === `projects.${index}.details.${detailIndex}`}
                    placeholder={`Detail ${detailIndex + 1}`}
                    field={`projects.${index}.details.${detailIndex}`}
                    onOpenModal={handleOpenSuggestionsModal}
                  />
                  <Trash2 className="w-4 h-4 cursor-pointer hover:text-red-500" onClick={() => removeNestedListItem("projects", index, "details", detailIndex)}/>
                </div>
              ))}
              <div className="flex space-x-5 mt-4"> {/* Added container with spacing */}
                <Button onClick={() => addNestedListItem("projects", index, "details")} variant='secondary'>
                  Add Detail
                </Button>
                <Button 
                  onClick={() => removeListItem("projects", index)}
                  variant="destructive"
                >
                  Remove Project
                </Button>
              </div>
            </div>
          ))}
          <Button onClick={() => addListItem("projects")} variant='secondary'>Add Project</Button>
        </div>
      </CardContent>
    </Card>
        );
        case "skills":
          return (
            <Card className='bg-[#2a2a2a] border border-gray-800'>
              <CardHeader>
                <CardTitle className='text-white'>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-white">
                  {Object.entries(resumeData.skills).map(([category, skills]) => (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-medium capitalize">{category}</label>
                        <Button 
                          onClick={() => removeListItem("skills", category)} 
                          variant="destructive" 
                          size="sm"
                        >
                          Remove Category
                        </Button>
                      </div>
                      <GrammarCheckInputWrapper
                        value={skills as string}
                        onChange={(e) => handleInputChange("skills", null, category, e.target.value)}
                        onGrammarCheck={() => handleApiGrammarCheck(`skills.${category}`)}
                        isChecking={checkingField === `skills.${category}`}
                        placeholder={`Enter ${category}`}
                        field={`skills.${category}`}
                        onOpenModal={handleOpenSuggestionsModal}
                      />
                    </div>
                  ))}
                  <div className="mt-4">
                    <Input
                      placeholder="New Skill Category"
                      value={newSkillCategory}
                      onChange={(e) => setNewSkillCategory(e.target.value)}
                      className="mb-2"
                    />
                    <Button 
                      onClick={addSkillCategory} 
                      disabled={!newSkillCategory.trim()}
                      variant='secondary'
                    >
                      Add New Skill Category
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
      default:
        return null;
    }
  }, [resumeData, handleInputChange, addListItem, removeListItem, addNestedListItem, removeNestedListItem, handleApiGrammarCheck, checkingField, handleOpenSuggestionsModal]);

  const renderSuggestionsModal = () => {
    if (!activeSuggestionField) {
      return null;
    }
    
    const suggestions = grammarSuggestions[activeSuggestionField] || [];
    
    return (
      <Dialog open={isSuggestionsModalOpen} onOpenChange={setIsSuggestionsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Grammar Suggestions for {activeSuggestionField}</DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-4" style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#888 #f1f1f1'
          }}>
            <div className="py-4">
              {suggestions.length > 0 ? (
                <ul className="space-y-4">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex flex-col space-y-2 border-b pb-4">
                      <div>
                        <span className="font-semibold">Original: </span>
                        <span>{suggestion.original}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Suggestion: </span>
                        <span>{suggestion.suggestion}</span>
                      </div>
                      <div>
                                                <span className="font-semibold">Rule: </span>
                        <span>{suggestion.rule}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Severity: </span>
                        <span>{suggestion.severity}</span>
                      </div>
                      <Button onClick={() => handleApplySuggestion(suggestion.suggestion)}>
                        Apply
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No suggestions available for this field.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSuggestionsModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const renderPreview = () => (
    <div id="resume-preview" className={`bg-[#2a2a2a] p-6 rounded-lg shadow-inner ${fonts[selectedFont].className} `}>
      {/* <h2 className="text-2xl font-bold mb-4">Preview</h2> */}
      <div id = "resume-content-for-pdf" className="bg-[#1a1a1a] p-6 rounded-lg shadow-lg preview-content">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="resume-preview">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="bg-[#1a1a1a] p-6 rounded-lg shadow-lg preview-content">
              {sectionOrder.map((section, index) => (
                <Draggable key={section} draggableId={`preview-${section}`} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="mb-6 pb-4 border-b border-gray-300 last:border-b-0 last:mb-0 last:pb-0"
                    >
                      {section === "personalInfo" && resumeData.personalInfo && (
                        <div className="mb-4">
                          <h1 className="text-3xl font-bold mb-2 text-white">{resumeData.personalInfo.name || "Name"}</h1>
                          <p className="text-sm text-gray-400">
                            {resumeData.personalInfo.phone || "Phone"} | {resumeData.personalInfo.email || "Email"} | {resumeData.personalInfo.location || "Location"}
                          </p>
                          {resumeData.personalInfo.linkedin && (
                          <p className="text-sm text-gray-400">LinkedIn: {resumeData.personalInfo.linkedin}</p>
                        )}
                        {resumeData.personalInfo.github && (
                          <p className="text-sm text-gray-400">GitHub: {resumeData.personalInfo.github}</p>
                          )}
                        </div>
                      )}
                      {section === "education" && resumeData.education && (
                        <div className="mb-4">
                          <h2 className="text-xl font-semibold mb-2 text-white">Education</h2>
                          {resumeData.education.map((edu, index) => (
                            <div key={index} className="mb-2">
                              <p className="font-medium text-white">{edu.institution || "Institution"}</p>
                              <p className="text-white">{edu.degree || "Degree"}</p>
                              <p className="text-sm text-gray-400">{edu.graduationDate || "Graduation Date"}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {section === "experience" && resumeData.experience && resumeData.experience.length > 0 && (
                        <div className="mb-4">
                          <h2 className="text-xl font-semibold mb-2 text-white">Experience</h2>
                          {resumeData.experience.map((exp, index) => (
                            <div key={index} className="mb-4">
                              <p className="font-medium text-white">{exp.position || "Position"}</p>
                              <p className="text-white">{exp.company || "Company"}</p>
                              <p className="text-sm text-gray-400">
                                {exp.startDate || "Start Date"} - {exp.endDate || "End Date"}
                              </p>
                              <ul className="list-disc list-inside mt-1 text-white">
                                {(exp.responsibilities || []).map((resp, respIndex) => (
                                  <li key={respIndex} className="text-sm text-white">
                                    {resp || "Responsibility"}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                      {section === "projects" && resumeData.projects && (
                        <div className="mb-4">
                          <h2 className="text-xl font-semibold mb-2 text-white">Projects</h2>
                          {resumeData.projects.map((project, index) => (
                            <div key={index} className="mb-4">
                              <p className="font-medium text-white">{project.name || "Project Name"} | <span className="font-normal">{project.description || "Project Description"}</span></p>
                              <ul className="list-disc list-inside mt-1 text-white">
                                {(project.details || []).map((detail, detailIndex) => (
                                  <li key={detailIndex} className="text-sm">{detail || "Detail"}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                      {section === "skills" && resumeData.skills && (
                        <div className="mb-4">
                          <h2 className="text-xl font-semibold mb-2 text-white">Technical Skills</h2>
                          {Object.entries(resumeData.skills).map(([category, skills]) => (
                            <p key={category} className="mb-1 text-white">
                              <span className="font-medium capitalize">{category}: </span>
                              {typeof skills === 'string' ? skills : JSON.stringify(skills)}
                            </p>
                          ))}
                        </div>
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
      </div>
    </div>
  )
 

  

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-10 bg-black border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              {/* Left - Logo */}
              <Link href="/" className="flex items-center space-x-2">
                <Sparkles className="w-8 h-8 text-green-400" />
                <span className={`text-3xl font-bold text-white ${fredoka.className}`}>
                  Dynamic<span className="text-green-400">Draft</span>
                </span>
              </Link>

              {/* Center - Navigation Links */}
              <div className="flex items-center space-x-6 absolute left-1/2 transform -translate-x-1/2">
                <Link href="/dashboard" className="text-gray-300 hover:text-white">
                  Dashboard
                </Link>
                <Link href="/choose-template" className="text-gray-300 hover:text-white">
                  Templates
                </Link>
                <Link href="/intmock" className="text-gray-300 hover:text-white">
                  Mock Interview
                </Link>
              </div>

              {/* Right - Action Buttons */}
              <div className="flex items-center space-x-3">
                <Button
                  onClick={resetToDefault}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-md transition duration-300 ease-in-out flex items-center justify-center"
                >
                  Reset to Default
                </Button>
                
                <Button variant="outline" size="icon" onClick={() => setIsSaveDialogOpen(true)}>
                  <Save className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">Save resume</span>
                </Button>

                <Button
                  onClick={exportToPDF}
                  disabled={isExporting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
              </div>
            </div>
          </div>
          
          {/* Save Dialog */}
          <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Resume</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="Enter resume name"
                  value={resumeName}
                  onChange={(e) => setResumeName(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving || !resumeName.trim()}>
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-3" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-5 pointer-events-none"></div>
        </header>
        <main className="container mx-auto px-4 py-8 bg-[#1a1a1a]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <FontSelector selectedFont={selectedFont} onFontChange={setSelectedFont} />
              <Tabs value={activeSection} onValueChange={setActiveSection}>
                <TabsList className="grid w-full grid-cols-5 bg-[#2a2a2a] text-white">
                  {sectionOrder.map((section) => (
                    <TabsTrigger key={section} value={section} className="capitalize">
                      {section}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <ScrollArea className="h-[calc(100vh-12rem)] rounded-md border p-4 border-none">
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
                                  className="mb-4 text-white"
                                >
                                  <div className="flex items-center mb-2">
                                    <GripVertical className="h-5 w-5 text-muted-foreground mr-2" />
                                    <h2 className="text-lg font-semibold capitalize">{section}</h2>
                                  </div>
                                  <TabsContent value={section} forceMount={true} hidden={activeSection !== section}>
                                    <AnimatePresence mode="wait">
                                      <motion.div
                                        key={section}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.2 }}
                                      >
                                        {renderSection(section)}
                                      </motion.div>
                                    </AnimatePresence>
                                  </TabsContent>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </ScrollArea>
              </Tabs>    

        
            <JobMatcher resumeData={resumeData}/>
            </div>
            {renderPreview()}
          </div>
        </main>
        {renderSuggestionsModal()}
      </div>
    </TooltipProvider>
  );
};

export default dynamic (() => Promise.resolve(ResumeBuilder), {ssr: false})
