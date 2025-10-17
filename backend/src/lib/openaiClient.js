"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmbedding = getEmbedding;
exports.getEmbeddings = getEmbeddings;
exports.chatCompletion = chatCompletion;
exports.chatCompletionStream = chatCompletionStream;
exports.validateApiKey = validateApiKey;
const node_fetch_1 = __importDefault(require("node-fetch"));
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBED_MODEL = process.env.OPENAI_EMBEDDING_MODEL;
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL;
if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
}
if (!EMBED_MODEL) {
    throw new Error('OPENAI_EMBEDDING_MODEL environment variable is required');
}
if (!CHAT_MODEL) {
    throw new Error('OPENAI_CHAT_MODEL environment variable is required');
}
/**
 * Get embedding for a text string using OpenAI Embeddings API
 * @param text - The text to embed
 * @returns Promise<number[]> - The embedding vector
 */
async function getEmbedding(text) {
    try {
        const response = await (0, node_fetch_1.default)('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: EMBED_MODEL,
                input: text
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI embedding error: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        return data.data[0].embedding;
    }
    catch (error) {
        console.error('Error getting embedding:', error);
        throw new Error(`Failed to get embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Get embeddings for multiple texts in batch
 * @param texts - Array of texts to embed
 * @returns Promise<number[][]> - Array of embedding vectors
 */
async function getEmbeddings(texts) {
    try {
        const response = await (0, node_fetch_1.default)('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: EMBED_MODEL,
                input: texts
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI embeddings error: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        return data.data.map((item) => item.embedding);
    }
    catch (error) {
        console.error('Error getting embeddings:', error);
        throw new Error(`Failed to get embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Generate chat completion using OpenAI Chat Completions API
 * @param systemPrompt - The system prompt to use
 * @param messages - Array of message objects with role and content
 * @returns Promise<string> - The generated response
 */
async function chatCompletion(systemPrompt, messages) {
    try {
        const response = await (0, node_fetch_1.default)('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: CHAT_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                max_tokens: 600,
                temperature: 0.0,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI chat error: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content ?? '';
    }
    catch (error) {
        console.error('Error getting chat completion:', error);
        throw new Error(`Failed to get chat completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Generate chat completion with streaming response
 * @param systemPrompt - The system prompt to use
 * @param messages - Array of message objects with role and content
 * @param onChunk - Callback function for each chunk received
 * @returns Promise<void>
 */
async function chatCompletionStream(systemPrompt, messages, onChunk) {
    try {
        const response = await (0, node_fetch_1.default)('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: CHAT_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                max_tokens: 600,
                temperature: 0.0,
                stream: true
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI chat stream error: ${response.status} ${errorText}`);
        }
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body reader available');
        }
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]')
                        return;
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) {
                            onChunk(content);
                        }
                    }
                    catch (e) {
                        // Ignore parsing errors for incomplete chunks
                    }
                }
            }
        }
    }
    catch (error) {
        console.error('Error in chat completion stream:', error);
        throw new Error(`Failed to stream chat completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Validate that the OpenAI API key is working
 * @returns Promise<boolean> - True if API key is valid
 */
async function validateApiKey() {
    try {
        await getEmbedding('test');
        return true;
    }
    catch (error) {
        console.error('OpenAI API key validation failed:', error);
        return false;
    }
}
//# sourceMappingURL=openaiClient.js.map