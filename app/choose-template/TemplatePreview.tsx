interface TemplatePreviewProps {
    template: {
      id: string;
      name: string;
      content: {
        personalInfo: { name: string; email: string; phone: string; location: string };
        education: { institution: string; degree: string; graduationDate: string }[];
        experience: { company: string; position: string; startDate: string; endDate: string; responsibilities: string[] }[];
        skills: string[];
      };
    };
  }
  
  function TemplatePreview({ template }: TemplatePreviewProps) {
    return (
      <div className="w-full h-48 bg-white p-2 text-xs overflow-hidden">
        <div className="border-b border-gray-300 pb-1 mb-1">
          <div className="font-bold">{template.content.personalInfo.name}</div>
          <div>{template.content.personalInfo.email} | {template.content.personalInfo.phone}</div>
        </div>
        <div className="mb-1">
          <div className="font-bold">Experience</div>
          {template.content.experience.slice(0, 1).map((exp, index) => (
            <div key={index}>
              <div>{exp.company} - {exp.position}</div>
              <div>{exp.startDate} - {exp.endDate}</div>
            </div>
          ))}
        </div>
        <div>
          <div className="font-bold">Education</div>
          {template.content.education.slice(0, 1).map((edu, index) => (
            <div key={index}>
              <div>{edu.institution}</div>
              <div>{edu.degree}, {edu.graduationDate}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }