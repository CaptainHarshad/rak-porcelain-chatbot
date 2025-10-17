import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY environment variable is required');
}

// Service role client for backend operations (full access)
export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Anon client for public operations
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/**
 * Test database connection
 * @returns Promise<boolean> - True if connection is successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Database connection test error:', error);
    return false;
  }
}

/**
 * Get all products
 * @returns Promise<any[]> - Array of products
 */
export async function getProducts(): Promise<any[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to get products: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
}

/**
 * Get product by ID
 * @param productId - The product ID
 * @returns Promise<any> - Product data
 */
export async function getProductById(productId: string): Promise<any> {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (error) {
      throw new Error(`Failed to get product: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error getting product:', error);
    throw error;
  }
}

/**
 * Create a new product
 * @param productData - Product data to insert
 * @returns Promise<any> - Created product
 */
export async function createProduct(productData: any): Promise<any> {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([productData])
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

/**
 * Update a product
 * @param productId - The product ID
 * @param updates - Updates to apply
 * @returns Promise<any> - Updated product
 */
export async function updateProduct(productId: string, updates: any): Promise<any> {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', productId)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * Delete a product
 * @param productId - The product ID
 * @returns Promise<void>
 */
export async function deleteProduct(productId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

/**
 * Get product images
 * @param productId - The product ID
 * @returns Promise<any[]> - Array of product images
 */
export async function getProductImages(productId: string): Promise<any[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });
    
    if (error) {
      throw new Error(`Failed to get product images: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error getting product images:', error);
    throw error;
  }
}

/**
 * Upload file to Supabase Storage
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @param file - File to upload
 * @returns Promise<string> - Public URL of uploaded file
 */
export async function uploadFile(
  bucket: string, 
  path: string, 
  file: Buffer | File
): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
    
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(data.path);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Delete file from Supabase Storage
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @returns Promise<void>
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([path]);
    
    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Save conversation to database
 * @param conversationData - Conversation data to save
 * @returns Promise<any> - Saved conversation
 */
export async function saveConversation(conversationData: any): Promise<any> {
  try {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .insert([conversationData])
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save conversation: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error saving conversation:', error);
    throw error;
  }
}

/**
 * Get conversation history
 * @param sessionId - Session ID
 * @param limit - Number of conversations to retrieve
 * @returns Promise<any[]> - Array of conversations
 */
export async function getConversationHistory(
  sessionId: string, 
  limit: number = 50
): Promise<any[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw new Error(`Failed to get conversation history: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error getting conversation history:', error);
    throw error;
  }
}
