/**
 * Token Utilities
 * Handles secure token generation and validation for user invitations
 */

import crypto from 'crypto';

const TOKEN_EXPIRY_HOURS = 24; // 24 hours expiry
const TOKEN_BYTES = 32; // 256-bit tokens

/**
 * Generate a secure, random token for user invitations
 * Returns a URL-safe base64 encoded token
 */
export function generateInviteToken(): string {
  const randomBytes = crypto.randomBytes(TOKEN_BYTES);
  return randomBytes.toString('base64url'); // base64url is URL-safe
}

/**
 * Calculate token expiration date
 * Default: 24 hours from now
 */
export function getTokenExpiry(hours: number = TOKEN_EXPIRY_HOURS): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(expiryDate: Date | null | undefined): boolean {
  if (!expiryDate) return true;
  return new Date() > new Date(expiryDate);
}

/**
 * Validate token format (basic check)
 */
export function isValidTokenFormat(token: string): boolean {
  // Token should be base64url encoded, at least 32 characters
  return token && token.length >= 32 && /^[A-Za-z0-9_-]+$/.test(token);
}

