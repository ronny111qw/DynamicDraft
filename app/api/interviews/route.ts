import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const defaultPreparationTasks = [
  { id: '1', task: 'Research the company', completed: false },
  { id: '2', task: 'Review job description', completed: false },
  { id: '3', task: 'Prepare questions for interviewer', completed: false },
  { id: '4', task: 'Practice common interview questions', completed: false },
  { id: '5', task: 'Prepare your STAR stories', completed: false },
]

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect()
    console.log('Database connected successfully')

    const session = await getServerSession(authOptions)
    console.log('Session:', session)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('Attempting to fetch interviews for user:', session.user.id)
    const interviews = await prisma.interview.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        date: 'asc'
      }
    })
    console.log('Interviews fetched:', interviews)

    return NextResponse.json(interviews)
  } catch (error) {
    console.error('Detailed error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json(
      { error: "Failed to fetch interviews", details: error.message },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await req.json()
    
    // Ensure all required fields are present
    const createData = {
      company: data.company,
      position: data.position,
      date: data.date,
      time: data.time,
      type: data.type || 'onsite',
      notes: data.notes || '',
      status: data.status || 'scheduled',
      reminder: data.reminder || false,
      preparationTasks: data.preparationTasks || defaultPreparationTasks,
      userId: session.user.id
    }

    console.log('Creating interview with data:', createData)

    const interview = await prisma.interview.create({
      data: createData
    })

    return NextResponse.json(interview)
  } catch (error) {
    console.error('Error creating interview:', error)
    return NextResponse.json(
      { 
        error: "Failed to create interview",
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const data = await req.json()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const interview = await prisma.interview.update({
      where: {
        id: data.id,
        userId: session.user.id
      },
      data: data
    })

    return NextResponse.json(interview)
  } catch (error) {
    console.error('Error updating interview:', error)
    return NextResponse.json(
      { error: "Failed to update interview" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const data = await req.json()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.interview.delete({
      where: {
        id: data.id,
        userId: session.user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting interview:', error)
    return NextResponse.json(
      { error: "Failed to delete interview" },
      { status: 500 }
    )
  }
} 