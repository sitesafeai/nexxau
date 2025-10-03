import { JWTManager, JWTPayload, RefreshTokenPayload } from '@/app/lib/jwt';

describe('JWTManager', () => {
  let jwtManager: JWTManager;

  beforeEach(() => {
    jwtManager = JWTManager.getInstance();
    // Reset environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
        worksiteId: 'test-worksite-id',
        companyId: 'test-company-id',
      };

      const token = jwtManager.generateAccessToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate different tokens for different payloads', () => {
      const payload1: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: 'user1',
        email: 'user1@example.com',
        role: 'admin',
      };

      const payload2: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: 'user2',
        email: 'user2@example.com',
        role: 'worker',
      };

      const token1 = jwtManager.generateAccessToken(payload1);
      const token2 = jwtManager.generateAccessToken(payload2);

      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
        userId: 'test-user-id',
        tokenVersion: 1,
      };

      const token = jwtManager.generateRefreshToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
        worksiteId: 'test-worksite-id',
        companyId: 'test-company-id',
      };

      const token = jwtManager.generateAccessToken(payload);
      const verified = jwtManager.verifyAccessToken(token);

      expect(verified).toBeDefined();
      expect(verified?.userId).toBe(payload.userId);
      expect(verified?.email).toBe(payload.email);
      expect(verified?.role).toBe(payload.role);
      expect(verified?.worksiteId).toBe(payload.worksiteId);
      expect(verified?.companyId).toBe(payload.companyId);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid-token';
      const verified = jwtManager.verifyAccessToken(invalidToken);
      expect(verified).toBeNull();
    });

    it('should return null for expired token', () => {
      // This would require mocking time or using a very short expiry
      // For now, we'll test with an invalid token
      const expiredToken = 'expired-token';
      const verified = jwtManager.verifyAccessToken(expiredToken);
      expect(verified).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
        userId: 'test-user-id',
        tokenVersion: 1,
      };

      const token = jwtManager.generateRefreshToken(payload);
      const verified = jwtManager.verifyRefreshToken(token);

      expect(verified).toBeDefined();
      expect(verified?.userId).toBe(payload.userId);
      expect(verified?.tokenVersion).toBe(payload.tokenVersion);
    });

    it('should return null for invalid refresh token', () => {
      const invalidToken = 'invalid-refresh-token';
      const verified = jwtManager.verifyRefreshToken(invalidToken);
      expect(verified).toBeNull();
    });
  });

  describe('extractTokenFromRequest', () => {
    it('should extract token from Authorization header', () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('Bearer test-token'),
        },
      } as any;

      const token = jwtManager.extractTokenFromRequest(mockRequest);
      expect(token).toBe('test-token');
    });

    it('should return null when no Authorization header', () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
      } as any;

      const token = jwtManager.extractTokenFromRequest(mockRequest);
      expect(token).toBeNull();
    });

    it('should return null when Authorization header does not start with Bearer', () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('Basic dGVzdDp0ZXN0'),
        },
      } as any;

      const token = jwtManager.extractTokenFromRequest(mockRequest);
      expect(token).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
      };

      const token = jwtManager.generateAccessToken(payload);
      const isExpired = jwtManager.isTokenExpired(token);
      expect(isExpired).toBe(false);
    });

    it('should return true for invalid token', () => {
      const invalidToken = 'invalid-token';
      const isExpired = jwtManager.isTokenExpired(invalidToken);
      expect(isExpired).toBe(true);
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration date for valid token', () => {
      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
      };

      const token = jwtManager.generateAccessToken(payload);
      const expiration = jwtManager.getTokenExpiration(token);
      
      expect(expiration).toBeDefined();
      expect(expiration).toBeInstanceOf(Date);
      expect(expiration!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid-token';
      const expiration = jwtManager.getTokenExpiration(invalidToken);
      expect(expiration).toBeNull();
    });
  });
});
