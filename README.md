# LLM Maps Integration with Open WebUI

Aplikasi AI lokal yang mengintegrasikan Ollama LLM dengan Google Maps melalui Open WebUI sebagai frontend dan Node.js sebagai backend API. Pengguna dapat berinteraksi dengan AI assistant untuk mencari tempat, restoran, atraksi wisata, dan mendapatkan informasi lokasi melalui antarmuka chat yang intuitif.

## 🚀 Features

- **Local LLM dengan Ollama**: Menggunakan model AI lokal (Llama2, Mistral, dll) tanpa mengirim data ke cloud
- **Open WebUI Frontend**: Interface chat yang modern dan responsif untuk berinteraksi dengan AI
- **Google Maps Integration**: Pencarian tempat real-time, informasi detail, dan peta interaktif
- **Node.js Backend API**: Server TypeScript yang menangani integrasi Google Maps dan LLM
- **Filter Function**: Custom filter untuk Open WebUI yang memproses query lokasi
- **Security**: Rate limiting, input sanitization, dan proteksi API key
- **Fully Local**: Semua pemrosesan AI dilakukan secara lokal untuk privasi maksimal

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Open WebUI    │    │  Filter Function│    │   Node.js API   │    │   External APIs │
│                 │    │                 │    │                 │    │                 │
│ • Chat Interface│◄──►│ • Query Parser  │◄──►│ • Express.js    │◄──►│ • Google Maps   │
│ • Model Manager │    │ • Maps Context  │    │ • TypeScript    │    │ • Places API    │
│ • User Auth     │    │ • LLM Enhancer  │    │ • Security      │    │ • Geocoding     │
│ • Responsive UI │    │ • Response Format│    │ • Rate Limiting │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
                                    ▲
                                    │
                       ┌─────────────────┐
                       │   Ollama LLM    │
                       │                 │
                       │ • Local Models  │
                       │ • Llama2/Mistral│
                       │ • No Cloud Deps │
                       └─────────────────┘
```

## 📋 Prerequisites

- **Node.js 18+** dan npm untuk backend API
- **Python 3.8+** untuk Open WebUI
- **Ollama** terinstall secara lokal dengan model LLM
- **Google Cloud Account** dengan Maps API yang sudah diaktifkan
- **Open WebUI** untuk frontend interface

## 🛠️ Installation

### 1. Clone dan Setup Backend

```bash
git clone <repository-url>
cd llm-maps-integration
npm install
```

### 2. Install dan Setup Ollama

```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.ai/install.sh | sh

# Atau download dari https://ollama.ai untuk Windows

# Pull model yang diinginkan
ollama pull llama2          # Model 7B, balance yang baik
ollama pull llama2:13b      # Model 13B, kualitas lebih baik
ollama pull mistral         # Model yang cepat dan efisien
ollama pull codellama       # Model khusus untuk coding

# Start Ollama service
ollama serve
```

### 3. Install dan Setup Open WebUI

```bash
# Install Open WebUI menggunakan pip
pip install open-webui

# Atau menggunakan Docker
docker run -d -p 3000:8080 --add-host=host.docker.internal:host-gateway \
  -v open-webui:/app/backend/data --name open-webui --restart always \
  ghcr.io/open-webui/open-webui:main

# Atau install dari source
git clone https://github.com/open-webui/open-webui.git
cd open-webui
pip install -r requirements.txt
```

### 4. Konfigurasi Environment

Copy file environment example dan konfigurasi settings:

```bash
cp .env.example .env
```

Edit `.env` dengan konfigurasi Anda:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
GOOGLE_MAPS_REGION=ID

# LLM Configuration (Ollama)
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# Security
CORS_ORIGIN=http://localhost:8080
API_SECRET=your_random_secret_key_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### 5. Setup Open WebUI Environment

Buat file `.env.webui` untuk konfigurasi Open WebUI:

```env
# Open WebUI Configuration
WEBUI_SECRET_KEY=llm-maps-integration-secret-key-2024
FUNCTIONS_DIR=./open-webui-functions
MAPS_API_BASE_URL=http://localhost:3000
GLOBAL_LOG_LEVEL=DEBUG

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
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

## 🚀 Menjalankan Aplikasi

### Mode Development

1. **Start Backend API Server**:
```bash
# Start Node.js backend server
npm run dev

# Server akan berjalan di http://localhost:3000
# API documentation tersedia di http://localhost:3000/docs
```

