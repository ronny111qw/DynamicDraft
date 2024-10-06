export interface ResumeData {
  name: string;
  title: string; // Add this line
  contact: {
    email: string;
    phone: string;
    location: string;
  };
  summary: string;
  keyCompetencies: string[];
  experience: Array<{
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    responsibilities: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    location: string;
    graduationDate: string;
  }>;
  projects: Array<{
    name: string;
    technologies: string;
    startDate: string;
    endDate: string;
    details: string[];
  }>;
  skills: {
    languages: string;
    frameworks: string;
    developerTools: string;
    libraries: string;
  };
}

export interface Template {
  name: string;
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  headingStyle: string;
  bodyStyle: string;
  sampleData: ResumeData;
}

const defaultResumeData: ResumeData = {
  name: "Alex Johnson",
  title: "Software Engineer",
  contact: {
    email: "alex.johnson@email.com",
    phone: "(555) 123-4567",
    location: "San Francisco, CA",
  },
  summary: "Innovative and deadline-driven Software Engineer with 5+ years of experience designing and developing user-centered digital/print marketing material from initial concept to final, polished deliverable.",
  experience: [
    {
      title: "Senior Software Engineer",
      company: "Techno Solutions Inc.",
      date: "2018 - Present",
      description: [
        "Lead developer for client web applications using React and Node.js",
        "Implemented CI/CD pipelines, reducing deployment time by 40%",
        "Mentored junior developers, improving team productivity by 25%",
      ],
    },
    {
      title: "Software Developer",
      company: "WebCraft Designs",
      date: "2015 - 2018",
      description: [
        "Developed responsive websites for various clients using HTML, CSS, and JavaScript",
        "Collaborated with UX designers to implement user-friendly interfaces",
        "Optimized database queries, improving application performance by 30%",
      ],
    },
  ],
  education: [
    {
      degree: "Bachelor of Science in Computer Science",
      school: "University of Technology",
      date: "2011 - 2015",
    },
  ],
  skills: ["JavaScript", "React", "Node.js", "Python", "SQL", "Git", "Agile Methodologies"],
};

export const templates: Record<string, Template> = {
  modern: {
    name: "Modern",
    fontFamily: "'Inter', sans-serif",
    primaryColor: "#3B82F6",
    secondaryColor: "#1F2937",
    backgroundColor: "#FFFFFF",
    headingStyle: "text-2xl font-bold mb-2",
    bodyStyle: "text-base leading-relaxed",
    sampleData: {
      ...defaultResumeData,
      name: "Emily Chen",
      title: "UX/UI Designer",
    },
  },
  classic: {
    name: "Classic",
    fontFamily: "'Georgia', serif",
    primaryColor: "#10B981",
    secondaryColor: "#374151",
    backgroundColor: "#F9FAFB",
    headingStyle: "text-2xl font-serif mb-2",
    bodyStyle: "text-base leading-relaxed",
    sampleData: {
      ...defaultResumeData,
      name: "Michael Smith",
      title: "Marketing Manager",
    },
  },
  minimalist: {
    name: "Minimalist",
    fontFamily: "'Arial', sans-serif",
    primaryColor: "#6B7280",
    secondaryColor: "#111827",
    backgroundColor: "#FFFFFF",
    headingStyle: "text-xl font-semibold mb-2",
    bodyStyle: "text-sm leading-relaxed",
    sampleData: {
      ...defaultResumeData,
      name: "Sarah Johnson",
      title: "Data Analyst",
    },
  },
  creative: {
    name: "Creative",
    fontFamily: "'Poppins', sans-serif",
    primaryColor: "#8B5CF6",
    secondaryColor: "#5B21B6",
    backgroundColor: "#F3F4F6",
    headingStyle: "text-2xl font-bold mb-2 italic",
    bodyStyle: "text-base leading-relaxed",
    sampleData: {
      ...defaultResumeData,
      name: "David Lee",
      title: "Graphic Designer",
    },
  },
};