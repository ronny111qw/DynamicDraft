import React, { useState, useEffect } from 'react'
import Joyride, { CallBackProps, STATUS } from 'react-joyride'

interface HelpAndOnboardingProps {
  isMenuOpen: boolean
}

const HelpAndOnboarding: React.FC<HelpAndOnboardingProps> = ({ isMenuOpen }) => {
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
    // Add more steps as needed
  ]

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false)
    }
  }

  return (
    <>
      {/* Floating Help Button */}
      <button
        className="fixed bottom-4 right-4 bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 z-50"
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
              <li>Add sections to your resume using the left panel</li>
              <li>Drag and drop sections to reorder them</li>
              <li>Use AI suggestions to improve your content</li>
              <li>Preview your resume in real-time on the right</li>
            </ul>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={() => setShowHelp(false)}
            >
              Close
            </button>
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
            primaryColor: '#3B82F6',
          },
        }}
      />
    </>
  )
}

export default HelpAndOnboarding
