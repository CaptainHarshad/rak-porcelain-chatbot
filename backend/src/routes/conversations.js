"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const router = express_1.default.Router();
const pool = new pg_1.Pool();
// Get all conversations for a user
router.get('/', async (req, res) => {
    try {
        const userId = req.user?.id; // Assuming auth middleware sets req.user
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const result = await pool.query('SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
        res.json({
            conversations: result.rows.map(row => ({
                id: row.id,
                title: row.title,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }))
        });
    }
    catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create a new conversation
router.post('/', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { title } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const result = await pool.query('INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at, updated_at', [userId, title || 'New Conversation']);
        const conversation = result.rows[0];
        res.status(201).json({
            message: 'Conversation created successfully',
            conversation: {
                id: conversation.id,
                title: conversation.title,
                createdAt: conversation.created_at,
                updatedAt: conversation.updated_at
            }
        });
    }
    catch (error) {
        console.error('Create conversation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get a specific conversation
router.get('/:id', async (req, res) => {
    try {
        const userId = req.user?.id;
        const conversationId = req.params.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const result = await pool.query('SELECT id, title, created_at, updated_at FROM conversations WHERE id = $1 AND user_id = $2', [conversationId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        const conversation = result.rows[0];
        res.json({
            conversation: {
                id: conversation.id,
                title: conversation.title,
                createdAt: conversation.created_at,
                updatedAt: conversation.updated_at
            }
        });
    }
    catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update conversation title
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user?.id;
        const conversationId = req.params.id;
        const { title } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        const result = await pool.query('UPDATE conversations SET title = $1 WHERE id = $2 AND user_id = $3 RETURNING id, title, updated_at', [title, conversationId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        const conversation = result.rows[0];
        res.json({
            message: 'Conversation updated successfully',
            conversation: {
                id: conversation.id,
                title: conversation.title,
                updatedAt: conversation.updated_at
            }
        });
    }
    catch (error) {
        console.error('Update conversation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete a conversation
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user?.id;
        const conversationId = req.params.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const result = await pool.query('DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id', [conversationId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        res.json({ message: 'Conversation deleted successfully' });
    }
    catch (error) {
        console.error('Delete conversation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=conversations.js.map