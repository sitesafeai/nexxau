import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import { jwtManager, JWTPayload } from './jwt';

export interface SessionInfo {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  location?: string;
}

export class SessionManager {
  private static instance: SessionManager;
  private activeSessions: Map<string, SessionInfo> = new Map();

  private constructor() {
    // Clean up expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // Create new session
  public async createSession(
    userId: string,
    request: NextRequest,
    location?: string
  ): Promise<SessionInfo> {
    const sessionId = this.generateSessionId();
    const ipAddress = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const session: SessionInfo = {
      id: sessionId,
      userId,
      ipAddress,
      userAgent,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      location
    };

    // Store in memory
    this.activeSessions.set(sessionId, session);

    // Store in database
    await this.storeSessionInDB(session);

    return session;
  }

  // Get session by ID
  public getSession(sessionId: string): SessionInfo | null {
    return this.activeSessions.get(sessionId) || null;
  }

  // Update session activity
  public async updateSessionActivity(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      this.activeSessions.set(sessionId, session);
      
      // Update in database
      await this.updateSessionInDB(sessionId, { lastActivity: new Date() });
    }
  }

  // Invalidate session
  public async invalidateSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.activeSessions.set(sessionId, session);
      
      // Update in database
      await this.updateSessionInDB(sessionId, { isActive: false });
    }
  }

  // Invalidate all user sessions
  public async invalidateUserSessions(userId: string): Promise<void> {
    const userSessions = Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId);

    for (const session of userSessions) {
      await this.invalidateSession(session.id);
    }
  }

  // Get user sessions
  public getUserSessions(userId: string): SessionInfo[] {
    return Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId && session.isActive);
  }

  // Check if session is valid
  public isSessionValid(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isActive) return false;

    // Check if session is expired (24 hours)
    const now = new Date();
    const sessionAge = now.getTime() - session.lastActivity.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    return sessionAge < maxAge;
  }

  // Get session from request
  public getSessionFromRequest(request: NextRequest): SessionInfo | null {
    const sessionId = request.cookies.get('sessionId')?.value;
    if (!sessionId) return null;

    return this.getSession(sessionId);
  }

  // Extract user from session
  public async getUserFromSession(request: NextRequest): Promise<JWTPayload | null> {
    const session = this.getSessionFromRequest(request);
    if (!session || !this.isSessionValid(session.id)) {
      return null;
    }

    // Update session activity
    await this.updateSessionActivity(session.id);

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        worksiteId: true,
        companyId: true
      }
    });

    if (!user) return null;

    return {
      userId: user.id,
      email: user.email || '',
      role: user.role,
      worksiteId: user.worksiteId || undefined,
      companyId: user.companyId || undefined
    };
  }

  // Cleanup expired sessions
  private async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const sessionAge = now.getTime() - session.lastActivity.getTime();
      if (sessionAge > maxAge) {
        await this.invalidateSession(sessionId);
        this.activeSessions.delete(sessionId);
      }
    }
  }

  // Generate session ID
  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Get client IP
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const ip = forwarded ? forwarded.split(',')[0] : realIP || request.ip || 'unknown';
    return ip;
  }

  // Store session in database
  private async storeSessionInDB(session: SessionInfo): Promise<void> {
    try {
      await prisma.session.create({
        data: {
          id: session.id,
          sessionToken: session.id,
          userId: session.userId,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          location: session.location
        }
      });
    } catch (error) {
      console.error('Failed to store session in database:', error);
    }
  }

  // Update session in database
  private async updateSessionInDB(sessionId: string, data: any): Promise<void> {
    try {
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to update session in database:', error);
    }
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();
