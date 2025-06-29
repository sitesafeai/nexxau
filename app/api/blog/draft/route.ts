import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import slugify from 'slugify';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { title, description, content, featuredImage, category } = body;

    const slug = slugify(title, { lower: true, strict: true });

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        description,
        content,
        featuredImage,
        category,
        status: 'draft',
        authorId: session.user.id,
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error creating draft:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(req: Request) {
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
        status: 'draft',
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error updating draft:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 