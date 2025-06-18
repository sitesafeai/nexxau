import { NextResponse } from "next/server";
import { prisma } from '@/app/lib/prisma';
import bcrypt from "bcryptjs";
import crypto from 'crypto';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  company: z.string().optional(),
});

export const runtime = 'edge';

async function signupHandler(req: Request) {
  try {
    console.log("Starting signup process...");
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new NextResponse(
        JSON.stringify({ error: "Invalid request body" }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log("Received request body:", { ...body, password: '[REDACTED]' });
    
    // Validate input
    const result = signupSchema.safeParse(body);
    if (!result.success) {
      console.log("Validation failed:", result.error.errors);
      return new NextResponse(
        JSON.stringify({ error: "Validation failed", details: result.error.errors }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { name, email, password, company } = result.data;
    console.log("Validated data:", { name, email, company, password: '[REDACTED]' });

    // Check for existing user
    console.log("Checking for existing user...");
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log("User already exists:", email);
      return new NextResponse(
        JSON.stringify({ error: "User already exists" }),
        { 
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Hash password and create user
    console.log("Hashing password...");
    const hashed = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    console.log("Creating user in database...");
    const user = await prisma.user.create({
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
    console.log("User created successfully:", { id: user.id, email: user.email });

    // TODO: Send verification email with verificationToken
    return new NextResponse(
      JSON.stringify({ message: "User created successfully" }),
      { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    const err = error as Error;
    console.error("Detailed signup error:", {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
    
    return new NextResponse(
      JSON.stringify({ error: "An unexpected error occurred", details: err.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Apply rate limiting to the signup handler
// Allow 5 requests per minute per IP
export const POST = rateLimit(signupHandler, 5, 60_000); 