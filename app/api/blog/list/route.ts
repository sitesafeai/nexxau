import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: 'published' },
      orderBy: {
        publishedAt: 'desc'
      },
      include: {
        author: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log('Fetched posts:', posts);
    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

const posts = await prisma.blogPost.findMany({
  where: { status: 'published' },
});
console.log(posts);