"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const router = express_1.default.Router();
const pool = new pg_1.Pool();
// Get messages for a conversation
router.get('/conversation/:conversationId', async (req, res) => {
    try {
        const userId = req.user?.id;
        const conversationId = req.params.conversationId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Verify conversation belongs to user
        const conversationCheck = await pool.query('SELECT id FROM conversations WHERE id = $1 AND user_id = $2', [conversationId, userId]);
        if (conversationCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        const result = await pool.query('SELECT id, role, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC', [conversationId]);
        res.json({
            messages: result.rows.map(row => ({
                id: row.id,
                role: row.role,
                content: row.content,
                timestamp: row.created_at
            }))
        });
    }
    catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Send a message
router.post('/', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { conversationId, role, content } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!conversationId || !role || !content) {
            return res.status(400).json({ error: 'Conversation ID, role, and content are required' });
        }
        if (!['user', 'assistant', 'system'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be user, assistant, or system' });
        }
        // Verify conversation belongs to user
        const conversationCheck = await pool.query('SELECT id FROM conversations WHERE id = $1 AND user_id = $2', [conversationId, userId]);
        if (conversationCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        const result = await pool.query('INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3) RETURNING id, role, content, created_at', [conversationId, role, content]);
        const message = result.rows[0];
        res.status(201).json({
            message: 'Message sent successfully',
            data: {
                id: message.id,
                role: message.role,
                content: message.content,
                timestamp: message.created_at
            }
        });
    }
    catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update a message
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user?.id;
        const messageId = req.params.id;
        const { content } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        // Verify message belongs to user's conversation
        const messageCheck = await pool.query(`SELECT m.id FROM messages m 
       JOIN conversations c ON m.conversation_id = c.id 
       WHERE m.id = $1 AND c.user_id = $2`, [messageId, userId]);
        if (messageCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }
        const result = await pool.query('UPDATE messages SET content = $1 WHERE id = $2 RETURNING id, role, content, created_at', [content, messageId]);
        const message = result.rows[0];
        res.json({
            message: 'Message updated successfully',
            data: {
                id: message.id,
                role: message.role,
                content: message.content,
                timestamp: message.created_at
            }
        });
    }
    catch (error) {
        console.error('Update message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete a message
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user?.id;
        const messageId = req.params.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Verify message belongs to user's conversation
        const messageCheck = await pool.query(`SELECT m.id FROM messages m 
       JOIN conversations c ON m.conversation_id = c.id 
       WHERE m.id = $1 AND c.user_id = $2`, [messageId, userId]);
        if (messageCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }
        await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);
        res.json({ message: 'Message deleted successfully' });
    }
    catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=messages.js.map