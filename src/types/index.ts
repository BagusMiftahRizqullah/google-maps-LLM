export interface LocationQuery {
  query: string;
  type?: 'restaurant' | 'tourist_attraction' | 'gas_station' | 'hospital' | 'store' | 'general';
  location?: {
    lat: number;
    lng: number;
  };
  radius?: number;
}

export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  price_level?: number;
  types: string[];
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  website?: string;
  formatted_phone_number?: string;
}

export interface MapResponse {
  places: PlaceResult[];
  map_url: string;
  directions_url?: string;
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
}

export interface LLMResponse {
  response: string;
  extracted_location?: string;
  extracted_type?: string;
  confidence: number;
  map_data?: MapResponse;
}

export interface APIError {
  error: string;
  code: string;
  details?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

export interface GoogleMapsConfig {
  apiKey: string;
  placesApiKey: string;
  defaultRadius: number;
  maxResults: number;
}

export interface LLMConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeout: number;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  googleMaps: GoogleMapsConfig;
  llm: LLMConfig;
  rateLimit: RateLimitConfig;
  logLevel: string;
}