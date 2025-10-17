import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Get messages for a conversation
router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const conversationId = req.params.conversationId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify conversation belongs to user
    const { data: conversationCheck } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!conversationCheck) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }

    res.json({
      messages: messages?.map(row => ({
        id: row.id,
        role: row.role,
        content: row.content,
        timestamp: row.created_at
      })) || []
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send a message
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
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
    const { data: conversationCheck } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!conversationCheck) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert([{
        conversation_id: conversationId,
        role,
        content
      }])
      .select('id, role, content, created_at')
      .single();

    if (error) {
      throw new Error(`Failed to create message: ${error.message}`);
    }

    res.status(201).json({
      message: 'Message sent successfully',
      data: {
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.created_at
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a message
router.put('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const messageId = req.params.id;
    const { content } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Verify message belongs to user's conversation
    const { data: messageCheck } = await supabase
      .from('messages')
      .select(`
        id,
        conversations!inner(user_id)
      `)
      .eq('id', messageId)
      .eq('conversations.user_id', userId)
      .single();

    if (!messageCheck) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const { data: message, error } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', messageId)
      .select('id, role, content, created_at')
      .single();

    if (error) {
      throw new Error(`Failed to update message: ${error.message}`);
    }

    res.json({
      message: 'Message updated successfully',
      data: {
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.created_at
      }
    });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a message
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const messageId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify message belongs to user's conversation
    const { data: messageCheck } = await supabase
      .from('messages')
      .select(`
        id,
        conversations!inner(user_id)
      `)
      .eq('id', messageId)
      .eq('conversations.user_id', userId)
      .single();

    if (!messageCheck) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;