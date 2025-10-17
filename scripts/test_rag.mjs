import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getEmbedding(text) {
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
    console.error('Error generating embedding:', error.message);
    throw error;
  }
}

async function testRAGSystem() {
  try {
    console.log('🚀 Testing RAG System End-to-End...');
    
    const query = "Tell me about your bar accessories";
    console.log(`🔍 Query: "${query}"`);
    
    // Step 1: Generate query embedding
    console.log('📝 Generating query embedding...');
    const queryEmbedding = await getEmbedding(query);
    console.log(`✅ Embedding generated (${queryEmbedding.length} dimensions)`);
    
    // Step 2: Retrieve relevant documents
    console.log('🔍 Retrieving relevant documents...');
    const { data: docs, error: retrievalError } = await supabase.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_count: 5
    });
    
    if (retrievalError) {
      throw new Error(`Retrieval error: ${retrievalError.message}`);
    }
    
    console.log(`✅ Retrieved ${docs.length} documents`);
    
    // Step 3: Build context
    const contextText = docs.map((doc, index) => {
      const provenance = `[Product: ${doc.product_id}, Source: ${doc.source_type}]`;
      return `${provenance}\n${doc.text_snippet}`;
    }).join('\n\n');
    
    console.log(`📄 Context length: ${contextText.length} characters`);
    console.log(`📄 Context preview: ${contextText.substring(0, 300)}...`);
    
    // Step 4: Generate AI response
    console.log('🤖 Generating AI response...');
    const systemPrompt = `You are RAK Porcelain Assistant. Only use information contained in the context field passed to you. Do not use any other knowledge. Cite the product id(s) and source when you reference facts. If the context does not provide an answer, respond: "I don't have that information — would you like me to escalate to an admin?" Keep answers concise and helpful.`;
    
    const userMessage = `Context:\n${contextText}\n\nUser question: ${query}`;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 600,
        temperature: 0.0
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
    }
    
    const aiResponse = await response.json();
    const answer = aiResponse.choices?.[0]?.message?.content || 'No response generated';
    
    console.log('\n🎉 RAG System Test Results:');
    console.log('=====================================');
    console.log(`📝 Query: ${query}`);
    console.log(`📚 Retrieved: ${docs.length} documents`);
    console.log(`🤖 AI Response: ${answer}`);
    console.log('=====================================');
    
    // Show provenance
    console.log('\n📋 Provenance:');
    docs.forEach((doc, index) => {
      console.log(`${index + 1}. Product: ${doc.product_id}`);
      console.log(`   Source: ${doc.source_type}`);
      console.log(`   Similarity: ${doc.similarity.toFixed(3)}`);
      console.log(`   Snippet: ${doc.text_snippet.substring(0, 100)}...`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ RAG System Test Failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testRAGSystem();
