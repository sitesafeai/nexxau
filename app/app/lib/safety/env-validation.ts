/**
 * Production Environment Validation
 * 
 * Validates all required environment variables are set before startup.
 * Fails loudly if critical variables are missing.
 */

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
  errors: string[];
}

export interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
  warning?: string;
}

const REQUIRED_ENV_VARS: EnvVar[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL database connection string',
    validator: (v) => v.startsWith('postgresql://'),
  },
  {
    name: 'NEXTAUTH_SECRET',
    required: true,
    description: 'NextAuth.js secret key (min 32 characters)',
    validator: (v) => v.length >= 32,
  },
  {
    name: 'NEXTAUTH_URL',
    required: true,
    description: 'Base URL of the application',
    validator: (v) => v.startsWith('http://') || v.startsWith('https://'),
  },
];

const OPTIONAL_ENV_VARS: EnvVar[] = [
  {
    name: 'TWILIO_ACCOUNT_SID',
    required: false,
    description: 'Twilio account SID for SMS notifications',
    warning: 'SMS notifications will be disabled',
  },
  {
    name: 'TWILIO_AUTH_TOKEN',
    required: false,
    description: 'Twilio auth token',
    warning: 'SMS notifications will be disabled',
  },
  {
    name: 'TWILIO_FROM_NUMBER',
    required: false,
    description: 'Twilio phone number or Messaging Service SID',
    warning: 'SMS notifications will be disabled',
  },
  {
    name: 'AI_DETECTION_SERVICE_URL',
    required: false,
    description: 'AI detection service endpoint URL',
    warning: 'AI detection will not work without this',
  },
  {
    name: 'SENTRY_DSN',
    required: false,
    description: 'Sentry DSN for error tracking',
    warning: 'Error tracking will be limited',
  },
  {
    name: 'CLOUDINARY_CLOUD_NAME',
    required: false,
    description: 'Cloudinary cloud name for media storage',
    warning: 'Media uploads may not work',
  },
];

export class EnvValidator {
  /**
   * Validate all environment variables
   */
  public static validate(): EnvValidationResult {
    const missing: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check required variables
    for (const envVar of REQUIRED_ENV_VARS) {
      const value = process.env[envVar.name];
      
      if (!value || value.trim().length === 0) {
        missing.push(envVar.name);
        errors.push(`${envVar.name} is required: ${envVar.description}`);
        continue;
      }

      // Run validator if provided
      if (envVar.validator && !envVar.validator(value)) {
        errors.push(`${envVar.name} has invalid format: ${envVar.description}`);
      }
    }

    // Check optional variables
    for (const envVar of OPTIONAL_ENV_VARS) {
      const value = process.env[envVar.name];
      
      if (!value || value.trim().length === 0) {
        if (envVar.warning) {
          warnings.push(`${envVar.name}: ${envVar.warning}`);
        }
      } else if (envVar.validator && !envVar.validator(value)) {
        warnings.push(`${envVar.name} has invalid format: ${envVar.description}`);
      }
    }

    // Check for common misconfigurations
    this.checkCommonIssues(errors, warnings);

    return {
      valid: errors.length === 0,
      missing,
      warnings,
      errors,
    };
  }

  /**
   * Check for common configuration issues
   */
  private static checkCommonIssues(errors: string[], warnings: string[]): void {
    // Check if using development secrets in production
    if (process.env.NODE_ENV === 'production') {
      const nextAuthSecret = process.env.NEXTAUTH_SECRET;
      if (nextAuthSecret && (
        nextAuthSecret.includes('development') ||
        nextAuthSecret.includes('dev') ||
        nextAuthSecret.length < 32
      )) {
        errors.push('NEXTAUTH_SECRET appears to be a development secret. Generate a new one for production.');
      }

      // Check for localhost URLs in production
      const nextAuthUrl = process.env.NEXTAUTH_URL;
      if (nextAuthUrl && nextAuthUrl.includes('localhost')) {
        errors.push('NEXTAUTH_URL should not point to localhost in production');
      }

      const dbUrl = process.env.DATABASE_URL;
      if (dbUrl && dbUrl.includes('localhost')) {
        warnings.push('DATABASE_URL points to localhost - ensure this is correct for production');
      }
    }

    // Check Twilio configuration completeness
    const hasTwilioSid = !!process.env.TWILIO_ACCOUNT_SID;
    const hasTwilioToken = !!process.env.TWILIO_AUTH_TOKEN;
    const hasTwilioNumber = !!process.env.TWILIO_FROM_NUMBER || !!process.env.TWILIO_MESSAGING_SERVICE_SID;

    if ((hasTwilioSid || hasTwilioToken || hasTwilioNumber) && 
        !(hasTwilioSid && hasTwilioToken && hasTwilioNumber)) {
      warnings.push('Twilio configuration is incomplete - SMS notifications will not work');
    }

    // Check database connection string format
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && !dbUrl.includes('sslmode=require') && process.env.NODE_ENV === 'production') {
      warnings.push('DATABASE_URL should use SSL in production (sslmode=require)');
    }
  }

  /**
   * Validate and throw if invalid (for startup)
   */
  public static validateOrThrow(): void {
    const result = this.validate();

    if (!result.valid) {
      console.error('❌ Environment validation failed:');
      console.error('Missing required variables:');
      result.missing.forEach(v => console.error(`  - ${v}`));
      console.error('Errors:');
      result.errors.forEach(e => console.error(`  - ${e}`));
      
      throw new Error('Environment validation failed. Please set all required environment variables.');
    }

    if (result.warnings.length > 0) {
      console.warn('⚠️ Environment validation warnings:');
      result.warnings.forEach(w => console.warn(`  - ${w}`));
    }

    console.log('✅ Environment validation passed');
  }

  /**
   * Get validation report as string
   */
  public static getReport(): string {
    const result = this.validate();
    
    const lines: string[] = [];
    lines.push('Environment Validation Report');
    lines.push('='.repeat(50));
    
    if (result.valid) {
      lines.push('✅ Status: VALID');
    } else {
      lines.push('❌ Status: INVALID');
    }
    
    if (result.missing.length > 0) {
      lines.push('\nMissing Required Variables:');
      result.missing.forEach(v => lines.push(`  - ${v}`));
    }
    
    if (result.errors.length > 0) {
      lines.push('\nErrors:');
      result.errors.forEach(e => lines.push(`  - ${e}`));
    }
    
    if (result.warnings.length > 0) {
      lines.push('\nWarnings:');
      result.warnings.forEach(w => lines.push(`  - ${w}`));
    }
    
    return lines.join('\n');
  }
}

// Auto-validate on module load (server-side only)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  try {
    EnvValidator.validateOrThrow();
  } catch (error) {
    // Log but don't crash - allow app to start and show errors in UI
    console.error('Environment validation failed on startup:', error);
  }
}