2. **Start Ollama Service**:
```bash
# Pastikan Ollama service berjalan
ollama serve

# Verify model tersedia
ollama list
```

3. **Start Open WebUI**:
```bash
# Set environment variables
export FUNCTIONS_DIR=./open-webui-functions
export WEBUI_SECRET_KEY=llm-maps-integration-secret-key-2024
export MAPS_API_BASE_URL=http://localhost:3000

# Start Open WebUI
open-webui serve --port 8080

# Open WebUI akan berjalan di http://localhost:8080
```

4. **Setup Google Maps Filter**:
   - Copy file `google_maps_filter.py` ke folder `open-webui-functions/`
   - Restart Open WebUI untuk load filter
   - Pilih model "GoogleMapsAI" di interface

### Mode Production

```bash
# Build backend application
npm run build

# Start production backend server
npm start

# Start Open WebUI dengan production config
WEBUI_SECRET_KEY=your-production-secret open-webui serve --host 0.0.0.0 --port 8080
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

## 📖 Penggunaan

### Menggunakan Open WebUI Interface

1. **Buka Open WebUI** di browser: `http://localhost:8080`
2. **Pilih Model "GoogleMapsAI"** dari dropdown model
3. **Mulai chat** dengan pertanyaan lokasi, contoh:
   - "Cari restoran terbaik di Jakarta Selatan"
   - "Bagaimana cara ke Monas dari Bandara Soekarno-Hatta?"
   - "Rekomendasi tempat wisata di Bali"
   - "Hotel murah di dekat Malioboro Yogyakarta"

### API Endpoints Backend

- `GET /api/maps/search` - Cari tempat/lokasi
- `GET /api/maps/directions` - Dapatkan rute perjalanan
- `GET /api/maps/geocode` - Konversi alamat ke koordinat
- `GET /api/maps/reverse-geocode` - Konversi koordinat ke alamat

### Contoh Request API

```bash
# Cari restoran
curl "http://localhost:3000/api/maps/search?query=restoran&location=-6.2088,106.8456"

# Dapatkan rute
curl "http://localhost:3000/api/maps/directions?origin=Jakarta&destination=Bandung"

# Geocode alamat
curl "http://localhost:3000/api/maps/geocode?address=Jl. Sudirman No. 1, Jakarta"
```

### Contoh Percakapan dengan LLM

**User**: "Saya ingin makan sushi di Jakarta, ada rekomendasi?"

**GoogleMapsAI**: "Berikut beberapa rekomendasi restoran sushi terbaik di Jakarta:

1. **Sushi Tei** - Plaza Indonesia
   - Rating: 4.2/5
   - Alamat: Jl. M.H. Thamrin No.28-30
   - Harga: Rp 150.000-300.000/orang

2. **Genki Sushi** - Grand Indonesia
   - Rating: 4.1/5  
   - Alamat: Jl. M.H. Thamrin No.1
   - Harga: Rp 100.000-250.000/orang

Apakah Anda ingin saya carikan rute ke salah satu restoran ini?"

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

### Masalah Umum

1. **Masalah API Key Google Maps**
   - Pastikan Google Maps API key valid
   - Cek bahwa required APIs sudah diaktifkan di Google Cloud Console
   - Verify billing sudah disetup untuk Google Cloud project

2. **Masalah Koneksi LLM/Ollama**
   - Pastikan Ollama service berjalan: `ollama serve`
   - Cek model sudah didownload: `ollama pull llama2`
   - Verify base URL benar: `http://localhost:11434`

3. **Masalah Open WebUI**
   - Pastikan port 8080 tidak digunakan aplikasi lain
   - Cek environment variables sudah diset dengan benar
   - Restart Open WebUI jika ada perubahan pada functions

4. **Masalah CORS**
   - Update `CORS_ORIGIN` di file `.env`
   - Pastikan frontend URL sesuai dengan CORS configuration

5. **Google Maps Filter Tidak Muncul**
   - Copy `google_maps_filter.py` ke folder `open-webui-functions/`
   - Restart Open WebUI
   - Cek logs untuk error messages

### Debug Commands

```bash
# Cek status Ollama
ollama list
curl http://localhost:11434/api/tags

# Cek backend API
curl http://localhost:3000/health

# Cek Open WebUI functions
ls -la open-webui-functions/

# Test Google Maps API
curl "http://localhost:3000/api/maps/search?query=test&location=0,0"
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