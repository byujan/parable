'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, AlertCircle, Eye, Link as LinkIcon, FileText } from 'lucide-react'
import Link from 'next/link'

interface SimulationDisclosureProps {
  token: string
  showImmediately?: boolean
}

export default function SimulationDisclosure({
  token,
  showImmediately = false
}: SimulationDisclosureProps) {
  const [isVisible, setIsVisible] = useState(showImmediately)

  useEffect(() => {
    // Show after form submission
    const handleFormSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement
      if (form && form.tagName === 'FORM') {
        setIsVisible(true)
      }
    }

    // Show after 15 seconds
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 15000)

    // Listen for form submissions
    document.addEventListener('submit', handleFormSubmit)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('submit', handleFormSubmit)
    }
  }, [])

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-2xl border-2 border-blue-500 p-8">
        {/* Icon and Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <ShieldCheck className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            This Was a Phishing Simulation
          </h1>
          <p className="text-gray-600">
            This exercise was conducted by your organization as part of security awareness
            training. No personal data was collected or stored.
          </p>
        </div>

        {/* What to Look For Section */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            What Should You Look For?
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-gray-900">Suspicious sender addresses:</strong>
                <span className="text-gray-600"> Check if the email domain matches the official company domain</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <LinkIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-gray-900">Unusual links:</strong>
                <span className="text-gray-600"> Hover over links before clicking to see where they really go</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-gray-900">Urgent or threatening language:</strong>
                <span className="text-gray-600"> Phishers create urgency to make you act without thinking</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-gray-900">Requests for sensitive information:</strong>
                <span className="text-gray-600"> Legitimate companies never ask for passwords via email</span>
              </div>
            </li>
          </ul>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Link
            href={`/training/${token}`}
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Complete Your Training
          </Link>
          <p className="text-sm text-gray-500 mt-3">
            Learn more about protecting yourself from phishing attacks
          </p>
        </div>
      </div>
    </div>
  )
}
