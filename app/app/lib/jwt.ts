import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  worksiteId?: string;
  companyId?: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export class JWTManager {
  private static instance: JWTManager;
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  private constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || 'fallback-secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  public static getInstance(): JWTManager {
    if (!JWTManager.instance) {
      JWTManager.instance = new JWTManager();
    }
    return JWTManager.instance;
  }

  // Generate access token
  public generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'nexxau',
      audience: 'nexxau-users'
    });
  }

  // Generate refresh token
  public generateRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'nexxau',
      audience: 'nexxau-refresh'
    });
  }

  // Verify access token
  public verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'nexxau',
        audience: 'nexxau-users'
      }) as JWTPayload;
      return decoded;
    } catch (error) {
      console.error('Access token verification failed:', error);
      return null;
    }
  }

  // Verify refresh token
  public verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'nexxau',
        audience: 'nexxau-refresh'
      }) as RefreshTokenPayload;
      return decoded;
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return null;
    }
  }

  // Extract token from request
  public extractTokenFromRequest(request: NextRequest): string | null {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  // Check if token is expired
  public isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return true;
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }

  // Get token expiration time
  public getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return null;
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const jwtManager = JWTManager.getInstance();
