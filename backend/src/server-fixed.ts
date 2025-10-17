import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from parent directory
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Validate required environment variables
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'OPENAI_EMBEDDING_MODEL',
  'OPENAI_CHAT_MODEL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  console.log('Please update your .env file with the required credentials');
  // Don't exit in development, just warn
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://*.supabase.co"]
    }
  }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.get('/health/db', async (req, res) => {
  try {
    // Check if Supabase credentials are configured
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.json({ 
        status: 'PENDING',
        database: 'not configured',
        message: 'Please configure Supabase credentials in .env file',
        timestamp: new Date().toISOString()
      });
    }

    // Test actual database connection
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    const { data, error } = await supabase.from('products').select('id').limit(1);
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    res.json({ 
      status: 'OK',
      database: 'connected',
      message: 'Supabase connection successful',
      sample_data: data?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/health/openai', async (req, res) => {
  try {
    // Simple OpenAI check - will be implemented when API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.json({ 
        status: 'PENDING',
        openai: 'not configured',
        message: 'Please configure OpenAI API key in .env file',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ 
      status: 'OK',
      openai: 'configured',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      openai: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// RAG-enabled chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`🔍 Processing query: "${message}"`);
    
    // Check if we have the required environment variables
    if (!process.env.OPENAI_API_KEY || !process.env.SUPABASE_URL) {
      return res.json({
        answer: "I'm the RAK Porcelain AI Assistant! I'm currently being set up. Please configure your Supabase database and OpenAI API key to enable full functionality.",
        provenance: [],
        retrieved_docs: 0
      });
    }
    
    // Import and use RAG functionality
    const { retrieveRelevantDocs, buildContextText } = await import('./lib/retrieval.js');
    const { chatCompletion } = await import('./lib/openaiClient.js');
    const { saveConversation } = await import('./lib/supabaseClient.js');
    
    // Retrieve relevant documents using RAG
    const docs = await retrieveRelevantDocs(message, 5);
    console.log(`📚 Retrieved ${docs.length} relevant documents`);
    
    // Build context text from retrieved documents
    const contextText = buildContextText(docs);
    console.log(`📝 Context length: ${contextText.length} characters`);
    
    // Load system prompt
    const systemPromptPath = path.join(process.cwd(), '..', 'system_prompt.md');
    let systemPrompt: string;
    try {
      systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');
    } catch (error) {
      systemPrompt = `You are RAK Porcelain Assistant. Only use information contained in the context field passed to you. Do not use any other knowledge. Cite the product id(s) and source when you reference facts. If the context does not provide an answer, respond: "I don't have that information — would you like me to escalate to an admin?" Keep answers concise and helpful.`;
    }
    
    // Prepare messages for OpenAI
    const userMessages = [
      {
        role: 'user',
        content: `Context:\n${contextText}\n\nUser question: ${message}`
      }
    ];
    
    // Get AI response
    const answer = await chatCompletion(systemPrompt, userMessages);
    console.log(`🤖 Generated response: ${answer.substring(0, 100)}...`);
    
    // Save conversation to database
    if (sessionId) {
      await saveConversation({
        session_id: sessionId,
        user_message: message,
        assistant_message: answer,
        provenance: docs
      });
    }
    
    res.json({
      answer,
      provenance: docs.map(doc => ({
        product_id: doc.product_id,
        source_type: doc.source_type,
        text_snippet: doc.text_snippet.substring(0, 100) + '...',
        similarity: doc.similarity
      })),
      retrieved_docs: docs.length
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process chat request'
    });
  }
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  const docs = {
    name: 'RAK Porcelain AI Assistant API',
    version: '1.0.0',
    description: 'RAG-powered chatbot API for RAK Porcelain products',
    status: 'Setup in progress',
    endpoints: {
      health: {
        'GET /health': 'Basic health check',
        'GET /health/db': 'Database health check',
        'GET /health/openai': 'OpenAI API health check'
      },
      chat: {
        'POST /api/chat': 'Send a message to the AI assistant (placeholder)'
      }
    },
    setup_required: [
      'Configure Supabase database with pgvector extension',
      'Add OpenAI API key to environment variables',
      'Run database migration',
      'Ingest sample product data'
    ]
  };
  
  res.json(docs);
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested resource ${req.originalUrl} was not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('🚀 RAK Porcelain AI Assistant Server');
  console.log('=====================================');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Database check: http://localhost:${PORT}/health/db`);
  console.log(`🤖 OpenAI check: http://localhost:${PORT}/health/openai`);
  console.log(`📚 API docs: http://localhost:${PORT}/api/docs`);
  console.log('=====================================');
  console.log('⚠️  Setup required:');
  console.log('   1. Configure Supabase database');
  console.log('   2. Add OpenAI API key to .env file');
  console.log('   3. Run database migration');
  console.log('   4. Ingest sample product data');
  console.log('=====================================');
});

export default app;
