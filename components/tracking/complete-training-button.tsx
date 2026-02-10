'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface CompleteTrainingButtonProps {
  token: string
}

export default function CompleteTrainingButton({ token }: CompleteTrainingButtonProps) {
  const [isCompleted, setIsCompleted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleComplete = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/track/complete-training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      if (response.ok) {
        setIsCompleted(true)
      } else {
        console.error('Failed to complete training')
      }
    } catch (error) {
      console.error('Error completing training:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isCompleted) {
    return (
      <div className="text-center py-4">
        <div className="inline-flex items-center gap-3 text-green-600 text-lg font-semibold">
          <CheckCircle2 className="w-6 h-6" />
          <span>Training Complete! Thank you for participating.</span>
        </div>
        <p className="text-gray-600 mt-2">
          You may now close this window.
        </p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <button
        onClick={handleComplete}
        disabled={isLoading}
        className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Completing...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5" />
            <span>Complete Training</span>
          </>
        )}
      </button>
      <p className="text-sm text-gray-500 mt-3">
        Click to mark this training as complete
      </p>
    </div>
  )
}
