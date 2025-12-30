import dotenv from 'dotenv';

// Load .env file if it exists (development)
dotenv.config();

/**
 * Configuration helper with type safety and validation
 */
export class Config {
  /**
   * Get environment variable with optional default
   */
  static get(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  /**
   * Get environment variable as number
   */
  static getNumber(key: string, defaultValue?: number): number {
    const value = this.get(key, defaultValue?.toString());
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw new Error(`Environment variable ${key} must be a number`);
    }
    return num;
  }

  /**
   * Get environment variable as boolean
   */
  static getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = this.get(key, defaultValue?.toString());
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    throw new Error(`Environment variable ${key} must be a boolean (true/false)`);
  }

  /**
   * Get environment variable or return undefined
   */
  static getOptional(key: string): string | undefined {
    return process.env[key];
  }

  /**
   * Check if we're in production
   */
  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Check if we're in development
   */
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  }

  /**
   * Check if we're in test environment
   */
  static isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  connectionTimeout?: number;
}

export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: Config.get('DB_HOST', 'localhost'),
    port: Config.getNumber('DB_PORT', 5432),
    database: Config.get('DB_NAME'),
    username: Config.get('DB_USER'),
    password: Config.get('DB_PASSWORD'),
    ssl: Config.getBoolean('DB_SSL', false),
    maxConnections: Config.getNumber('DB_MAX_CONNECTIONS', 10),
    connectionTimeout: Config.getNumber('DB_CONNECTION_TIMEOUT', 30000),
  };
}

/**
 * Redis configuration
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: boolean;
}

export function getRedisConfig(): RedisConfig {
  return {
    host: Config.get('REDIS_HOST', 'localhost'),
    port: Config.getNumber('REDIS_PORT', 6379),
    password: Config.getOptional('REDIS_PASSWORD'),
    db: Config.getNumber('REDIS_DB', 0),
    tls: Config.getBoolean('REDIS_TLS', false),
  };
}

/**
 * Service configuration
 */
export interface ServiceConfig {
  name: string;
  port: number;
  environment: string;
  version: string;
  logLevel: string;
}

export function getServiceConfig(defaultName: string): ServiceConfig {
  return {
    name: Config.get('SERVICE_NAME', defaultName),
    port: Config.getNumber('PORT', 3000),
    environment: Config.get('NODE_ENV', 'development'),
    version: Config.get('SERVICE_VERSION', '1.0.0'),
    logLevel: Config.get('LOG_LEVEL', 'info'),
  };
}
