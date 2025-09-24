import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ValidationError {
  field: string;
  message: string;
}

export const locationQuerySchema = Joi.object({
  query: Joi.string()
    .min(1)
    .max(200)
    .pattern(/^[a-zA-Z0-9\s\-.,!?']+$/)
    .required()
    .messages({
      'string.empty': 'Query cannot be empty',
      'string.min': 'Query must be at least 1 character long',
      'string.max': 'Query cannot exceed 200 characters',
      'string.pattern.base': 'Query contains invalid characters'
    }),
  
  type: Joi.string()
    .valid('restaurant', 'tourist_attraction', 'gas_station', 'hospital', 'store', 'general')
    .optional(),
  
  location: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required()
  }).optional(),
  
  radius: Joi.number()
    .min(100)
    .max(50000)
    .optional()
    .messages({
      'number.min': 'Radius must be at least 100 meters',
      'number.max': 'Radius cannot exceed 50 kilometers'
    })
});

export const placeIdSchema = Joi.object({
  placeId: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid place ID format'
    })
});

export const chatQuerySchema = Joi.object({
  message: Joi.string()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'string.empty': 'Message cannot be empty',
      'string.min': 'Message must be at least 1 character long',
      'string.max': 'Message cannot exceed 1000 characters'
    }),
  
  context: Joi.object({
    location: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required()
    }).optional(),
    
    previousQueries: Joi.array()
      .items(Joi.string().max(200))
      .max(5)
      .optional()
  }).optional()
});

export function validateRequest(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors: ValidationError[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Request validation failed', {
        path: req.path,
        method: req.method,
        errors: validationErrors,
        body: req.body
      });

      res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
      return;
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
}

export function validateParams(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors: ValidationError[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Parameter validation failed', {
        path: req.path,
        method: req.method,
        errors: validationErrors,
        params: req.params
      });

      res.status(400).json({
        error: 'Parameter validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
      return;
    }

    req.params = value;
    next();
  };
}

export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const validationErrors: ValidationError[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Query validation failed', {
        path: req.path,
        method: req.method,
        errors: validationErrors,
        query: req.query
      });

      res.status(400).json({
        error: 'Query validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors
      });
      return;
    }

    req.query = value;
    next();
  };
}