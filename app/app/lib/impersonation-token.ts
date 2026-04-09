import jwt from 'jsonwebtoken';

export type ImpersonationPayload = {
  sub: string;
  companyId: string;
  adminId: string;
  typ: 'impersonate';
};

export function signImpersonationToken(payload: {
  targetUserId: string;
  companyId: string;
  adminId: string;
}): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set');

  return jwt.sign(
    {
      sub: payload.targetUserId,
      companyId: payload.companyId,
      adminId: payload.adminId,
      typ: 'impersonate',
    },
    secret,
    { expiresIn: '10m', algorithm: 'HS256' }
  );
}

export function verifyImpersonationToken(token: string): ImpersonationPayload | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  try {
    const decoded = jwt.verify(token, secret) as ImpersonationPayload;
    if (decoded.typ !== 'impersonate' || !decoded.sub || !decoded.companyId) return null;
    return decoded;
  } catch {
    return null;
  }
}
