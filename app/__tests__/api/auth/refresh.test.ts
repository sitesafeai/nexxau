import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/refresh/route';
import { jwtManager } from '@/app/lib/jwt';
import { prisma } from '@/app/lib/prisma';

// Mock dependencies
jest.mock('@/app/lib/jwt');
jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('/api/auth/refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        worksiteId: 'test-worksite-id',
        companyId: 'test-company-id',
        isActivated: true,
        approved: true,
      };

      const mockPayload = {
        userId: 'test-user-id',
        tokenVersion: 1,
      };

      const mockAccessToken = 'new-access-token';
      const mockRefreshToken = 'new-refresh-token';

      // Mock JWT verification
      (jwtManager.verifyRefreshToken as jest.Mock).mockReturnValue(mockPayload);
      (jwtManager.generateAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (jwtManager.generateRefreshToken as jest.Mock).mockReturnValue(mockRefreshToken);

      // Mock database
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'valid-refresh-token' }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.accessToken).toBe(mockAccessToken);
      expect(data.refreshToken).toBe(mockRefreshToken);
      expect(data.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        worksiteId: mockUser.worksiteId,
        companyId: mockUser.companyId,
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          worksiteId: true,
          companyId: true,
          isActivated: true,
          approved: true,
        },
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        data: { updatedAt: expect.any(Date) },
      });
    });

    it('should return 400 when refresh token is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Refresh token required');
    });

    it('should return 401 when refresh token is invalid', async () => {
      (jwtManager.verifyRefreshToken as jest.Mock).mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'invalid-refresh-token' }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid refresh token');
    });

    it('should return 404 when user is not found', async () => {
      const mockPayload = {
        userId: 'non-existent-user',
        tokenVersion: 1,
      };

      (jwtManager.verifyRefreshToken as jest.Mock).mockReturnValue(mockPayload);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'valid-refresh-token' }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 403 when user is not activated', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        worksiteId: 'test-worksite-id',
        companyId: 'test-company-id',
        isActivated: false, // Not activated
        approved: true,
      };

      const mockPayload = {
        userId: 'test-user-id',
        tokenVersion: 1,
      };

      (jwtManager.verifyRefreshToken as jest.Mock).mockReturnValue(mockPayload);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'valid-refresh-token' }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Account not activated or approved');
    });

    it('should return 403 when user is not approved', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        worksiteId: 'test-worksite-id',
        companyId: 'test-company-id',
        isActivated: true,
        approved: false, // Not approved
      };

      const mockPayload = {
        userId: 'test-user-id',
        tokenVersion: 1,
      };

      (jwtManager.verifyRefreshToken as jest.Mock).mockReturnValue(mockPayload);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'valid-refresh-token' }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Account not activated or approved');
    });

    it('should handle database errors gracefully', async () => {
      const mockPayload = {
        userId: 'test-user-id',
        tokenVersion: 1,
      };

      (jwtManager.verifyRefreshToken as jest.Mock).mockReturnValue(mockPayload);
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'valid-refresh-token' }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should set secure cookies', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        worksiteId: 'test-worksite-id',
        companyId: 'test-company-id',
        isActivated: true,
        approved: true,
      };

      const mockPayload = {
        userId: 'test-user-id',
        tokenVersion: 1,
      };

      const mockAccessToken = 'new-access-token';
      const mockRefreshToken = 'new-refresh-token';

      (jwtManager.verifyRefreshToken as jest.Mock).mockReturnValue(mockPayload);
      (jwtManager.generateAccessToken as jest.Mock).mockReturnValue(mockAccessToken);
      (jwtManager.generateRefreshToken as jest.Mock).mockReturnValue(mockRefreshToken);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'valid-refresh-token' }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      
      // Check that cookies are set
      const cookies = response.headers.get('set-cookie');
      expect(cookies).toContain('accessToken');
      expect(cookies).toContain('refreshToken');
      expect(cookies).toContain('HttpOnly');
      expect(cookies).toContain('SameSite=Strict');
    });
  });
});
