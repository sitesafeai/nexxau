import { NextResponse } from "next/server";
import { prisma } from '@/app/lib/prisma';
import bcrypt from "bcryptjs";
import crypto from 'crypto';
import { z } from 'zod';
import { withRateLimit } from '@/lib/rate-limit';

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  company: z.string().optional(),
});

export const runtime = 'edge';

async function signupHandler(req: Request) {
  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const result = signupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Validation failed", details: result.error.errors }, { status: 400 });
    }

    const { name, email, password, company } = result.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        company,
        approved: true, // TODO: Set back to false when email verification is implemented
        role: "user",
        verificationToken,
      },
    });

    return NextResponse.json({ message: "User created successfully" }, { status: 201 });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: "An unexpected error occurred", details: err.message }, { status: 500 });
  }
}

// Apply rate limiting to the signup handler
// Allow 5 requests per minute per IP
export const POST = withRateLimit(signupHandler, 5, 60_000); 