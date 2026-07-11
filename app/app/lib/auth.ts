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
    pilotEndsAt?: string | null;
    pilotEndsAtCheckedAt?: number;
    companySuspended?: boolean;
  }
}

type CompanyAccessState = {
  suspended: boolean;
  deletedAt: Date | null;
  pilotEndsAt: Date | null;
};

const companyAccessCache = new Map<string, { value: CompanyAccessState | null; expiresAt: number }>();
const COMPANY_CACHE_TTL_MS = 60_000;

async function getCompanyAccessState(companyId: string): Promise<CompanyAccessState | null> {
  const cached = companyAccessCache.get(companyId);
  const now = Date.now();
  if (cached && now < cached.expiresAt) {
    return cached.value;
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { suspended: true, deletedAt: true, pilotEndsAt: true } as any,
  });
  const normalized = company
    ? {
        suspended: Boolean((company as any).suspended),
        deletedAt: ((company as any).deletedAt ?? null) as Date | null,
        pilotEndsAt: ((company as any).pilotEndsAt ?? null) as Date | null,
      }
    : null;

  companyAccessCache.set(companyId, { value: normalized, expiresAt: now + COMPANY_CACHE_TTL_MS });
  return normalized;
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
        password: { label: "Password", type: "password" },
        impersonationToken: { label: "Impersonation", type: "text" },
      },
      async authorize(credentials) {
        const { verifyImpersonationToken } = await import('@/app/lib/impersonation-token');

        if (credentials?.impersonationToken && typeof credentials.impersonationToken === 'string') {
          const payload = verifyImpersonationToken(credentials.impersonationToken);
          if (!payload) {
            console.warn('[auth] Invalid impersonation token');
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { id: payload.sub },
          });

          if (!user || user.companyId !== payload.companyId) {
            console.warn('[auth] Impersonation target mismatch');
            return null;
          }

          const c = await getCompanyAccessState(user.companyId);
          if (!c || c.deletedAt || c.suspended) {
            console.warn('[auth] Impersonation blocked: company inactive');
            return null;
          }

          const normalizedRole = (user.role || '').toUpperCase();
          if (normalizedRole !== 'SUPER_ADMIN' && normalizedRole !== 'SUPERADMIN' && c.pilotEndsAt && new Date(c.pilotEndsAt) < new Date()) {
            return null;
          }

          console.info('[auth] Impersonation session for', user.email);

          return {
            id: user.id,
            email: user.email || '',
            name: user.name || '',
            role: user.role || 'VIEWER',
            companyId: user.companyId || undefined,
            worksiteId: user.worksiteId || undefined,
          };
        }

        if (!credentials?.email || !credentials?.password) {
          console.warn('[auth] Missing credentials');
          return null;
        }

        const emailNormalized = credentials.email.trim().toLowerCase();
        console.info('[auth] Attempting login for', emailNormalized);

        const user = await prisma.user.findFirst({
          where: {
            email: { equals: emailNormalized, mode: 'insensitive' },
          },
        });

        if (!user || !user.password) {
          console.warn('[auth] User not found or missing password', emailNormalized);
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          console.warn('[auth] Invalid password for', emailNormalized);
          // Track failed login — fire-and-forget, never crash auth
          prisma.auditLog.create({
            data: {
              userId:   user.id,
              action:   'LOGIN_FAILED',
              entity:   'USER',
              entityId: user.id,
              metadata: { entityName: user.name || user.email, severity: 'WARNING', result: 'FAILURE', details: { email: emailNormalized, reason: 'invalid_password' } },
            },
          }).catch(() => {});
          return null;
        }

        console.info('[auth] Login success for', emailNormalized);

        // Pilot enforcement (tenant-level access control)
        const normalizedRole = (user.role || '').toUpperCase();
        if (normalizedRole !== 'SUPER_ADMIN' && normalizedRole !== 'SUPERADMIN' && user.companyId) {
          const co = await getCompanyAccessState(user.companyId);
          if (co?.deletedAt || co?.suspended) {
            console.warn('[auth] Company suspended or removed', user.companyId);
            return null;
          }
          const pilotEndsAt = co?.pilotEndsAt as Date | string | null | undefined;
          if (pilotEndsAt && new Date(pilotEndsAt) < new Date()) {
            console.warn(
              '[auth] Pilot expired for company',
              user.companyId,
              'user',
              emailNormalized,
              '- set Company.pilotEndsAt to NULL or a future date to allow login'
            );
            return null;
          }
        }

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

      // Keep pilot end date reasonably fresh for middleware gating.
      const normalizedRole = (token.role || '').toUpperCase();
      if (normalizedRole !== 'SUPER_ADMIN' && normalizedRole !== 'SUPERADMIN' && token.companyId) {
        const now = Date.now();
        const lastChecked = token.pilotEndsAtCheckedAt ?? 0;
        if (!token.pilotEndsAtCheckedAt || now - lastChecked > 60 * 60 * 1000) {
          const co = await getCompanyAccessState(token.companyId);
          const pilotEndsAt = co?.pilotEndsAt;
          token.pilotEndsAt = pilotEndsAt ? new Date(pilotEndsAt).toISOString() : null;
          token.companySuspended = Boolean(co?.suspended || co?.deletedAt);
          token.pilotEndsAtCheckedAt = now;
        }
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
  events: {
    async signIn({ user }) {
      if (!user?.id) return;
      // Stamp lastLogin on User — fire-and-forget
      prisma.user.update({
        where: { id: user.id },
        data:  { lastLogin: new Date() },
      }).catch(() => {});
      // Write audit log entry
      prisma.auditLog.create({
        data: {
          userId:   user.id,
          action:   'USER_LOGIN',
          entity:   'USER',
          entityId: user.id,
          metadata: {
            entityName: user.name || user.email || null,
            severity: 'INFO',
            result: 'SUCCESS',
            details: { method: 'credentials' },
          },
        },
      }).catch(() => {});
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