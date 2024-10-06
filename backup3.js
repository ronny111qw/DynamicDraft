"use client"
import React, { useState, useCallback, useEffect, useRef } from "react"
import debounce from 'lodash/debounce'
import { checkGrammar, isResumeSpecificTerm } from '../utils/grammarCheck';
import { GrammarSuggestions } from '../components/GrammarSuggestions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { SpellCheck } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem, 
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { FileText, Download, Trash2, PlusCircle, GripVertical, Moon, Sun, Loader2, Check } from "lucide-react"


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
  return (
    <div className="relative w-full">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`pr-16 ${className}`}
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









const ResumeBuilder = () => {
  const [resumeData, setResumeData] = useState({
    personalInfo: { name: "Jake Ryan", email: "jake@su.edu", phone: "123-456-7890", location: "Georgetown, TX" },
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
  const [activeSection, setActiveSection] = useState("personalInfo")
  const [sectionOrder, setSectionOrder] = useState(["personalInfo", "education", "experience", "projects", "skills"])
  const { theme, setTheme } = useTheme()
  const [isExporting, setIsExporting] = useState(false)
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


  const renderSuggestionsModal = () => {
    console.log('Rendering suggestions modal');
    console.log('Active suggestion field:', activeSuggestionField);
    console.log('All grammar suggestions:', grammarSuggestions);
    
    if (!activeSuggestionField) {
      console.log('No active suggestion field');
      return null;
    }
    
    const suggestions = grammarSuggestions[activeSuggestionField] || [];
    console.log('Suggestions for active field:', suggestions);
    
    return (
      <Dialog open={isSuggestionsModalOpen} onOpenChange={setIsSuggestionsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grammar Suggestions for {activeSuggestionField}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {suggestions.length > 0 ? (
              <ul className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="flex flex-col space-y-2 border-b pb-2">
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
          <DialogFooter>
            <Button onClick={() => setIsSuggestionsModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

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
      const [section, index, field] = activeSuggestionField.split('.');
      handleInputChange(section, index ? parseInt(index) : null, field, suggestion);
    }
    handleCloseSuggestionsModal();
  };

  

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
    console.log('Starting grammar check for field:', field);
    const now = Date.now();
    if (now - lastApiCallTimeRef.current < 60000) {
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
      console.log('Calling checkGrammar for text:', text);
      const results = await checkGrammar(text, true);
      console.log('Grammar check results:', results);
      
      const filteredResults = results.filter(result => !isResumeSpecificTerm(result.original));
      console.log('Filtered results:', filteredResults);
      
      setGrammarSuggestions(prev => {
        const newSuggestions = {
          ...prev,
          [field]: filteredResults
        };
        console.log('Updated grammar suggestions:', newSuggestions);
        return newSuggestions;
      });
      
      lastApiCallTimeRef.current = now;
      setActiveSuggestionField(field);
      setIsSuggestionsModalOpen(true);  
    } catch (error) {
      console.error('Error in API grammar check:', error);
    } finally {
      setCheckingField(null);
    }
  }, [resumeData]);  // handleOpenSuggestionsModal

  const handleInputChange = useCallback((section: string, index: number | null, field: string, value: any) => {
    setResumeData(prevData => {
      const newData = { ...prevData };
      if (index !== null) {
        newData[section][index][field] = value;
      } else {
        newData[section][field] = value;
      }
      return newData;
    });
  
    // Only perform local grammar check
    const fullField = index !== null ? `${section}.${index}.${field}` : `${section}.${field}`;
    debouncedCheckGrammar(value, fullField, false);
  }, [debouncedCheckGrammar]);

  const addListItem = useCallback((section: string) => {
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

  const removeListItem = useCallback((section: string, index: number) => {
    setResumeData((prev) => {
      const newData = { ...prev };
      newData[section].splice(index, 1);
      return newData;
    });
  }, []);

  function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  const onDragEnd = useCallback((result) => {
    if (!result.destination) return;

    const newOrder = Array.from(sectionOrder);
    const [reorderedItem] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, reorderedItem);

    setSectionOrder(newOrder);
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

  const removeSkillsCategory = useCallback((category: string) => {
    setResumeData(prevData => {
      const newSkills = { ...prevData.skills };
      delete newSkills[category];
      return { ...prevData, skills: newSkills };
    });
  }, []);

  const addSkillsCategory = useCallback(() => {
    setResumeData(prevData => {
      const newSkills = { ...prevData.skills };
      const newCategory = `New Category ${Object.keys(newSkills).length + 1}`;
      newSkills[newCategory] = '';
      return { ...prevData, skills: newSkills };
    });
  }, []);

  const addNestedListItem = useCallback((section: string, index: number, field: string) => {
    setResumeData(prevData => {
      const newData = { ...prevData };
      if (Array.isArray(newData[section][index][field])) {
        newData[section][index][field].push('');
      }
      return newData;
    });
  }, []);

  const removeNestedListItem = useCallback((section: string, index: number, field: string, itemIndex: number) => {
    setResumeData(prevData => {
      const newData = { ...prevData };
      if (Array.isArray(newData[section][index][field])) {
        newData[section][index][field].splice(itemIndex, 1);
      }
      return newData; 
    });
  }, []);

  const exportResume = useCallback(() => {
    setIsExporting(true);
    // Simulating export process
    setTimeout(() => {
      setIsExporting(false);
      // Here you would implement the actual PDF generation and download
      console.log("Resume exported");
    }, 2000);
  }, []); 

  useEffect(() => {
    // Load saved resume data from localStorage
    const savedResume = localStorage.getItem("resumeData");
    if (savedResume) {
      setResumeData(JSON.parse(savedResume));
    }
  }, []);

  useEffect(() => {
    // Save resume data to localStorage
    localStorage.setItem("resumeData", JSON.stringify(resumeData));
  }, [resumeData]);

  const resetToDefault = () => {
    setResumeData({
      personalInfo: { name: "Jake Ryan", email: "jake@su.edu", phone: "123-456-7890", location: "Georgetown, TX" },
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
  const renderSection = useCallback((section) => {
    switch (section) {
      case "personalInfo":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(resumeData.personalInfo).map(([field, value]) => (
                  <div key={field} className="space-y-2">
                    <GrammarCheckInputWrapper
                      value={value}
                      onChange={(e) => handleInputChange('personalInfo', null, field, e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`personalInfo.${field}`)}
                      isChecking={checkingField === `personalInfo.${field}`}
                      placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                      className="w-full"
                      field={`personalInfo.${field}`}
                      onOpenModal={() => {}} // This is no longer needed, but keep it for consistency

                    />  
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
        case "education":
          return (
            <Card>
              <CardHeader>
                <CardTitle>Education</CardTitle>
              </CardHeader>
              <CardContent>
                {resumeData.education.map((edu, index) => (
                  <div key={index} className="mb-4 space-y-2">
                    <GrammarCheckInputWrapper
                      value={edu.institution}
                      onChange={(e) => handleInputChange('education', index, 'institution', e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`education.${index}.institution`)}
                      isChecking={checkingField === `education.${index}.institution`}
                      placeholder="Institution"
                      field={`education.${index}.institution`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                    <GrammarCheckInputWrapper
                      value={edu.degree}
                      onChange={(e) => handleInputChange('education', index, 'degree', e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`education.${index}.degree`)}
                      isChecking={checkingField === `education.${index}.degree`}
                      placeholder="Degree"
                      field={`education.${index}.degree`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                    <GrammarCheckInputWrapper
                      value={edu.graduationDate}
                      onChange={(e) => handleInputChange('education', index, 'graduationDate', e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`education.${index}.graduationDate`)}
                      isChecking={checkingField === `education.${index}.graduationDate`}
                      placeholder="Graduation Date"
                      field={`education.${index}.graduationDate`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                    <Button onClick={() => removeListItem('education', index)}>Remove</Button>
                  </div>
                ))}
                <Button onClick={() => addListItem('education')}>Add Education</Button>
              </CardContent>
            </Card>
          );
    
        case "experience":
          return (
            <Card>
              <CardHeader>
                <CardTitle>Experience</CardTitle>
              </CardHeader>
              <CardContent>
                {resumeData.experience.map((exp, index) => (
                  <div key={index} className="mb-4 space-y-2">
                    <GrammarCheckInputWrapper
                      value={exp.company}
                      onChange={(e) => handleInputChange('experience', index, 'company', e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`experience.${index}.company`)}
                      isChecking={checkingField === `experience.${index}.company`}
                      placeholder="Company"
                      field={`experience.${index}.company`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                    <GrammarCheckInputWrapper
                      value={exp.position}
                      onChange={(e) => handleInputChange('experience', index, 'position', e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`experience.${index}.position`)}
                      isChecking={checkingField === `experience.${index}.position`}
                      placeholder="Position"
                      field={`experience.${index}.position`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                    <GrammarCheckInputWrapper
                      value={exp.startDate}
                      onChange={(e) => handleInputChange('experience', index, 'startDate', e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`experience.${index}.startDate`)}
                      isChecking={checkingField === `experience.${index}.startDate`}
                      placeholder="Start Date"
                      field={`experience.${index}.startDate`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                    <GrammarCheckInputWrapper
                      value={exp.endDate}
                      onChange={(e) => handleInputChange('experience', index, 'endDate', e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`experience.${index}.endDate`)}
                      isChecking={checkingField === `experience.${index}.endDate`}
                      placeholder="End Date"
                      field={`experience.${index}.endDate`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                    {exp.responsibilities.map((resp, respIndex) => (
                      <div key={respIndex} className="flex items-center space-x-2">
                        <GrammarCheckInputWrapper
                          value={resp}
                          onChange={(e) => handleInputChange('experience', index, 'responsibilities', e.target.value, respIndex)}
                          onGrammarCheck={() => handleApiGrammarCheck(`experience.${index}.responsibilities.${respIndex}`)}
                          isChecking={checkingField === `experience.${index}.responsibilities.${respIndex}`}
                          placeholder={`Responsibility ${respIndex + 1}`}
                          field={`experience.${index}.responsibilities.${respIndex}`}
                          onOpenModal={handleOpenSuggestionsModal}
                        />
                        <Button onClick={() => removeNestedListItem('experience', index, 'responsibilities', respIndex)}>Remove</Button>
                      </div>
                    ))}
                    <Button onClick={() => addNestedListItem('experience', index, 'responsibilities')}>Add Responsibility</Button>
                    <Button onClick={() => removeListItem('experience', index)}>Remove Experience</Button>
                  </div>
                ))}
                <Button onClick={() => addListItem('experience')}>Add Experience</Button>
              </CardContent>
            </Card>
          );
    
        case "projects":
          return (
            <Card>
              <CardHeader>
                <CardTitle>Projects</CardTitle>
              </CardHeader>
              <CardContent>
                {resumeData.projects.map((project, index) => (
                  <div key={index} className="mb-4 space-y-2">
                    <GrammarCheckInputWrapper
                      value={project.name}
                      onChange={(e) => handleInputChange('projects', index, 'name', e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`projects.${index}.name`)}
                      isChecking={checkingField === `projects.${index}.name`}
                      placeholder="Project Name"
                      field={`projects.${index}.name`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                    <GrammarCheckInputWrapper
                      value={project.description}
                      onChange={(e) => handleInputChange('projects', index, 'description', e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`projects.${index}.description`)}
                      isChecking={checkingField === `projects.${index}.description`}
                      placeholder="Project Description"
                      field={`projects.${index}.description`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                    {project.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="flex items-center space-x-2">
                        <GrammarCheckInputWrapper
                          value={detail}
                          onChange={(e) => handleInputChange('projects', index, 'details', e.target.value, detailIndex)}
                          onGrammarCheck={() => handleApiGrammarCheck(`projects.${index}.details.${detailIndex}`)}
                          isChecking={checkingField === `projects.${index}.details.${detailIndex}`}
                          placeholder={`Detail ${detailIndex + 1}`}
                          field={`projects.${index}.details.${detailIndex}`}
                          onOpenModal={handleOpenSuggestionsModal}
                        />
                        <Button onClick={() => removeNestedListItem('projects', index, 'details', detailIndex)}>Remove</Button>
                      </div>
                    ))}
                    <Button onClick={() => addNestedListItem('projects', index, 'details')}>Add Detail</Button>
                    <Button onClick={() => removeListItem('projects', index)}>Remove Project</Button>
                  </div>
                ))}
                <Button onClick={() => addListItem('projects')}>Add Project</Button>
              </CardContent>
            </Card>
          );
    
        case "skills":
          return (
            <Card>
              <CardHeader>
                <CardTitle>Technical Skills</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.entries(resumeData.skills).map(([category, skills]) => (
                  <div key={category} className="mb-4 space-y-2">
                    <GrammarCheckInputWrapper
                      value={category}
                      onChange={(e) => handleSkillsCategoryChange(category, e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`skills.${category}`)}
                      isChecking={checkingField === `skills.${category}`}
                      placeholder="Skill Category"
                      field={`skills.${category}`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                    <GrammarCheckInputWrapper
                      value={skills}
                      onChange={(e) => handleInputChange('skills', null, category, e.target.value)}
                      onGrammarCheck={() => handleApiGrammarCheck(`skills.${category}.value`)}
                      isChecking={checkingField === `skills.${category}.value`}
                      placeholder="Skills (comma-separated)"
                      field={`skills.${category}.value`}
                      onOpenModal={handleOpenSuggestionsModal}
                    />
                    <Button onClick={() => removeSkillsCategory(category)}>Remove Category</Button>
                  </div>
                ))}
                <Button onClick={addSkillsCategory}>Add Skill Category</Button>
              </CardContent>
            </Card>
          );
      default:
        return null;
    }
  }, 

      [resumeData, handleInputChange, handleApiGrammarCheck, checkingField, handleOpenSuggestionsModal, 
      addListItem, removeListItem, addNestedListItem, removeNestedListItem, 
      handleSkillsCategoryChange, removeSkillsCategory, addSkillsCategory]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-10 bg-background border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <FileText className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Resume Builder</h1>
            </div>
            <div className="flex items-center space-x-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      <span className="sr-only">Toggle theme</span>
                    </Button>
                  </TooltipTrigger>
                  <Button
                onClick={resetToDefault}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-md transition duration-300 ease-in-out flex items-center justify-center"
              >
                Reset to Default
              </Button>
                  <TooltipContent>
                    <p>Toggle theme</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Export Resume</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to export your resume as a PDF?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={exportResume} disabled={isExporting}>
                      {isExporting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        "Export"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <Tabs value={activeSection} onValueChange={setActiveSection}>
                <TabsList className="grid w-full grid-cols-5">
                  {sectionOrder.map((section) => (
                    <TabsTrigger key={section} value={section} className="capitalize">
                      {section}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <ScrollArea className="h-[calc(100vh-12rem)] rounded-md border p-4">
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
                                  className="mb-4"
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
            </div>
            <div className="bg-muted p-6 rounded-lg shadow-inner">
              <h2 className="text-2xl font-bold mb-4">Preview</h2>
              <div className="bg-background p-6 rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold mb-2">{resumeData.personalInfo.name}</h1>
                <p className="text-sm text-muted-foreground mb-4">
                  {resumeData.personalInfo.phone} | {resumeData.personalInfo.email} | {resumeData.personalInfo.location}
                </p>  
                <hr className="my-4" />

                <h2 className="text-xl font-semibold mb-2">Education</h2>
                {resumeData.education.map((edu, index) => (
                  <div key={index} className="mb-2">
                    <p className="font-medium">{edu.institution}</p>
                    <p>{edu.degree}</p>
                    <p className="text-sm text-muted-foreground">{edu.graduationDate}</p>
                  </div>
                ))}

<hr className="my-4" />

                <h2 className="text-xl font-semibold mt-4 mb-2">Experience</h2>
                {resumeData.experience.map((exp, index) => (
                  <div key={index} className="mb-4">
                    <p className="font-medium">{exp.position}</p>
                    <p>{exp.company}</p>
                    <p className="text-sm text-muted-foreground">{exp.startDate} - {exp.endDate}</p>
                    <ul className="list-disc list-inside mt-1">
                      {exp.responsibilities.map((resp, respIndex) => (
                        <li key={respIndex} className="text-sm">{resp}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                    <hr className="my-4" />

                <h2 className="text-xl font-semibold mt-4 mb-2">Projects</h2>
                {resumeData.projects.map((project, index) => (
                  <div key={index} className="mb-4">
                    <p className="font-medium">{project.name} | <span className="font-normal">{project.description}</span></p>
                    <ul className="list-disc list-inside mt-1">
                      {project.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="text-sm">{detail}</li>
                      ))}
                    </ul>
                  </div>
                ))} 
                    <hr className="my-4" />


                <h2 className="text-xl font-semibold mt-4 mb-2">Technical Skills</h2>
                {Object.entries(resumeData.skills).map(([category, skills]) => (
                  <p key={category} className="mb-1">
                    <span className="font-medium capitalize">{category}: </span>
                    {skills}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </main>
        {renderSuggestionsModal()}
      </div>
    </TooltipProvider>
  );
};

export default ResumeBuilder;