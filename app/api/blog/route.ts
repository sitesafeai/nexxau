import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    console.log('Fetching session...');
    const session = await getServerSession(authOptions);
    console.log('Session:', session);
    
    if (!session?.user) {
      console.log('No session or user found');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('Fetching posts...');
    const posts = await prisma.blogPost.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        category: true,
        description: true,
        featuredImage: true,
        tags: true,
        author: {
          select: {
            name: true
          }
        }
      },
    });
    console.log('Posts found:', posts.length);

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 