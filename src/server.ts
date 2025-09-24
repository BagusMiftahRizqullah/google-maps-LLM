import express from 'express';
import { config, validateConfig } from './config';
import { logger, logRequest } from './utils/logger';
import apiRoutes from './routes/api';

// Import middleware (we'll handle the missing dependencies gracefully)
let rateLimit: any, helmet: any, cors: any, compression: any;
let createRateLimit: any, corsOptions: any, helmetOptions: any, compressionOptions: any;
let sanitizeRequest: any, securityHeaders: any;

try {
  const rateLimitModule = require('express-rate-limit');
  rateLimit = rateLimitModule.default || rateLimitModule;
  
  const helmetModule = require('helmet');
  helmet = helmetModule.default || helmetModule;
  
  const corsModule = require('cors');
  cors = corsModule.default || corsModule;
  
  const compressionModule = require('compression');
  compression = compressionModule.default || compressionModule;
  
  // Import our security middleware
  const securityModule = require('./middleware/security');
  createRateLimit = securityModule.createRateLimit;
  corsOptions = securityModule.corsOptions;
  helmetOptions = securityModule.helmetOptions;
  compressionOptions = securityModule.compressionOptions;
  sanitizeRequest = securityModule.sanitizeRequest;
  securityHeaders = securityModule.securityHeaders;
} catch (error) {
  logger.warn('Some security middleware dependencies are missing. Running with basic security.', { error });
}

const app = express();

// Validate configuration
try {
  validateConfig();
} catch (error) {
  logger.error('Configuration validation failed', { error });
  process.exit(1);
}

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Basic middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Security middleware (if available)
if (helmet && helmetOptions) {
  app.use(helmet(helmetOptions));
}

if (cors && corsOptions) {
  app.use(cors(corsOptions));
}

if (compression && compressionOptions) {
  app.use(compression(compressionOptions));
}

if (createRateLimit) {
  app.use(createRateLimit());
}

if (sanitizeRequest) {
  app.use(sanitizeRequest);
}

if (securityHeaders) {
  app.use(securityHeaders);
}

// Logging middleware
app.use(logRequest);

// API routes
app.use('/api', apiRoutes);

// Serve static files for the web interface
app.use(express.static('public'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'LLM Maps Integration API',
    version: '1.0.0',
    description: 'Local LLM with Google Maps integration for location-based queries',
    endpoints: {
      health: '/api/health',
      search: 'POST /api/search',
      place: 'GET /api/place/:placeId',
      chat: 'POST /api/chat',
      photo: 'GET /api/photo/:photoReference'
    },
    documentation: '/docs',
    timestamp: new Date().toISOString()
  });
});

// Documentation endpoint
app.get('/docs', (req, res) => {
  res.json({
    title: 'LLM Maps Integration API Documentation',
    version: '1.0.0',
    endpoints: [
      {
        path: '/api/health',
        method: 'GET',
        description: 'Check API and service health status',
        response: {
          status: 'healthy | degraded | unhealthy',
          services: {
            googleMaps: 'healthy | unhealthy',
            llm: 'healthy | unhealthy'
          }
        }
      },
      {
        path: '/api/search',
        method: 'POST',
        description: 'Search for places using Google Maps API',
        body: {
          query: 'string (required) - Search query',
          type: 'string (optional) - Place type filter',
          location: 'object (optional) - { lat: number, lng: number }',
          radius: 'number (optional) - Search radius in meters'
        },
        response: {
          success: 'boolean',
          data: {
            places: 'array of place objects',
            map_url: 'string - Embeddable map URL',
            directions_url: 'string - Google Maps directions URL',
            center: 'object - Map center coordinates',
            zoom: 'number - Recommended zoom level'
          }
        }
      },
      {
        path: '/api/place/:placeId',
        method: 'GET',
        description: 'Get detailed information about a specific place',
        parameters: {
          placeId: 'string (required) - Google Places ID'
        },
        response: {
          success: 'boolean',
          data: 'detailed place object with photos, hours, etc.'
        }
      },
      {
        path: '/api/chat',
        method: 'POST',
        description: 'Chat with LLM for location-based queries',
        body: {
          message: 'string (required) - User message',
          context: 'object (optional) - Additional context like user location'
        },
        response: {
          success: 'boolean',
          data: {
            response: 'string - LLM response',
            extracted_location: 'string - Extracted location from query',
            extracted_type: 'string - Extracted place type',
            confidence: 'number - Confidence score (0-1)',
            map_data: 'object (optional) - Map data if location found'
          }
        }
      },
      {
        path: '/api/photo/:photoReference',
        method: 'GET',
        description: 'Get Google Places photo URL',
        parameters: {
          photoReference: 'string (required) - Photo reference from Places API',
          maxWidth: 'number (optional) - Maximum photo width'
        },
        response: {
          success: 'boolean',
          data: {
            photo_url: 'string - Direct photo URL',
            max_width: 'number - Actual max width used'
          }
        }
      }
    ],
    examples: {
      search: {
        url: 'POST /api/search',
        body: {
          query: 'Italian restaurants in Rome',
          type: 'restaurant',
          radius: 5000
        }
      },
      chat: {
        url: 'POST /api/chat',
        body: {
          message: 'Find me good coffee shops near the Colosseum',
          context: {
            location: { lat: 41.8902, lng: 12.4922 }
          }
        }
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error: Error, req: any, res: any, next: any) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const server = app.listen(config.port, () => {
  logger.info('Server started successfully', {
    port: config.port,
    nodeEnv: config.nodeEnv,
    timestamp: new Date().toISOString()
  });
  
  logger.info('API endpoints available:', {
    health: `http://localhost:${config.port}/api/health`,
    docs: `http://localhost:${config.port}/docs`,
    search: `http://localhost:${config.port}/api/search`,
    chat: `http://localhost:${config.port}/api/chat`
  });
});

export default app;