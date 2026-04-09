import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { sendResendHtml, getResendFromAddress } from './resend-mail';

export interface MFASetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface MFAMethod {
  id: string;
  type: 'totp' | 'sms' | 'email';
  name: string;
  isEnabled: boolean;
  createdAt: Date;
}

export class MFAManager {
  private static instance: MFAManager;

  private constructor() {}

  public static getInstance(): MFAManager {
    if (!MFAManager.instance) {
      MFAManager.instance = new MFAManager();
    }
    return MFAManager.instance;
  }

  // Setup TOTP (Time-based One-Time Password)
  public async setupTOTP(userId: string, userEmail: string): Promise<MFASetup> {
    const secret = speakeasy.generateSecret({
      name: `Nexxau (${userEmail})`,
      issuer: 'Nexxau',
      length: 32
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Store MFA setup in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: secret.base32,
        mfaBackupCodes: backupCodes,
        mfaEnabled: false // Will be enabled after verification
      }
    });

    return {
      secret: secret.base32,
      qrCode,
      backupCodes
    };
  }

  // Verify TOTP code
  public async verifyTOTP(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnabled: true }
    });

    if (!user || !user.mfaSecret) {
      return false;
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps (60 seconds) of tolerance
    });

    return verified;
  }

  // Enable MFA after verification
  public async enableMFA(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true }
    });
  }

  // Disable MFA
  public async disableMFA(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null
      }
    });
  }

  // Send SMS code
  public async sendSMSCode(userId: string, phoneNumber: string): Promise<string> {
    const code = this.generateSMSCode();
    
    // Store code in database with expiration
    await prisma.mfaCode.create({
      data: {
        userId,
        code,
        type: 'sms',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        phoneNumber
      }
    });

    // In production, integrate with SMS service like Twilio
    console.log(`SMS code for ${phoneNumber}: ${code}`);
    
    return code;
  }

  // Send email code
  public async sendEmailCode(userId: string, email: string): Promise<string> {
    const code = this.generateEmailCode();
    
    // Store code in database with expiration
    await prisma.mfaCode.create({
      data: {
        userId,
        code,
        type: 'email',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        email
      }
    });

    const sendResult = await sendResendHtml({
      from: getResendFromAddress(),
      to: email,
      subject: 'Nexxau - Verification Code',
      html: `
        <h2>Verification Code</h2>
        <p>Your verification code is: <strong>${code}</strong></p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      `,
    });
    if (!sendResult.success) {
      throw new Error(sendResult.error || 'Failed to send verification email');
    }

    return code;
  }

  // Verify MFA code
  public async verifyMFACode(userId: string, code: string, type: 'totp' | 'sms' | 'email'): Promise<boolean> {
    if (type === 'totp') {
      return await this.verifyTOTP(userId, code);
    }

    // Verify SMS or email code
    const mfaCode = await prisma.mfaCode.findFirst({
      where: {
        userId,
        code,
        type,
        expiresAt: { gt: new Date() },
        used: false
      }
    });

    if (!mfaCode) {
      return false;
    }

    // Mark code as used
    await prisma.mfaCode.update({
      where: { id: mfaCode.id },
      data: { used: true, usedAt: new Date() }
    });

    return true;
  }

  // Verify backup code
  public async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaBackupCodes: true }
    });

    if (!user || !user.mfaBackupCodes) {
      return false;
    }

    const backupCodes = user.mfaBackupCodes as string[];
    const index = backupCodes.indexOf(code);

    if (index === -1) {
      return false;
    }

    // Remove used backup code
    backupCodes.splice(index, 1);
    await prisma.user.update({
      where: { id: userId },
      data: { mfaBackupCodes: backupCodes }
    });

    return true;
  }

  // Get user MFA methods
  public async getUserMFAMethods(userId: string): Promise<MFAMethod[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        phoneNumber: true,
        email: true
      }
    });

    if (!user) return [];

    const methods: MFAMethod[] = [];

    if (user.mfaEnabled) {
      methods.push({
        id: 'totp',
        type: 'totp',
        name: 'Authenticator App',
        isEnabled: true,
        createdAt: new Date()
      });
    }

    if (user.phoneNumber) {
      methods.push({
        id: 'sms',
        type: 'sms',
        name: 'SMS',
        isEnabled: true,
        createdAt: new Date()
      });
    }

    if (user.email) {
      methods.push({
        id: 'email',
        type: 'email',
        name: 'Email',
        isEnabled: true,
        createdAt: new Date()
      });
    }

    return methods;
  }

  // Generate backup codes
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
    }
    return codes;
  }

  // Generate SMS code
  private generateSMSCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate email code
  private generateEmailCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

// Export singleton instance
export const mfaManager = MFAManager.getInstance();
