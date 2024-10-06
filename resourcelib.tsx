import React from 'react';

const ResourceLibrary = ({ resources }) => {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Resource Library</h2>
      <div className="space-y-4">
        {resources.map((resource) => (
          <div key={resource.id} className="p-4 bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-bold">{resource.title}</h3>
            <p className="text-sm text-gray-600">{resource.category}</p>
            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              Read More
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResourceLibrary;
