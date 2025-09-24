import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { 
  PlaceResult, 
  MapResponse,
  LocationQuery
} from '../types/index.js';

interface PlaceSearchResult {
  places: PlaceResult[];
  status: string;
  next_page_token?: string;
}

interface GooglePlacesApiResponse {
  results: any[];
  status: string;
  error_message?: string;
  next_page_token?: string;
}

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  message: string;
  timestamp: string;
}

class GoogleMapsService {
  private apiKey: string;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private readonly rateLimitDelay: number = 100; // ms between requests

  constructor() {
    this.apiKey = config.googleMaps.apiKey;
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private sanitizeInput(input: string): string {
    return input.replace(/[<>\"'&]/g, '').trim().substring(0, 200);
  }

  async searchPlaces(query: LocationQuery): Promise<PlaceSearchResult> {
    await this.rateLimit();
    
    const sanitizedQuery = this.sanitizeInput(query.query);
    
    logger.info('Searching places', { 
      query: sanitizedQuery,
      requestCount: this.requestCount 
    });

    try {
      // Use Google Places API Text Search
      const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
      searchUrl.searchParams.append('query', sanitizedQuery);
      searchUrl.searchParams.append('key', this.apiKey);
      
      if (query.radius) {
        searchUrl.searchParams.append('radius', query.radius.toString());
      }
      
      if (query.type) {
        searchUrl.searchParams.append('type', query.type);
      }

      logger.debug('Making Google Places API request', { url: searchUrl.toString() });

      const response = await fetch(searchUrl.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as GooglePlacesApiResponse;
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }

      const places: PlaceResult[] = (data.results || []).map((place: any): PlaceResult => {
        const result: PlaceResult = {
          place_id: place.place_id,
          name: place.name,
          formatted_address: place.formatted_address,
          geometry: {
            location: {
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng
            }
          },
          types: place.types || []
        };

        if (place.rating !== undefined) {
          result.rating = place.rating;
        }

        if (place.price_level !== undefined) {
          result.price_level = place.price_level;
        }

        if (place.photos && place.photos.length > 0) {
          result.photos = place.photos.map((photo: any) => ({
            photo_reference: photo.photo_reference,
            height: photo.height,
            width: photo.width
          }));
        }

        if (place.opening_hours) {
          result.opening_hours = {
            open_now: place.opening_hours.open_now || false,
            weekday_text: place.opening_hours.weekday_text || []
          };
        }

        if (place.website) {
          result.website = place.website;
        }

        if (place.formatted_phone_number) {
          result.formatted_phone_number = place.formatted_phone_number;
        }

        return result;
      });

      logger.info('Places search completed', { 
        query: sanitizedQuery,
        resultsCount: places.length,
        status: data.status
      });

      const result: PlaceSearchResult = {
        places,
        status: data.status
      };

      if (data.next_page_token) {
        result.next_page_token = data.next_page_token;
      }

      return result;

    } catch (error) {
      logger.error('Places search failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        query: sanitizedQuery 
      });
      
      throw new Error(`Places search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchPlacesForMap(query: LocationQuery): Promise<MapResponse> {
    try {
      await this.rateLimit();
      
      const sanitizedQuery = this.sanitizeInput(query.query);
      
      logger.info('Searching places for map', { 
        query: sanitizedQuery,
        requestCount: this.requestCount 
      });

      const searchResult = await this.searchPlaces(query);
      
      const firstPlace = searchResult.places[0];
      const center = firstPlace ? firstPlace.geometry.location : { lat: 0, lng: 0 };
      
      const mapResponse: MapResponse = {
        places: searchResult.places,
        map_url: `https://www.google.com/maps/embed/v1/search?key=${this.apiKey}&q=${encodeURIComponent(sanitizedQuery)}`,
        center: center,
        zoom: 13
      };

      if (firstPlace) {
        mapResponse.directions_url = this.generateDirectionsUrl(firstPlace);
      }

      return mapResponse;

    } catch (error) {
      logger.error('Map search failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        query: query.query 
      });
      
      throw new Error(`Map search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPlaceDetails(placeId: string): Promise<PlaceResult> {
    await this.rateLimit();
    
    logger.info('Getting place details', { placeId, requestCount: this.requestCount });

    try {
      // Return mock place details
      const mockPlace: PlaceResult = {
        place_id: placeId,
        name: 'Mock Place Details',
        formatted_address: '123 Mock Street, Mock City',
        geometry: {
          location: {
            lat: 40.7128,
            lng: -74.0060
          }
        },
        rating: 4.5,
        price_level: 2,
        types: ['restaurant', 'establishment'],
        photos: [{
          photo_reference: 'mock_photo_ref',
          height: 400,
          width: 600
        }],
        opening_hours: {
          open_now: true,
          weekday_text: ['Monday: 9:00 AM – 5:00 PM']
        },
        website: 'https://example.com',
        formatted_phone_number: '+1 (555) 123-4567'
      };

      return mockPlace;

    } catch (error) {
      logger.error('Place details fetch failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        placeId 
      });
      
      throw new Error(`Place details fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${this.apiKey}`;
  }

  generateDirectionsUrl(place: PlaceResult): string {
    const { lat, lng } = place.geometry.location;
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${place.place_id}`;
  }

  async geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
    await this.rateLimit();
    
    const sanitizedAddress = this.sanitizeInput(address);
    
    logger.info('Geocoding address', { 
      address: sanitizedAddress,
      requestCount: this.requestCount 
    });

    try {
      // Return mock coordinates
      return {
        lat: 40.7128,
        lng: -74.0060
      };

    } catch (error) {
      logger.error('Geocoding failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        address: sanitizedAddress 
      });
      
      throw new Error(`Geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      // Simple health check
      return {
        status: 'healthy',
        message: 'Google Maps service is running (mock mode)',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Google Maps service health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const googleMapsService = new GoogleMapsService();
export { GoogleMapsService };