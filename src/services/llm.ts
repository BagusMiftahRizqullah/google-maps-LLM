import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { LLMResponse, LocationQuery } from '../types';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

class LLMService {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeout: number;

  constructor() {
    this.baseUrl = config.llm.baseUrl;
    this.model = config.llm.model;
    this.timeout = config.llm.timeout;
  }

  async processLocationQuery(userQuery: string): Promise<LLMResponse> {
    try {
      logger.info(`Processing location query: ${userQuery}`);
      
      // TEMPORARY: Skip LLM processing for faster testing
      logger.info('Skipping LLM processing for faster response');
      
      // Simple fallback parsing
      const fallbackLocation = this.extractLocationFallback(userQuery);
      const fallbackType = this.extractTypeFallback(userQuery);
      
      return {
        response: `I'll help you find ${fallbackType} ${fallbackLocation ? `in ${fallbackLocation}` : 'nearby'}`,
        extracted_location: fallbackLocation || 'current location',
        extracted_type: fallbackType,
        confidence: 0.8
      };
    } catch (error) {
      logger.error('Error processing location query:', error);
      
      // Fallback parsing
      const fallbackLocation = this.extractLocationFallback(userQuery);
      const fallbackType = this.extractTypeFallback(userQuery);
      
      return {
        response: `I'll help you find ${fallbackType} ${fallbackLocation ? `in ${fallbackLocation}` : 'nearby'}`,
        extracted_location: fallbackLocation || 'current location',
        extracted_type: fallbackType,
        confidence: 0.5
      };
    }
  }

  private buildSystemPrompt(): string {
    return `Extract location and place type from user query. Respond only with JSON:
{"response": "helpful message", "extracted_location": "location or current location", "extracted_type": "restaurant|tourist_attraction|gas_station|hospital|store|general", "confidence": 0.0-1.0}

Examples:
"Cari restoran terdekat" -> {"response": "I'll find nearby restaurants", "extracted_location": "current location", "extracted_type": "restaurant", "confidence": 0.9}
"Hotel di Jakarta" -> {"response": "I'll find hotels in Jakarta", "extracted_location": "Jakarta", "extracted_type": "general", "confidence": 0.8}

`;
  }

  private buildUserPrompt(userQuery: string): string {
    return `User query: "${userQuery}"

Please analyze this query and respond with the JSON format specified above.`;
  }

  private async callLLM(prompt: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.1,
            top_p: 0.8,
            num_predict: 100,
            stop: ["\n\n", "---"]
          }
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data as OllamaResponse;
      return data.response;

    } catch (error) {
      // Enhanced error logging
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          logger.error('LLM API connection error', { 
            error: 'LLM service is not available. Please ensure Ollama is running.',
            baseUrl: this.baseUrl,
            model: this.model
          });
          throw new Error('LLM service is not available. Please ensure Ollama is running.');
        }
        if (error.code === 'ECONNABORTED') {
          logger.error('LLM API timeout error', { 
            error: `Request timeout after ${this.timeout}ms`,
            baseUrl: this.baseUrl,
            model: this.model,
            timeout: this.timeout
          });
          throw new Error(`LLM request timeout after ${this.timeout}ms`);
        }
        logger.error('LLM API error', { 
          error: `LLM API error: ${error.message}`,
          status: error.response?.status,
          statusText: error.response?.statusText,
          baseUrl: this.baseUrl,
          model: this.model
        });
        throw new Error(`LLM API error: ${error.message}`);
      }
      logger.error('LLM unknown error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: typeof error,
        baseUrl: this.baseUrl,
        model: this.model
      });
      throw error;
    }
  }

  private parseResponse(llmResponse: string): LLMResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        response: parsed.response || llmResponse,
        extracted_location: parsed.extracted_location || null,
        extracted_type: this.validatePlaceType(parsed.extracted_type),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5))
      };

    } catch (error) {
      logger.warn('Failed to parse LLM JSON response, using fallback', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        response: llmResponse 
      });

      // Fallback parsing
      const fallbackLocation = this.extractLocationFallback(llmResponse);
      return {
        response: llmResponse,
        ...(fallbackLocation && { extracted_location: fallbackLocation }),
        extracted_type: this.extractTypeFallback(llmResponse),
        confidence: 0.3
      };
    }
  }

  private validatePlaceType(type: string): string {
    const validTypes = ['restaurant', 'tourist_attraction', 'gas_station', 'hospital', 'store', 'general'];
    return validTypes.includes(type) ? type : 'general';
  }

  private extractLocationFallback(text: string): string | undefined {
    // Common greetings and words to ignore
    const ignoreWords = ['halo', 'hello', 'hi', 'hey', 'cari', 'find', 'search', 'looking', 'want'];
    
    const locationKeywords = [
      'di ', 'in ', 'at ', 'near ', 'around ', 'close to ', 'nearby ', 'dekat '
    ];

    const lowerText = text.toLowerCase();
    
    // First try to find location after specific keywords
    for (const keyword of locationKeywords) {
      const index = lowerText.indexOf(keyword);
      if (index !== -1) {
        const afterKeyword = text.substring(index + keyword.length);
        const location = afterKeyword.split(/[,.!?]/)[0]?.trim();
        if (location && location.length > 0 && !ignoreWords.includes(location.toLowerCase())) {
          return location;
        }
      }
    }

    // Known Indonesian cities and places
    const knownPlaces = [
      'jakarta', 'surabaya', 'bandung', 'medan', 'bekasi', 'tangerang', 'depok', 'semarang',
      'palembang', 'makassar', 'batam', 'bogor', 'pekanbaru', 'bandar lampung', 'malang',
      'yogyakarta', 'solo', 'denpasar', 'balikpapan', 'samarinda', 'pontianak', 'manado',
      'ambon', 'jayapura', 'sorong', 'kupang', 'mataram', 'bengkulu', 'jambi', 'padang'
    ];
    
    for (const place of knownPlaces) {
      if (lowerText.includes(place)) {
        return place.charAt(0).toUpperCase() + place.slice(1);
      }
    }

    return undefined;
  }

  private extractTypeFallback(text: string): string {
    const typeKeywords = {
      restaurant: ['restaurant', 'food', 'eat', 'dining', 'cafe', 'bar', 'pizza', 'burger', 'sushi'],
      tourist_attraction: ['tourist', 'attraction', 'museum', 'park', 'monument', 'landmark', 'sightseeing'],
      gas_station: ['gas', 'fuel', 'petrol', 'station'],
      hospital: ['hospital', 'medical', 'doctor', 'clinic', 'emergency'],
      store: ['store', 'shop', 'market', 'mall', 'shopping', 'buy']
    };

    const lowerText = text.toLowerCase();

    for (const [type, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return type;
      }
    }

    return 'general';
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      logger.error('LLM health check failed', { error });
      return false;
    }
  }

  async generateLocationQuery(llmResponse: LLMResponse): Promise<LocationQuery | null> {
    if (!llmResponse.extracted_location) {
      return null;
    }

    return {
      query: llmResponse.extracted_location,
      type: llmResponse.extracted_type as any,
      radius: 5000 // 5km default radius
    };
  }
}

export const llmService = new LLMService();