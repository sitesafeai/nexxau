import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from 'crypto';
import { z } from 'zod';
import { withRateLimit } from '@/src/lib/rate-limit';

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
  company: z.string().optional(),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, "Invalid phone number format"),
});

// Remove edge runtime
// export const runtime = 'edge';

const signupHandler = async (req: Request) => {
  try {
    console.log("Starting signup process...");
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    
    console.log("Received request body:", { ...body, password: '[REDACTED]' });
    
    // Validate input
    const result = signupSchema.safeParse(body);
    if (!result.success) {
      console.log("Validation failed:", result.error.errors);
      return NextResponse.json(
        { error: "Validation failed", details: result.error.errors },
        { status: 400 }
      );
    }

    const { name, email, password, company, phoneNumber } = result.data;
    console.log("Validated data:", { name, email, company, phoneNumber, password: '[REDACTED]' });

    // Check for existing user
    console.log("Checking for existing user...");
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log("User already exists:", email);
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
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
        phoneNumber,
        approved: false,
        role: "user",
        verificationToken,
      },
    });
    console.log("User created successfully:", { 
      id: user.id, 
      email: user.email,
      name: user.name,
      role: user.role,
      approved: user.approved,
      phoneNumber: user.phoneNumber,
      company: user.company
    });

    // Verify the user was created
    const verifyUser = await prisma.user.findUnique({
      where: { email }
    });
    console.log("Verification - User in database:", verifyUser ? {
      id: verifyUser.id,
      email: verifyUser.email,
      name: verifyUser.name,
      role: verifyUser.role,
      approved: verifyUser.approved,
      phoneNumber: verifyUser.phoneNumber,
      company: verifyUser.company
    } : "User not found");

    // TODO: Send verification email with verificationToken
    return NextResponse.json(
      { message: "User created successfully" },
      { status: 201 }
    );
  } catch (error) {
    const err = error as Error;
    console.error("Detailed signup error:", {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
    
    return NextResponse.json(
      { error: "An unexpected error occurred", details: err.message },
      { status: 500 }
    );
  }
};

export const POST = withRateLimit<SignupResponse>(signupHandler, 'signup', { limit: 5, window: 60 });
