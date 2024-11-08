import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Save a question set
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, questions, resume, jobDescription, difficulty, industry } = await req.json();

    const savedSet = await prisma.savedSet.create({
      data: {
        userId: session.user.id,
        name,
        questions,
        resume,
        jobDescription,
        difficulty,
        industry,
      },
    });

    return NextResponse.json(savedSet);
  } catch (error) {
    console.error('Error saving question set:', error);
    return NextResponse.json({ error: 'Failed to save question set' }, { status: 500 });
  }
}

// Get user's saved sets
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const savedSets = await prisma.savedSet.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(savedSets);
  } catch (error) {
    console.error('Error fetching saved sets:', error);
    return NextResponse.json({ error: 'Failed to fetch saved sets' }, { status: 500 });
  }
}

// Delete a saved set
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();

    await prisma.savedSet.deleteMany({
      where: {
        id,
        userId: session.user.id, // Only delete if owned by user
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting saved set:', error);
    return NextResponse.json({ error: 'Failed to delete saved set' }, { status: 500 });
  }
}