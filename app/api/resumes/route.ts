import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"
import {prisma} from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resumes = await prisma.resume.findMany({
      where: {
        user: {
          email: session.user.email
        }
      },
      orderBy: {
        dateCreated: 'desc'
      }
    })

    return NextResponse.json(resumes)
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    console.log('Session:', session);
    
    if (!session?.user?.email) {
      console.log('Unauthorized - No session or email');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Received body:', body);
    
    const resume = await prisma.resume.create({
      data: {
        content: body.content,
        template: body.template,
        user: {
          connect: {
            email: session.user.email
          }
        }
      }
    })
    
    console.log('Created resume:', resume);
    return NextResponse.json(resume)
  } catch (error) {
    console.error('Error saving resume:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}