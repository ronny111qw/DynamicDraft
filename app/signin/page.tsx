
'use client'

import { getProviders, signIn } from 'next-auth/react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Github, Google } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function SignIn() {
  const [providers, setProviders] = useState(null)

  useEffect(() => {
    (async () => {
      const res = await getProviders()
      setProviders(res)
    })()
  }, [])

  if (!providers) {
    return null
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Choose a provider to sign in with</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.values(providers).map((provider) => (
            <div key={provider.name} className="mb-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => signIn(provider.id)}
              >
                {provider.name === 'GitHub' && <Github className="w-4 h-4 mr-2" />}
                {provider.name === 'Google' && <Google className="w-4 h-4 mr-2" />}
                Sign in with {provider.name}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}