import dotenv from 'dotenv';
import { AppConfig } from '../types';

dotenv.config();

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value || defaultValue!;
}

function getEnvNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return parsed;
}

export const config: AppConfig = {
  port: getEnvNumber('PORT', 8080),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  corsOrigin: getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),
  
  googleMaps: {
    apiKey: getEnvVar('GOOGLE_MAPS_API_KEY'),
    placesApiKey: getEnvVar('GOOGLE_PLACES_API_KEY', getEnvVar('GOOGLE_MAPS_API_KEY')),
    defaultRadius: 5000, // 5km
    maxResults: 20
  },
  
  llm: {
    baseUrl: getEnvVar('OLLAMA_BASE_URL', 'http://localhost:11434'),
    model: getEnvVar('OLLAMA_MODEL', getEnvVar('LLM_MODEL', 'phi3:mini')),
    ...(process.env.OPENAI_API_KEY && { apiKey: process.env.OPENAI_API_KEY }),
    timeout: 30000 // 30 seconds for faster response
  },
  
  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
    max: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
    message: 'Too many requests from this IP, please try again later.'
  },
  
  logLevel: getEnvVar('LOG_LEVEL', 'info')
};

export function validateConfig(): void {
  if (!config.googleMaps.apiKey) {
    throw new Error('Google Maps API key is required. Please set GOOGLE_MAPS_API_KEY environment variable.');
  }
  
  if (config.port < 1 || config.port > 65535) {
    throw new Error('Port must be between 1 and 65535');
  }
  
  console.log('✅ Configuration validated successfully');
}