"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const retrieval_1 = require("../lib/retrieval");
const openaiClient_1 = require("../lib/openaiClient");
const supabaseClient_1 = require("../lib/supabaseClient");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
// Read system prompt from file
const systemPromptPath = path_1.default.join(process.cwd(), '..', 'system_prompt.md');
let systemPrompt;
try {
    systemPrompt = fs_1.default.readFileSync(systemPromptPath, 'utf-8');
}
catch (error) {
    console.error('Error reading system prompt:', error);
    systemPrompt = `You are RAK Porcelain Assistant. Only use information contained in the context field passed to you. Do not use any external knowledge. Always include provenance (product id, source type, and source id). If the context does not provide an answer, respond: "I don't have that information — would you like me to escalate to an admin?" Keep answers concise and helpful.`;
}
/**
 * POST /api/chat
 * Main chat endpoint for RAG-based responses
 */
router.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        // Validate input
        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                error: 'Message is required and must be a string'
            });
        }
        if (!sessionId || typeof sessionId !== 'string') {
            return res.status(400).json({
                error: 'Session ID is required and must be a string'
            });
        }
        // Retrieve relevant documents using vector similarity search
        const docs = await (0, retrieval_1.retrieveRelevantDocs)(message, 5);
        if (docs.length === 0) {
            return res.json({
                answer: "I don't have that information — would you like me to escalate to an admin?",
                provenance: [],
                retrieved_docs: []
            });
        }
        // Build context from retrieved documents
        const contextText = (0, retrieval_1.buildContextText)(docs);
        // Prepare messages for OpenAI
        const userMessages = [
            {
                role: 'user',
                content: `Context:\n${contextText}\n\nUser question: ${message}`
            }
        ];
        // Get response from OpenAI
        const answer = await (0, openaiClient_1.chatCompletion)(systemPrompt, userMessages);
        // Save conversation to database
        try {
            await (0, supabaseClient_1.saveConversation)({
                session_id: sessionId,
                user_message: message,
                assistant_response: answer,
                retrieved_docs: docs.map(doc => ({
                    product_id: doc.product_id,
                    source_type: doc.source_type,
                    source_id: doc.source_id,
                    similarity: doc.similarity
                }))
            });
        }
        catch (dbError) {
            console.error('Error saving conversation:', dbError);
            // Don't fail the request if saving conversation fails
        }
        // Return response
        res.json({
            answer,
            provenance: docs.map(doc => ({
                product_id: doc.product_id,
                source_type: doc.source_type,
                source_id: doc.source_id,
                similarity: doc.similarity
            })),
            retrieved_docs: docs.length
        });
    }
    catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to process chat request'
        });
    }
});
/**
 * POST /api/chat/stream
 * Streaming chat endpoint for real-time responses
 */
router.post('/api/chat/stream', async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        // Validate input
        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                error: 'Message is required and must be a string'
            });
        }
        if (!sessionId || typeof sessionId !== 'string') {
            return res.status(400).json({
                error: 'Session ID is required and must be a string'
            });
        }
        // Retrieve relevant documents
        const docs = await (0, retrieval_1.retrieveRelevantDocs)(message, 5);
        if (docs.length === 0) {
            return res.json({
                answer: "I don't have that information — would you like me to escalate to an admin?",
                provenance: [],
                retrieved_docs: []
            });
        }
        // Build context
        const contextText = (0, retrieval_1.buildContextText)(docs);
        // Prepare messages
        const userMessages = [
            {
                role: 'user',
                content: `Context:\n${contextText}\n\nUser question: ${message}`
            }
        ];
        // Set up streaming response
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');
        let fullAnswer = '';
        // Stream the response
        const { chatCompletionStream } = await import('../lib/openaiClient');
        await chatCompletionStream(systemPrompt, userMessages, (chunk) => {
            fullAnswer += chunk;
            res.write(chunk);
        });
        res.end();
        // Save conversation after streaming is complete
        try {
            await (0, supabaseClient_1.saveConversation)({
                session_id: sessionId,
                user_message: message,
                assistant_response: fullAnswer,
                retrieved_docs: docs.map(doc => ({
                    product_id: doc.product_id,
                    source_type: doc.source_type,
                    source_id: doc.source_id,
                    similarity: doc.similarity
                }))
            });
        }
        catch (dbError) {
            console.error('Error saving conversation:', dbError);
        }
    }
    catch (error) {
        console.error('Streaming chat error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to process streaming chat request'
        });
    }
});
/**
 * GET /api/chat/history/:sessionId
 * Get conversation history for a session
 */
router.get('/api/chat/history/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { limit = 50 } = req.query;
        const { getConversationHistory } = await import('../lib/supabaseClient');
        const conversations = await getConversationHistory(sessionId, parseInt(limit));
        res.json({
            conversations: conversations.map(conv => ({
                id: conv.id,
                user_message: conv.user_message,
                assistant_response: conv.assistant_response,
                retrieved_docs: conv.retrieved_docs,
                created_at: conv.created_at
            }))
        });
    }
    catch (error) {
        console.error('Error getting conversation history:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get conversation history'
        });
    }
});
/**
 * POST /api/chat/feedback
 * Submit feedback for a conversation
 */
router.post('/api/chat/feedback', async (req, res) => {
    try {
        const { sessionId, conversationId, feedback, rating } = req.body;
        // This would typically save feedback to a separate table
        // For now, we'll just log it
        console.log('Feedback received:', {
            sessionId,
            conversationId,
            feedback,
            rating,
            timestamp: new Date().toISOString()
        });
        res.json({ message: 'Feedback received successfully' });
    }
    catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to submit feedback'
        });
    }
});
/**
 * GET /api/chat/health
 * Health check for chat service
 */
router.get('/api/chat/health', async (req, res) => {
    try {
        const { validateRetrieval } = await import('../lib/retrieval');
        const { validateApiKey } = await import('../lib/openaiClient');
        const { testConnection } = await import('../lib/supabaseClient');
        const [retrievalOk, openaiOk, dbOk] = await Promise.all([
            validateRetrieval(),
            validateApiKey(),
            testConnection()
        ]);
        res.json({
            status: 'OK',
            services: {
                retrieval: retrievalOk ? 'OK' : 'ERROR',
                openai: openaiOk ? 'OK' : 'ERROR',
                database: dbOk ? 'OK' : 'ERROR'
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'ERROR',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
exports.default = router;
//# sourceMappingURL=chat.js.map