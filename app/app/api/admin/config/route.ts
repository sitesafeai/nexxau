import { NextRequest, NextResponse } from 'next/server';

// Mock configuration - in production this would be stored in database
let systemConfig = {
  general: {
    siteName: 'Nexxau Safety System',
    timezone: 'UTC',
    language: 'en',
    maintenanceMode: false
  },
  security: {
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: true
    },
    twoFactorAuth: true
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    webhookEnabled: true,
    defaultRecipients: ['admin@nexxau.com']
  },
  ai: {
    detectionEnabled: true,
    confidenceThreshold: 75,
    alertThreshold: 85,
    modelVersion: 'v1.0.0'
  },
  storage: {
    maxFileSize: 100, // MB
    retentionPeriod: 90, // days
    backupFrequency: 'daily'
  }
};

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(systemConfig);
  } catch (error) {
    console.error('Failed to fetch system config:', error);
    return NextResponse.json({ error: 'Failed to fetch system config' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Update configuration
    systemConfig = {
      ...systemConfig,
      ...body
    };

    // In production, you would save this to a database
    console.log('System configuration updated:', systemConfig);

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      config: systemConfig
    });

  } catch (error) {
    console.error('Failed to update system config:', error);
    return NextResponse.json({ error: 'Failed to update system config' }, { status: 500 });
  }
}
