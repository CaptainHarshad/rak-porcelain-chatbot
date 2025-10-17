# RAK Porcelain AI Assistant - Setup Guide

## 🎉 Current Status: SERVERS RUNNING!

✅ **Frontend**: http://localhost:3000  
✅ **Backend**: http://localhost:3001  
✅ **Health Check**: http://localhost:3001/health  
✅ **API Docs**: http://localhost:3001/api/docs  

## 🔧 Next Steps to Complete Setup

### Step 1: Configure Supabase Database

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note down your project URL and API keys

2. **Enable pgvector Extension**
   - In your Supabase dashboard, go to Database → Extensions
   - Search for "vector" and enable it
   - This enables vector similarity search for RAG

3. **Run Database Migration**
   - Go to SQL Editor in Supabase dashboard
   - Copy the contents of `db/migrations/001_create_tables.sql`
   - **IMPORTANT**: Before running, update the embedding dimension:
     - Find: `embedding VECTOR(1536)`
     - Replace `1536` with your `OPENAI_EMBED_DIM` value (default: 1536)
   - Run the migration

4. **Update Environment Variables**
   - Open `.env` file in the project root
   - Add your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_ANON_KEY=your-anon-key
   ```

### Step 2: Configure OpenAI API

1. **Get OpenAI API Key**
   - Go to [platform.openai.com](https://platform.openai.com)
   - Create an API key
   - Add it to your `.env` file:
   ```env
   OPENAI_API_KEY=sk-your-api-key-here
   ```

2. **Choose Your Models** (optional - defaults are set)
   ```env
   OPENAI_EMBEDDING_MODEL=text-embedding-3-small
   OPENAI_CHAT_MODEL=gpt-4o-mini
   OPENAI_EMBED_DIM=1536
   ```

### Step 3: Test the Configuration

1. **Restart the Backend Server**
   ```bash
   cd backend
   npx ts-node src/server-fixed.ts
   ```

2. **Check Health Endpoints**
   - Database: http://localhost:3001/health/db
   - OpenAI: http://localhost:3001/health/openai
   - All should show "OK" status

### Step 4: Ingest Sample Data

1. **Run the Ingestion Script**
   ```bash
   npx ts-node scripts/ingest_products.ts scripts/sample_products.json
   ```

2. **Verify Data in Supabase**
   - Check the `products` and `embeddings` tables
   - You should see sample RAK Porcelain products

### Step 5: Test the Complete System

1. **Open the Frontend**
   - Go to http://localhost:3000
   - You should see the RAK Porcelain AI Assistant interface

2. **Test Chat Functionality**
   - Try asking: "Tell me about your dinner sets"
   - The AI should respond with product information
   - Check that responses include provenance information

## 🚀 Production Deployment

### Using Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Manual Deployment

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start Backend**
   ```bash
   cd backend
   npm start
   ```

3. **Serve Frontend**
   - Use nginx or similar to serve the `frontend/build` directory

## 🔍 Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Check your `.env` file has all required variables
   - Restart the server after updating

2. **Database connection errors**
   - Verify Supabase URL and keys are correct
   - Check if pgvector extension is enabled

3. **OpenAI API errors**
   - Verify API key is valid and has credits
   - Check if the model names are correct

4. **Frontend not loading**
   - Check if React dev server is running on port 3000
   - Look for console errors in browser

### Health Checks

- **Backend Health**: http://localhost:3001/health
- **Database Health**: http://localhost:3001/health/db
- **OpenAI Health**: http://localhost:3001/health/openai
- **API Documentation**: http://localhost:3001/api/docs

## 📊 Expected Results

After complete setup, you should see:

✅ All health checks returning "OK"  
✅ Chat widget loading with RAK Porcelain branding  
✅ AI responses with product information and provenance  
✅ Sample product data loaded in the database  
✅ Vector embeddings generated for product descriptions  

## 🆘 Need Help?

1. Check the logs in your terminal
2. Verify all environment variables are set
3. Test each health endpoint individually
4. Check the browser console for frontend errors
5. Review the README.md for detailed documentation

---

**🎯 Goal**: Get the RAG system working end-to-end with real product data and AI responses!
