import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'RAK Porcelain AI Assistant',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Database health check
app.get('/health/db', async (req, res) => {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.json({
        status: 'PENDING',
        database: 'not configured',
        message: 'Please configure Supabase credentials',
        timestamp: new Date().toISOString()
      });
    }

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
      await saveConversation(sessionId, message, answer, docs);
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 RAK Porcelain AI Assistant Server`);
  console.log(`=====================================`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Database check: http://localhost:${PORT}/health/db`);
  console.log(`🤖 Chat endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`=====================================`);
});

export default app;
