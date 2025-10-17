import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Import routes
import chatRoutes from './routes/chat.js';
import uploadRoutes from './routes/upload-products.js';

// Import health check functions
import { testConnection } from './lib/supabaseClient.js';
import { validateApiKey } from './lib/openaiClient.js';
import { validateRetrieval } from './lib/retrieval.js';

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
  process.exit(1);
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
    const isConnected = await testConnection();
    res.json({ 
      status: isConnected ? 'OK' : 'ERROR',
      database: isConnected ? 'connected' : 'disconnected',
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
    const isValid = await validateApiKey();
    res.json({ 
      status: isValid ? 'OK' : 'ERROR',
      openai: isValid ? 'connected' : 'disconnected',
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

app.get('/health/retrieval', async (req, res) => {
  try {
    const isValid = await validateRetrieval();
    res.json({ 
      status: isValid ? 'OK' : 'ERROR',
      retrieval: isValid ? 'working' : 'not working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      retrieval: 'not working',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use('/', chatRoutes);
app.use('/', uploadRoutes);

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  const docs = {
    name: 'RAK Porcelain AI Assistant API',
    version: '1.0.0',
    description: 'RAG-powered chatbot API for RAK Porcelain products',
    endpoints: {
      chat: {
        'POST /api/chat': 'Send a message to the AI assistant',
        'POST /api/chat/stream': 'Stream response from the AI assistant',
        'GET /api/chat/history/:sessionId': 'Get conversation history',
        'POST /api/chat/feedback': 'Submit feedback for a conversation',
        'GET /api/chat/health': 'Check chat service health'
      },
      upload: {
        'POST /api/upload/products': 'Upload product data files',
        'POST /api/upload/product-data': 'Upload product data directly (JSON)',
        'POST /api/upload/images': 'Upload product images',
        'GET /api/upload/status': 'Get upload status and statistics'
      },
      health: {
        'GET /health': 'Basic health check',
        'GET /health/db': 'Database health check',
        'GET /health/openai': 'OpenAI API health check',
        'GET /health/retrieval': 'Retrieval system health check'
      }
    },
    environment: {
      node_env: process.env.NODE_ENV,
      port: PORT,
      openai_model: process.env.OPENAI_CHAT_MODEL,
      embedding_model: process.env.OPENAI_EMBEDDING_MODEL
    }
  };
  
  res.json(docs);
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing authentication'
    });
  }
  
  // Default error response
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

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  try {
    // Close server
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const server = app.listen(PORT, () => {
  console.log('🚀 RAK Porcelain AI Assistant Server');
  console.log('=====================================');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Database check: http://localhost:${PORT}/health/db`);
  console.log(`🤖 OpenAI check: http://localhost:${PORT}/health/openai`);
  console.log(`🔍 Retrieval check: http://localhost:${PORT}/health/retrieval`);
  console.log(`📚 API docs: http://localhost:${PORT}/api/docs`);
  console.log('=====================================');
  
  // Test connections on startup
  testConnections();
});

async function testConnections() {
  console.log('\n🔍 Testing connections...');
  
  try {
    const [dbOk, openaiOk, retrievalOk] = await Promise.all([
      testConnection(),
      validateApiKey(),
      validateRetrieval()
    ]);
    
    console.log(`📊 Database: ${dbOk ? '✅ Connected' : '❌ Failed'}`);
    console.log(`🤖 OpenAI: ${openaiOk ? '✅ Connected' : '❌ Failed'}`);
    console.log(`🔍 Retrieval: ${retrievalOk ? '✅ Working' : '❌ Failed'}`);
    
    if (dbOk && openaiOk && retrievalOk) {
      console.log('\n🎉 All systems operational!');
    } else {
      console.log('\n⚠️  Some systems are not working properly. Check the logs above.');
    }
  } catch (error) {
    console.error('❌ Error testing connections:', error);
  }
}

export default app;
