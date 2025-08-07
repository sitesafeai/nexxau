import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { title, description, content, featuredImage, category, tags, status } = body;

    if (!title || !description || !content) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Create slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug already exists
    const existingPost = await prisma.blogPost.findUnique({
      where: { slug },
    });

    if (existingPost) {
      return new NextResponse("A post with this title already exists", { status: 400 });
    }

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        description,
        content,
        featuredImage,
        category,
        tags: Array.isArray(tags) ? tags : tags.split(',').map((tag: string) => tag.trim()),
        status,
        authorId: session.user.id,
        publishedAt: status === "published" ? new Date() : null,
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error creating post:", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Internal Server Error",
      { status: 500 }
    );
  }
}
