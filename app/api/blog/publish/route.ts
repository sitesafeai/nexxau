import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { id, title, description, content, featuredImage, category } = body;

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        title,
        description,
        content,
        featuredImage,
        category,
        status: 'published',
        publishedAt: new Date(),
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error publishing post:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 