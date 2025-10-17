# RAK Porcelain AI Assistant

A production-ready RAG (Retrieval-Augmented Generation) chatbot for RAK Porcelain products, built with React, Node.js, TypeScript, Supabase, and OpenAI.

## 🏺 Overview

RAK Porcelain AI Assistant is an intelligent chatbot that answers customer questions about RAK Porcelain products using only information from the company's product database. The system uses RAG technology to ensure accurate, contextual responses while maintaining strict control over the information provided.

## ✨ Features

- **RAG-Powered Responses**: Only uses information from the RAK Porcelain product database
- **Vector Similarity Search**: Uses pgvector for efficient document retrieval
- **Real-time Chat Interface**: Modern, responsive chat widget with RAK Porcelain branding
- **Provenance Tracking**: Every response includes source information
- **Data Ingestion Pipeline**: Automated processing of product data, FAQs, and documents
- **Mobile-First Design**: Fully responsive with Montserrat typography
- **Security-First**: API keys remain server-side only
- **Production Ready**: Comprehensive error handling, logging, and monitoring

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Supabase)    │
│                 │    │                 │    │   + pgvector    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   OpenAI API    │
                       │   (Embeddings   │
                       │   + Chat)       │
                       └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account with pgvector extension
- OpenAI API key
- Git

### 1. Clone and Setup

```bash
git clone <repository-url>
cd rak-porcelain-ai
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBED_DIM=1536

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend Configuration
REACT_APP_API_URL=http://localhost:3001
```

### 3. Database Setup

**Important**: Before running migrations, update the embedding dimension in the migration file to match your chosen OpenAI embedding model:

1. Open `db/migrations/001_create_tables.sql`
2. Find the line: `embedding VECTOR(1536)`
3. Replace `1536` with your `OPENAI_EMBED_DIM` value
4. Run the migration in your Supabase SQL editor

### 4. Install Dependencies

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install

# Root dependencies (for scripts)
cd ..
npm install
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start
```

### 6. Ingest Sample Data

```bash
# Run the ingestion script with sample data
npx ts-node scripts/ingest_products.ts scripts/sample_products.json
```

## 📁 Project Structure

```
rak-porcelain-ai/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── lib/            # Core libraries
│   │   │   ├── openaiClient.ts
│   │   │   ├── supabaseClient.ts
│   │   │   └── retrieval.ts
│   │   └── routes/         # API routes
│   │       ├── chat.ts
│   │       └── upload-products.ts
│   ├── server.ts           # Main server file
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWidget.tsx
│   │   │   └── ChatWidget.css
│   │   └── chat-demo.tsx   # Demo page
│   └── package.json
├── db/
│   └── migrations/         # Database migrations
│       └── 001_create_tables.sql
├── scripts/                # Data ingestion scripts
│   ├── ingest_products.ts
│   └── sample_products.json
├── system_prompt.md        # AI system instructions
├── .cursorrules           # Development guidelines
├── docker-compose.yml     # Docker setup
└── README.md
```

## 🔧 API Endpoints

### Chat Endpoints

- `POST /api/chat` - Send message to AI assistant
- `POST /api/chat/stream` - Stream response from AI assistant
- `GET /api/chat/history/:sessionId` - Get conversation history
- `POST /api/chat/feedback` - Submit feedback
- `GET /api/chat/health` - Chat service health check

### Upload Endpoints

- `POST /api/upload/products` - Upload product data files
- `POST /api/upload/product-data` - Upload product data (JSON)
- `POST /api/upload/images` - Upload product images
- `GET /api/upload/status` - Get upload status

### Health Endpoints

- `GET /health` - Basic health check
- `GET /health/db` - Database health check
- `GET /health/openai` - OpenAI API health check
- `GET /health/retrieval` - Retrieval system health check

## 🎨 Branding & Design

The application uses RAK Porcelain's brand colors and typography:

- **Primary Navy**: #0A2342
- **Accent Gold**: #C5A475
- **Background**: #FFFFFF
- **AI Bubble**: #F5F5F5
- **Text**: #333333 and #666666
- **Font**: Montserrat (Google Fonts)

## 🔒 Security

- API keys are server-side only
- Input validation on all endpoints
- CORS protection
- Helmet.js security headers
- Rate limiting (configurable)
- SQL injection protection via parameterized queries

## 🧪 Testing

### Unit Tests

```bash
cd backend
npm test
```

### Integration Tests

```bash
cd backend
npm run test:integration
```

### Manual Testing

1. Start the development servers
2. Open http://localhost:3000
3. Try sample questions:
   - "Tell me about your dinner sets"
   - "Is the tea set dishwasher safe?"
   - "What are the dimensions of the vase?"

## 🚀 Deployment

### Using Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Deployment

1. Set up production environment variables
2. Build frontend: `cd frontend && npm run build`
3. Start backend: `cd backend && npm start`
4. Serve frontend with nginx or similar

## 📊 Monitoring

The application includes comprehensive health checks:

- Database connectivity
- OpenAI API status
- Retrieval system functionality
- Overall system health

Access health endpoints at:
- http://localhost:3001/health
- http://localhost:3001/health/db
- http://localhost:3001/health/openai
- http://localhost:3001/health/retrieval

## 🔄 Data Ingestion

### Adding New Products

1. Create a JSON file with product data:

```json
[
  {
    "name": "Product Name",
    "description": "Product description...",
    "category": "Category",
    "sku": "SKU-001",
    "price": 99.99,
    "specifications": {...},
    "faqs": [
      {
        "question": "FAQ question?",
        "answer": "FAQ answer..."
      }
    ]
  }
]
```

2. Run the ingestion script:

```bash
npx ts-node scripts/ingest_products.ts your_products.json
```

### Supported File Types

- JSON (product data)
- CSV (product data)
- PDF (manuals, documents)
- Images (JPG, PNG, WebP)

## 🛠️ Development

### Code Style

- TypeScript for all backend code
- ESLint and Prettier for code formatting
- JSDoc comments for functions
- Error handling for all async operations

### Adding New Features

1. Create feature branch
2. Implement changes
3. Add tests
4. Update documentation
5. Submit pull request

## 📝 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Yes | - |
| `OPENAI_EMBEDDING_MODEL` | Embedding model | Yes | text-embedding-3-small |
| `OPENAI_CHAT_MODEL` | Chat model | Yes | gpt-4o-mini |
| `OPENAI_EMBED_DIM` | Embedding dimension | Yes | 1536 |
| `SUPABASE_URL` | Supabase project URL | Yes | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes | - |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | - |
| `PORT` | Server port | No | 3001 |
| `NODE_ENV` | Environment | No | development |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is proprietary to RAK Porcelain. All rights reserved.

## 🆘 Support

For technical support or questions:

1. Check the health endpoints
2. Review the logs
3. Check environment variables
4. Verify database connectivity
5. Contact the development team

## 🔄 Updates

### Changing Embedding Models

If you need to change the OpenAI embedding model:

1. Update `OPENAI_EMBEDDING_MODEL` in `.env`
2. Update `OPENAI_EMBED_DIM` to match the new model
3. Update the migration file with the new dimension
4. Re-run the migration
5. Re-ingest your data

### Model Dimensions

- `text-embedding-3-small`: 1536 dimensions
- `text-embedding-3-large`: 3072 dimensions
- `text-embedding-ada-002`: 1536 dimensions

---

**Built with ❤️ for RAK Porcelain**
