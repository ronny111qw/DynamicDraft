import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const resources = await prisma.resource.findMany({
    where: {
      userId: session.user.id
    }
  })

  return NextResponse.json(resources)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const data = await req.json()
  const resource = await prisma.resource.create({
    data: {
      ...data,
      userId: session.user.id
    }
  })

  return NextResponse.json(resource)
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  const data = await req.json()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const resource = await prisma.resource.update({
    where: {
      id: data.id,
      userId: session.user.id
    },
    data: data
  })

  return NextResponse.json(resource)
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  const data = await req.json()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await prisma.resource.delete({
    where: {
      id: data.id,
      userId: session.user.id
    }
  })

  return NextResponse.json({ success: true })
} 