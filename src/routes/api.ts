import { Router, Request, Response } from 'express';
import { googleMapsService } from '../services/googleMaps';
import { llmService } from '../services/llm';
import { logger } from '../utils/logger';
import { validateRequest, validateParams, locationQuerySchema, placeIdSchema, chatQuerySchema } from '../middleware/validation';
import { LocationQuery, LLMResponse, MapResponse, PlaceResult, APIError } from '../types';
import { config } from '../config';

const router = Router();

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    const [mapsHealthy, llmHealthy] = await Promise.all([
      googleMapsService.healthCheck(),
      llmService.healthCheck()
    ]);

    const status = mapsHealthy && llmHealthy ? 'healthy' : 'degraded';
    const statusCode = status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      services: {
        googleMaps: mapsHealthy ? 'healthy' : 'unhealthy',
        llm: llmHealthy ? 'healthy' : 'unhealthy'
      }
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Config endpoint for frontend
router.get('/config', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        googleMapsApiKey: config.googleMaps.apiKey
      }
    });
  } catch (error) {
    logger.error('Config endpoint failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration'
    });
  }
});

// Search places endpoint
router.post('/search', validateRequest(locationQuerySchema), async (req: Request, res: Response) => {
  try {
    const query: LocationQuery = req.body;
    
    logger.info('Processing place search request', { query: query.query, type: query.type });

    const result: MapResponse = await googleMapsService.searchPlacesForMap(query);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Place search failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      query: req.body 
    });

    const apiError: APIError = {
      error: error instanceof Error ? error.message : 'Failed to search places',
      code: 'SEARCH_FAILED',
      ...(error instanceof Error && error.stack && { details: error.stack })
    };

    res.status(500).json({
      success: false,
      ...apiError,
      timestamp: new Date().toISOString()
    });
  }
});

// Get place details endpoint
router.get('/place/:placeId', validateParams(placeIdSchema), async (req: Request, res: Response) => {
  const { placeId } = req.params;
  
  if (!placeId) {
    return res.status(400).json({
      success: false,
      error: 'Place ID is required',
      code: 'MISSING_PLACE_ID'
    });
  }
  
  logger.info('Processing place details request', { placeId });

  try {
    const result: PlaceResult = await googleMapsService.getPlaceDetails(placeId);

    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Place details request failed', { error, placeId });
    
    const apiError: APIError = {
      error: 'Failed to get place details',
      code: 'PLACE_DETAILS_ERROR'
    };

    if (error instanceof Error && error.stack) {
      apiError.details = error.stack;
    }

    return res.status(500).json({
      success: false,
      ...apiError,
      timestamp: new Date().toISOString()
    });
  }
});

// Chat with LLM endpoint
router.post('/chat', validateRequest(chatQuerySchema), async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body;
    
    logger.info('Processing chat request', { message: message.substring(0, 100) });

    // Process the message with LLM
    const llmResponse: LLMResponse = await llmService.processLocationQuery(message);

    // If LLM extracted location information, search for places
    if (llmResponse.extracted_location && llmResponse.confidence > 0.5) {
      try {
        const locationQuery = await llmService.generateLocationQuery(llmResponse);
        
        if (locationQuery) {
          // Override with user's current location if provided in context
          if (context?.location) {
            locationQuery.location = context.location;
          }

          const mapData = await googleMapsService.searchPlacesForMap(locationQuery);
          llmResponse.map_data = mapData;
        }
      } catch (mapError) {
        logger.warn('Failed to get map data for chat response', { 
          error: mapError instanceof Error ? mapError.message : 'Unknown error',
          extractedLocation: llmResponse.extracted_location 
        });
        // Continue without map data
      }
    }

    res.json({
      success: true,
      data: llmResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Chat processing failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      message: req.body.message 
    });

    const apiError: APIError = {
      error: error instanceof Error ? error.message : 'Failed to process chat message',
      code: 'CHAT_FAILED',
      ...(error instanceof Error && error.stack && { details: error.stack })
    };

    res.status(500).json({
      success: false,
      ...apiError,
      timestamp: new Date().toISOString()
    });
  }
});

// Get photo URL endpoint
router.get('/photo/:photoReference', (req: Request, res: Response) => {
  const { photoReference } = req.params;
  
  if (!photoReference) {
    return res.status(400).json({
      success: false,
      error: 'Photo reference is required',
      code: 'MISSING_PHOTO_REFERENCE'
    });
  }
  
  try {
    const photoUrl = googleMapsService.getPhotoUrl(photoReference, 400);
    return res.json({
      success: true,
      data: { photoUrl }
    });
  } catch (error) {
    logger.error('Error generating photo URL', { error, photoReference });
    return res.status(500).json({
      success: false,
      error: 'Failed to generate photo URL',
      code: 'PHOTO_URL_ERROR'
    });
  }
});

// Error handling middleware for this router
router.use((error: Error, req: Request, res: Response, next: any) => {
  logger.error('API route error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

export default router;