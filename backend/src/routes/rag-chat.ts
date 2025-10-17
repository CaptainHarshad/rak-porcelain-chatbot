import express from 'express';
import { retrieveRelevantDocs, buildContextText } from '../lib/retrieval.js';
import { chatCompletion } from '../lib/openaiClient.js';
import { saveConversation } from '../lib/supabaseClient.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Load system prompt
const systemPromptPath = path.join(process.cwd(), '..', 'system_prompt.md');
let systemPrompt: string;

try {
  systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');
} catch (error) {
  console.error('Error reading system prompt:', error);
  systemPrompt = `You are RAK Porcelain Assistant. Only use information contained in the context field passed to you. Do not use any other knowledge. Cite the product id(s) and source when you reference facts. If the context does not provide an answer, respond: "I don't have that information — would you like me to escalate to an admin?" Keep answers concise and helpful.`;
}

router.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`🔍 Processing query: "${message}"`);
    
    // Retrieve relevant documents using RAG
    const docs = await retrieveRelevantDocs(message, 5);
    console.log(`📚 Retrieved ${docs.length} relevant documents`);
    
    // Build context text from retrieved documents
    const contextText = buildContextText(docs);
    console.log(`📝 Context length: ${contextText.length} characters`);
    
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

export default router;
