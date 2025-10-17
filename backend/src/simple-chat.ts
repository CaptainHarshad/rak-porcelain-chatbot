import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
        input: text
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

async function chatCompletion(systemPrompt: string, messages: Array<any>): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 600,
        temperature: 0.0
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? '';
  } catch (error) {
    console.error('Error in chat completion:', error);
    throw error;
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
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
    
    // Step 1: Generate query embedding
    const queryEmbedding = await getEmbedding(message);
    console.log(`✅ Query embedding generated (${queryEmbedding.length} dimensions)`);
    
    // Step 2: Retrieve relevant documents
    const { data: docs, error: retrievalError } = await supabase.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_count: 5
    });
    
    if (retrievalError) {
      throw new Error(`Retrieval error: ${retrievalError.message}`);
    }
    
    console.log(`📚 Retrieved ${docs.length} documents`);
    
    // Step 3: Build context
    const contextText = docs.map((doc: any) => {
      const provenance = `[Product: ${doc.product_id}, Source: ${doc.source_type}]`;
      return `${provenance}\n${doc.text_snippet}`;
    }).join('\n\n');
    
    console.log(`📄 Context length: ${contextText.length} characters`);
    
    // Step 4: Load system prompt
    const systemPromptPath = path.join(process.cwd(), '..', 'system_prompt.md');
    let systemPrompt: string;
    try {
      systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');
    } catch (error) {
      systemPrompt = `You are RAK Porcelain Assistant. Only use information contained in the context field passed to you. Do not use any other knowledge. Cite the product id(s) and source when you reference facts. If the context does not provide an answer, respond: "I don't have that information — would you like me to escalate to an admin?" Keep answers concise and helpful.`;
    }
    
    // Step 5: Generate AI response
    const userMessages = [
      {
        role: 'user',
        content: `Context:\n${contextText}\n\nUser question: ${message}`
      }
    ];
    
    const answer = await chatCompletion(systemPrompt, userMessages);
    console.log(`🤖 Generated response: ${answer.substring(0, 100)}...`);
    
    // Step 6: Save conversation to database
    if (sessionId) {
      try {
        await supabase.from('conversations').insert({
          session_id: sessionId,
          user_message: message,
          assistant_response: answer,
          retrieved_docs: docs
        });
      } catch (error) {
        console.error('Error saving conversation:', error);
      }
    }
    
    res.json({
      answer,
      provenance: docs.map((doc: any) => ({
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
  console.log('🚀 RAK Porcelain AI Assistant Server (Simple)');
  console.log('==============================================');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
  console.log('==============================================');
});
