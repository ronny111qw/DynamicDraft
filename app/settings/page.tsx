"use client"

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function Settings() {
  return (
    <div className="container mx-auto p-4">
      <Link href="/dashboard" className="flex items-center text-blue-600 hover:text-blue-800 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Link>

      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <p>Settings page content coming soon...</p>
    </div>
  )
}