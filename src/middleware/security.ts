import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { config } from '../config';
import { logger } from '../utils/logger';

// Rate limiting configuration
export const createRateLimit = () => {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
      error: config.rateLimit.message,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
      
      res.status(429).json({
        error: config.rateLimit.message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/health';
    }
  });
};

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      logger.info('CORS: Allowing request with no origin');
      return callback(null, true);
    }

    const allowedOrigins = [
      config.corsOrigin,
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080',
      // Add more permissive localhost variants
      'http://localhost',
      'http://127.0.0.1'
    ];

    logger.info('CORS: Checking origin', { origin, allowedOrigins });

    // More permissive for development - allow any localhost or 127.0.0.1 origin
    if (allowedOrigins.includes(origin) || 
        origin.startsWith('http://localhost') || 
        origin.startsWith('http://127.0.0.1') ||
        origin.startsWith('https://localhost') ||
        origin.startsWith('https://127.0.0.1') ||
        process.env.NODE_ENV === 'development') {
      logger.info('CORS: Allowing origin', { origin });
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'X-Forwarded-For',
    'X-Real-IP'
  ]
};

// Helmet security configuration
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "https://maps.googleapis.com", "https://maps.gstatic.com"],
      connectSrc: ["'self'", "https://maps.googleapis.com"],
      frameSrc: ["'self'", "https://www.google.com"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
};

// Compression configuration
export const compressionOptions = {
  filter: (req: any, res: any) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024 // Only compress responses larger than 1KB
};

// Request sanitization middleware
export function sanitizeRequest(req: any, res: any, next: any): void {
  // Remove potentially dangerous headers
  delete req.headers['x-forwarded-host'];
  delete req.headers['x-forwarded-server'];
  
  // Limit request size (already handled by express.json() but good to be explicit)
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > 1024 * 1024) {
    logger.warn('Request too large', {
      ip: req.ip,
      path: req.path,
      contentLength: req.headers['content-length']
    });
    
    return res.status(413).json({
      error: 'Request entity too large',
      code: 'REQUEST_TOO_LARGE'
    });
  }

  next();
}

// Security headers middleware
export function securityHeaders(req: any, res: any, next: any): void {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
}

// API key validation middleware (for future use)
export function validateApiKey(req: any, res: any, next: any): void {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    logger.warn('Missing API key', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    
    return res.status(401).json({
      error: 'API key required',
      code: 'MISSING_API_KEY'
    });
  }

  // For now, we'll skip API key validation
  // In production, you would validate against a database or environment variable
  next();
}