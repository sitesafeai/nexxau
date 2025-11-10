import { NextAuthOptions } from "next-auth";
// import { PrismaAdapter } from "@auth/prisma-adapter";
// import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth/next";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      companyId?: string;
      worksiteId?: string;
    };
  }
  
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    companyId?: string;
    worksiteId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    companyId?: string;
    worksiteId?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Temporarily disabled Google provider to fix crashes
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.warn('[auth] Missing credentials');
          return null;
        }

        console.info('[auth] Attempting login for', credentials.email);

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        });

        if (!user || !user.password) {
          console.warn('[auth] User not found or missing password', credentials.email);
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          console.warn('[auth] Invalid password for', credentials.email);
          return null;
        }

        console.info('[auth] Login success for', credentials.email);

        return {
          id: user.id,
          email: user.email || "",
          name: user.name || "",
          role: user.role || "VIEWER",
          companyId: user.companyId || undefined,
          worksiteId: user.worksiteId || undefined,
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.companyId = user.companyId;
        token.worksiteId = user.worksiteId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
        session.user.worksiteId = token.worksiteId;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // If it's a callback URL, use it
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      // Redirect to auth-redirect page which will handle role-based routing
      return `${baseUrl}/auth-redirect`;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
} 