import React from 'react';
import { ResumeData } from '@/app/resumeTemplates';

interface ResumeTemplateProps {
  data: ResumeData;
  template: string;
}

const ResumeTemplate: React.FC<ResumeTemplateProps> = ({ data, template }) => {
  // Implement the resume layout based on the template
  return (
    <div className={`resume-template ${template}`}>
      <h1>{data.name}</h1>
      <p>{data.contact.email} · {data.contact.phone} · {data.contact.location}</p>
      
      <h2>BUSINESS MANAGEMENT & ANALYSIS</h2>
      <p>{data.summary}</p>
      
      <h2>KEY COMPETENCIES</h2>
      {/* Render key competencies */}
      
      <h2>PROFESSIONAL EXPERIENCE</h2>
      {data.experience.map((exp, index) => (
        <div key={index}>
          <h3>{exp.company}</h3>
          <p>{exp.title}</p>
          <p>{exp.startDate} - {exp.endDate}</p>
          <ul>
            {exp.responsibilities.map((resp, i) => (
              <li key={i}>{resp}</li>
            ))}
          </ul>
        </div>
      ))}
      
      {/* Render Education and Certifications */}
      {/* Render Extracurricular Activities */}
    </div>
  );
};

export default ResumeTemplate;