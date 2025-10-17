import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Get all conversations for a user
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user?.id; // Assuming auth middleware sets req.user
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get conversations: ${error.message}`);
    }

    res.json({
      conversations: conversations?.map(row => ({
        id: row.id,
        title: row.title,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })) || []
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new conversation
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { title } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert([{
        user_id: userId,
        title: title || 'New Conversation'
      }])
      .select('id, title, created_at, updated_at')
      .single();

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    res.status(201).json({
      message: 'Conversation created successfully',
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at
      }
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific conversation
router.get('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const conversationId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (error || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at
      }
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update conversation title
router.put('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const conversationId = req.params.id;
    const { title } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const { data: conversation, error } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', conversationId)
      .eq('user_id', userId)
      .select('id, title, updated_at')
      .single();

    if (error || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      message: 'Conversation updated successfully',
      conversation: {
        id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updated_at
      }
    });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a conversation
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const conversationId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (error) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;