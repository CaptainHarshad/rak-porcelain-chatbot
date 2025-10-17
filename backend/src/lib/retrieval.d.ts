export interface RetrievedDocument {
    product_id: string;
    source_type: string;
    source_id: string | null;
    text_snippet: string;
    similarity: number;
    metadata: any;
}
/**
 * Retrieve relevant documents using vector similarity search
 * @param query - The search query
 * @param topK - Number of top results to return (default: 5)
 * @returns Promise<RetrievedDocument[]> - Array of retrieved documents
 */
export declare function retrieveRelevantDocs(query: string, topK?: number): Promise<RetrievedDocument[]>;
/**
 * Retrieve relevant documents with minimum similarity threshold
 * @param query - The search query
 * @param topK - Number of top results to return
 * @param minSimilarity - Minimum similarity threshold (0-1)
 * @returns Promise<RetrievedDocument[]> - Array of retrieved documents above threshold
 */
export declare function retrieveRelevantDocsWithThreshold(query: string, topK?: number, minSimilarity?: number): Promise<RetrievedDocument[]>;
/**
 * Retrieve documents by product ID
 * @param productId - The product ID
 * @param sourceType - Optional source type filter
 * @returns Promise<RetrievedDocument[]> - Array of documents for the product
 */
export declare function retrieveDocsByProduct(productId: string, sourceType?: string): Promise<RetrievedDocument[]>;
/**
 * Search for products by text query
 * @param query - The search query
 * @param topK - Number of results to return
 * @returns Promise<any[]> - Array of products with relevance scores
 */
export declare function searchProducts(query: string, topK?: number): Promise<any[]>;
/**
 * Get context text from retrieved documents
 * @param docs - Array of retrieved documents
 * @returns string - Formatted context text
 */
export declare function buildContextText(docs: RetrievedDocument[]): string;
/**
 * Get context text with similarity scores
 * @param docs - Array of retrieved documents
 * @returns string - Formatted context text with scores
 */
export declare function buildContextTextWithScores(docs: RetrievedDocument[]): string;
/**
 * Validate that the retrieval system is working
 * @returns Promise<boolean> - True if retrieval is working
 */
export declare function validateRetrieval(): Promise<boolean>;
/**
 * Get statistics about the embeddings database
 * @returns Promise<any> - Database statistics
 */
export declare function getEmbeddingsStats(): Promise<any>;
//# sourceMappingURL=retrieval.d.ts.map