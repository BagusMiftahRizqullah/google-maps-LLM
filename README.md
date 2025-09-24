# LLM Maps Integration

A local LLM-powered application that integrates with Google Maps to provide intelligent location-based responses. Users can chat with an AI assistant to find places, restaurants, attractions, and get directions through an interactive web interface.

## 🚀 Features

- **Local LLM Integration**: Uses Ollama or OpenAI-compatible APIs for natural language processing
- **Google Maps Integration**: Real-time place search, detailed information, and interactive maps
- **Chat Interface**: Natural conversation with the AI about locations and places
- **Interactive Map**: Visual representation of search results with markers and place details
- **Security**: Rate limiting, input sanitization, and API key protection
- **Responsive Design**: Works on desktop and mobile devices

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │   Backend API   │    │   External APIs │
│                 │    │                 │    │                 │
│ • Chat UI       │◄──►│ • Express.js    │◄──►│ • Google Maps   │
│ • Google Maps   │    │ • TypeScript    │    │ • Ollama/OpenAI │
│ • Responsive    │    │ • Security      │    │ • Places API    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- Node.js 18+ and npm
- Google Cloud Account with Maps API enabled
- Ollama installed locally OR OpenAI API key
- MongoDB (optional, for future data persistence)

## 🛠️ Installation

### 1. Clone and Setup

```bash
git clone <repository-url>
cd llm-maps-integration
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
GOOGLE_MAPS_REGION=US

# LLM Configuration (choose one)
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# OR for OpenAI
# LLM_PROVIDER=openai
# OPENAI_API_KEY=your_openai_api_key_here
# OPENAI_MODEL=gpt-3.5-turbo

# Security
CORS_ORIGIN=http://localhost:3000
API_SECRET=your_random_secret_key_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### 3. Google Cloud Setup

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable billing (required for Maps API)

2. **Enable APIs**:
   ```bash
   # Enable required APIs
   gcloud services enable maps-backend.googleapis.com
   gcloud services enable places-backend.googleapis.com
   gcloud services enable geocoding-backend.googleapis.com
   ```

3. **Create API Key**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Restrict the key to your domain and required APIs
   - Copy the key to your `.env` file

### 4. LLM Setup

#### Option A: Ollama (Recommended for local development)

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model (choose one)
ollama pull llama2          # 7B model, good balance
ollama pull llama2:13b      # 13B model, better quality
ollama pull codellama       # Code-focused model
ollama pull mistral         # Fast and efficient

# Start Ollama service
ollama serve
```

#### Option B: OpenAI API

1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add to `.env` file
3. Set `LLM_PROVIDER=openai`

## 🚀 Running the Application

### Development Mode

```bash
# Start the backend server
npm run dev

# The server will start on http://localhost:3000
# API documentation available at http://localhost:3000/docs
```

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📖 API Documentation

### Health Check
```http
GET /api/health
```

### Search Places
```http
POST /api/search
Content-Type: application/json

{
  "query": "Italian restaurants in Rome",
  "type": "restaurant",
  "location": { "lat": 41.9028, "lng": 12.4964 },
  "radius": 5000
}
```

### Chat with LLM
```http
POST /api/chat
Content-Type: application/json

{
  "message": "Find me good coffee shops near the Colosseum",
  "context": {
    "location": { "lat": 41.8902, "lng": 12.4922 }
  }
}
```

### Get Place Details
```http
GET /api/place/{placeId}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🔒 Security Features

- **Rate Limiting**: Prevents API abuse
- **Input Sanitization**: Protects against injection attacks
- **CORS Protection**: Restricts cross-origin requests
- **Helmet Security**: Adds security headers
- **API Key Validation**: Protects sensitive endpoints
- **Request Logging**: Monitors API usage

## 🎯 Usage Examples

### Chat Examples

1. **Restaurant Search**:
   - "Find Italian restaurants near me"
   - "Show me highly rated sushi places in Tokyo"
   - "Where can I get good pizza in New York?"

2. **Tourist Attractions**:
   - "What are the must-see attractions in Paris?"
   - "Show me museums in London"
   - "Find parks and outdoor activities in San Francisco"

3. **Local Services**:
   - "Where's the nearest gas station?"
   - "Find pharmacies open now"
   - "Show me banks with ATMs nearby"

### Direct Search Examples

- "Coffee shops"
- "Hotels in downtown"
- "Tourist attractions"
- "Restaurants with outdoor seating"

## 🔧 Configuration Options

### LLM Configuration

```typescript
// Ollama configuration
{
  provider: 'ollama',
  baseUrl: 'http://localhost:11434',
  model: 'llama2',
  temperature: 0.7,
  maxTokens: 500
}

// OpenAI configuration
{
  provider: 'openai',
  apiKey: 'sk-...',
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 500
}
```

### Google Maps Configuration

```typescript
{
  apiKey: 'your-api-key',
  region: 'US',
  language: 'en',
  defaultRadius: 5000,
  maxResults: 20
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Google Maps API Key Issues**:
   ```bash
   # Check if APIs are enabled
   gcloud services list --enabled
   
   # Verify API key restrictions
   # Make sure your domain is whitelisted
   ```

2. **Ollama Connection Issues**:
   ```bash
   # Check if Ollama is running
   curl http://localhost:11434/api/tags
   
   # Restart Ollama service
   ollama serve
   ```

3. **Rate Limiting**:
   ```bash
   # Adjust rate limits in .env
   RATE_LIMIT_MAX_REQUESTS=200
   RATE_LIMIT_WINDOW_MS=900000
   ```

4. **CORS Issues**:
   ```bash
   # Update CORS origin in .env
   CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
   ```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Check logs
tail -f logs/combined.log
```

## 📊 Monitoring

### Health Checks

The application provides health check endpoints:

```bash
# Check overall health
curl http://localhost:3000/api/health

# Response
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "googleMaps": "healthy",
    "llm": "healthy"
  }
}
```

### Logging

Logs are written to:
- Console (development)
- `logs/error.log` (errors only)
- `logs/combined.log` (all logs)

## 🔮 Future Enhancements

- [ ] User authentication and personalization
- [ ] Conversation history persistence
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Offline map caching
- [ ] Advanced place filtering
- [ ] Integration with other map providers
- [ ] Mobile app development
- [ ] Real-time location tracking
- [ ] Social features (sharing places)

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review API documentation at `/docs`

---

**Note**: This project is designed for educational and development purposes. Ensure you comply with Google Maps API terms of service and usage limits in production environments.