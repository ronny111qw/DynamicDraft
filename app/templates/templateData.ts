"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"

export const templates = [
  {
    id: 'professional',
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
    id: 'creative',
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
    id: 'devops',
    name: 'DevOps Engineer',
    content: {
      name: "Alex DevOps",
      phone: "123-456-7890",
      email: "alex@devops.com",
      linkedin: "linkedin.com/in/alexdevops",
      github: "github.com/alexdevops",
      education: [
        {
          school: "Tech University",
          degree: "Bachelor of Science in Computer Science",
          location: "San Francisco, CA",
          graduationDate: "May 2018",
        },
      ],
      experience: [
        {
          title: "Senior DevOps Engineer",
          company: "CloudTech Solutions",
          location: "Remote",
          startDate: "June 2020",
          endDate: "Present",
          responsibilities: [
            "Implemented and maintained CI/CD pipelines using Jenkins and GitLab CI",
            "Managed and optimized AWS infrastructure using Terraform and CloudFormation",
            "Containerized applications using Docker and orchestrated with Kubernetes",
          ],
        },
      ],
      technicalSkills: {
        cloudPlatforms: "AWS, Google Cloud Platform",
        containerization: "Docker, Kubernetes",
        cicdTools: "Jenkins, GitLab CI, GitHub Actions",
        infrastructureAsCode: "Terraform, CloudFormation",
        configurationManagement: "Ansible, Puppet",
        monitoring: "Prometheus, Grafana, ELK Stack",
        scripting: "Bash, Python, Go",
      },
      certifications: [
        "AWS Certified DevOps Engineer - Professional",
        "Certified Kubernetes Administrator (CKA)",
        "HashiCorp Certified Terraform Associate",
      ],
      projects: [
        {
          name: "Microservices Migration",
          description: "Led the migration of a monolithic application to a microservices architecture, implementing Docker containers and Kubernetes for orchestration.",
          technologies: "Docker, Kubernetes, AWS EKS, Istio",
        },
      ],
    },
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity Specialist",
    content: {
      name: "Dana Clark",
      phone: "789-012-3456",
      email: "dana.clark@example.com",
      linkedin: "linkedin.com/in/danaclark",
      github: "github.com/dclark",
      education: [
        {
          school: "Georgia Tech",
          degree: "Master of Science in Cybersecurity",
          location: "Atlanta, GA",
          graduationDate: "August 2021"
        }
      ],
      experience: [
        {
          title: "Cybersecurity Analyst",
          company: "SecureTech",
          location: "Houston, TX",
          startDate: "September 2021",
          endDate: "Present",
          responsibilities: [
            "Conducted security audits and risk assessments to identify vulnerabilities",
            "Monitored network traffic and implemented security protocols to prevent breaches",
            "Collaborated with development teams to ensure secure application deployment"
          ]
        }
      ],
      projects: [
        {
          name: "Network Security Enhancement",
          technologies: "Wireshark, Snort, Metasploit",
          startDate: "June 2022",
          endDate: "August 2022",
          details: [
            "Strengthened network defenses by implementing intrusion detection systems (IDS)",
            "Performed penetration testing to identify and mitigate security vulnerabilities",
            "Achieved a 30% reduction in successful cyber attacks on the network"
          ]
        }
      ],
      skills: {
        languages: "Python, JavaScript",
        tools: "Wireshark, Snort, Metasploit",
        certifications: "CEH, CISSP, Security+"
      }
    }
  },

  {
    id: 'data-scientist',
    name: 'Data Scientist',
    content: {
      name: "Emily Chen",
      phone: "555-123-4567",
      email: "emily.chen@example.com",
      linkedin: "linkedin.com/in/emilychen",
      github: "github.com/echen",
      education: [
        {
          school: "Stanford University",
          degree: "Ph.D. in Statistics",
          location: "Stanford, CA",
          graduationDate: "May 2020",
        },
        {
          school: "University of California, Berkeley",
          degree: "B.S. in Data Science",
          location: "Berkeley, CA",
          graduationDate: "May 2016",
        },
      ],
      experience: [
        {
          title: "Senior Data Scientist",
          company: "TechCorp Analytics",
          location: "San Francisco, CA",
          startDate: "June 2020",
          endDate: "Present",
          responsibilities: [
            "Develop and implement machine learning models to predict customer behavior and optimize marketing strategies",
            "Lead a team of data analysts in conducting A/B tests and interpreting results",
            "Collaborate with cross-functional teams to identify business opportunities and develop data-driven solutions",
          ],
        },
      ],
      projects: [
        {
          name: "Customer Churn Prediction Model",
          technologies: "Python, Scikit-learn, TensorFlow, SQL",
          startDate: "Jan 2021",
          endDate: "Apr 2021",
          details: [
            "Developed a machine learning model to predict customer churn with 85% accuracy",
            "Implemented feature engineering techniques to improve model performance",
            "Created interactive dashboards using Tableau to visualize model insights",
          ],
        },
      ],
      skills: {
        languages: "Python, R, SQL",
        frameworks: "TensorFlow, PyTorch, Scikit-learn",
        dataVisualization: "Tableau, Matplotlib, Seaborn",
        bigDataTechnologies: "Hadoop, Spark",
        statisticalAnalysis: "Hypothesis Testing, Regression Analysis, Time Series Analysis",
      },
    },
  },
  {
    id: 'frontend-developer',
    name: 'Frontend Developer',
    content: {
      name: "Chris Taylor",
      phone: "444-555-6666",
      email: "chris.taylor@example.com",
      linkedin: "linkedin.com/in/christaylor",
      github: "github.com/ctaylor",
      education: [
        {
          school: "Massachusetts Institute of Technology",
          degree: "B.S. in Computer Science",
          location: "Cambridge, MA",
          graduationDate: "May 2019",
        },
      ],
      experience: [
        {
          title: "Frontend Developer",
          company: "WebSolutions Inc.",
          location: "Boston, MA",
          startDate: "July 2019",
          endDate: "Present",
          responsibilities: [
            "Develop and maintain responsive web applications using React and Vue.js",
            "Collaborate with UX designers to implement intuitive user interfaces",
            "Optimize application performance and ensure cross-browser compatibility",
          ],
        },
      ],
      projects: [
        {
          name: "E-commerce Platform Redesign",
          technologies: "React, Redux, Styled Components",
          startDate: "Mar 2020",
          endDate: "Jun 2020",
          details: [
            "Led the frontend redesign of a major e-commerce platform",
            "Implemented a new component library to improve design consistency",
            "Improved page load times by 40% through code optimization",
          ],
        },
      ],
      skills: {
        languages: "JavaScript (ES6+), HTML5, CSS3",
        frameworks: "React, Vue.js, Angular",
        styling: "Sass, Less, Styled Components",
        buildTools: "Webpack, Babel, Gulp",
        versionControl: "Git, GitHub",
        testing: "Jest, Enzyme, Cypress",
      },
    },
  },
]


export default function ResumeTemplates() {
  const router = useRouter()

  const useTemplate = (templateId: string) => {
    console.log('useTemplate called with id:', templateId);
    const selectedTemplate = templates.find(template => template.id === templateId);
    if (selectedTemplate) {
      localStorage.setItem('selectedTemplate', JSON.stringify(selectedTemplate));
      router.push('/resume-builder');
      console.log('Navigation initiated');
    } else {
      console.error('Template not found');
    }
  }
}
