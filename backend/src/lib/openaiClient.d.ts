/**
 * Get embedding for a text string using OpenAI Embeddings API
 * @param text - The text to embed
 * @returns Promise<number[]> - The embedding vector
 */
export declare function getEmbedding(text: string): Promise<number[]>;
/**
 * Get embeddings for multiple texts in batch
 * @param texts - Array of texts to embed
 * @returns Promise<number[][]> - Array of embedding vectors
 */
export declare function getEmbeddings(texts: string[]): Promise<number[][]>;
/**
 * Generate chat completion using OpenAI Chat Completions API
 * @param systemPrompt - The system prompt to use
 * @param messages - Array of message objects with role and content
 * @returns Promise<string> - The generated response
 */
export declare function chatCompletion(systemPrompt: string, messages: Array<{
    role: string;
    content: string;
}>): Promise<string>;
/**
 * Generate chat completion with streaming response
 * @param systemPrompt - The system prompt to use
 * @param messages - Array of message objects with role and content
 * @param onChunk - Callback function for each chunk received
 * @returns Promise<void>
 */
export declare function chatCompletionStream(systemPrompt: string, messages: Array<{
    role: string;
    content: string;
}>, onChunk: (chunk: string) => void): Promise<void>;
/**
 * Validate that the OpenAI API key is working
 * @returns Promise<boolean> - True if API key is valid
 */
export declare function validateApiKey(): Promise<boolean>;
//# sourceMappingURL=openaiClient.d.ts.map