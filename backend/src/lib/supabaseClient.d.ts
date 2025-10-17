import { SupabaseClient } from '@supabase/supabase-js';
export declare const supabaseAdmin: SupabaseClient;
export declare const supabase: SupabaseClient;
/**
 * Test database connection
 * @returns Promise<boolean> - True if connection is successful
 */
export declare function testConnection(): Promise<boolean>;
/**
 * Get all products
 * @returns Promise<any[]> - Array of products
 */
export declare function getProducts(): Promise<any[]>;
/**
 * Get product by ID
 * @param productId - The product ID
 * @returns Promise<any> - Product data
 */
export declare function getProductById(productId: string): Promise<any>;
/**
 * Create a new product
 * @param productData - Product data to insert
 * @returns Promise<any> - Created product
 */
export declare function createProduct(productData: any): Promise<any>;
/**
 * Update a product
 * @param productId - The product ID
 * @param updates - Updates to apply
 * @returns Promise<any> - Updated product
 */
export declare function updateProduct(productId: string, updates: any): Promise<any>;
/**
 * Delete a product
 * @param productId - The product ID
 * @returns Promise<void>
 */
export declare function deleteProduct(productId: string): Promise<void>;
/**
 * Get product images
 * @param productId - The product ID
 * @returns Promise<any[]> - Array of product images
 */
export declare function getProductImages(productId: string): Promise<any[]>;
/**
 * Upload file to Supabase Storage
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @param file - File to upload
 * @returns Promise<string> - Public URL of uploaded file
 */
export declare function uploadFile(bucket: string, path: string, file: Buffer | File): Promise<string>;
/**
 * Delete file from Supabase Storage
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @returns Promise<void>
 */
export declare function deleteFile(bucket: string, path: string): Promise<void>;
/**
 * Save conversation to database
 * @param conversationData - Conversation data to save
 * @returns Promise<any> - Saved conversation
 */
export declare function saveConversation(conversationData: any): Promise<any>;
/**
 * Get conversation history
 * @param sessionId - Session ID
 * @param limit - Number of conversations to retrieve
 * @returns Promise<any[]> - Array of conversations
 */
export declare function getConversationHistory(sessionId: string, limit?: number): Promise<any[]>;
//# sourceMappingURL=supabaseClient.d.ts.map