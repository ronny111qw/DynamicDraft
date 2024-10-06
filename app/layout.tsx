import { Inter } from 'next/font/google'
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Resume Builder',
  description: 'Build your professional resume with ease',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
    
  )
}