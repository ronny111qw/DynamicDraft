import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resumeId = parseInt(params.id)
    const body = await request.json()

    // Verify the resume belongs to the user
    const existingResume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        user: {
          email: session.user.email
        }
      }
    })

    if (!existingResume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    const updatedResume = await prisma.resume.update({
      where: {
        id: resumeId
      },
      data: {
        content: body.content
      }
    })

    return NextResponse.json(updatedResume)
  } catch (error) {
    console.error('Error updating resume:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resumeId = parseInt(params.id)

    // Verify the resume belongs to the user
    const existingResume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        user: {
          email: session.user.email
        }
      }
    })

    if (!existingResume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    await prisma.resume.delete({
      where: {
        id: resumeId
      }
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting resume:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 