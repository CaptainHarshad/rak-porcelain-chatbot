import { supabaseAdmin } from './supabaseClient';
import { getEmbedding } from './openaiClient';

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
export async function retrieveRelevantDocs(
  query: string, 
  topK: number = 5
): Promise<RetrievedDocument[]> {
  try {
    // Get embedding for the query
    const queryEmbedding = await getEmbedding(query);
    
    // Use the match_embeddings function to find similar documents
    const { data, error } = await supabaseAdmin.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_count: topK
    });
    
    if (error) {
      throw new Error(`Vector search error: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error retrieving relevant docs:', error);
    throw new Error(`Failed to retrieve relevant documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retrieve relevant documents with minimum similarity threshold
 * @param query - The search query
 * @param topK - Number of top results to return
 * @param minSimilarity - Minimum similarity threshold (0-1)
 * @returns Promise<RetrievedDocument[]> - Array of retrieved documents above threshold
 */
export async function retrieveRelevantDocsWithThreshold(
  query: string,
  topK: number = 5,
  minSimilarity: number = 0.7
): Promise<RetrievedDocument[]> {
  try {
    const docs = await retrieveRelevantDocs(query, topK);
    return docs.filter(doc => doc.similarity >= minSimilarity);
  } catch (error) {
    console.error('Error retrieving docs with threshold:', error);
    throw error;
  }
}

/**
 * Retrieve documents by product ID
 * @param productId - The product ID
 * @param sourceType - Optional source type filter
 * @returns Promise<RetrievedDocument[]> - Array of documents for the product
 */
export async function retrieveDocsByProduct(
  productId: string,
  sourceType?: string
): Promise<RetrievedDocument[]> {
  try {
    let query = supabaseAdmin
      .from('embeddings')
      .select('*')
      .eq('product_id', productId);
    
    if (sourceType) {
      query = query.eq('source_type', sourceType);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to retrieve docs by product: ${error.message}`);
    }
    
    return (data || []).map(doc => ({
      product_id: doc.product_id,
      source_type: doc.source_type,
      source_id: doc.source_id,
      text_snippet: doc.text_snippet,
      similarity: 1.0, // No similarity score for direct product queries
      metadata: doc.metadata
    }));
  } catch (error) {
    console.error('Error retrieving docs by product:', error);
    throw error;
  }
}

/**
 * Search for products by text query
 * @param query - The search query
 * @param topK - Number of results to return
 * @returns Promise<any[]> - Array of products with relevance scores
 */
export async function searchProducts(
  query: string,
  topK: number = 10
): Promise<any[]> {
  try {
    const docs = await retrieveRelevantDocs(query, topK);
    
    // Group documents by product_id and get unique products
    const productMap = new Map();
    
    for (const doc of docs) {
      if (!productMap.has(doc.product_id)) {
        productMap.set(doc.product_id, {
          product_id: doc.product_id,
          max_similarity: doc.similarity,
          relevant_snippets: []
        });
      }
      
      const product = productMap.get(doc.product_id);
      product.relevant_snippets.push({
        source_type: doc.source_type,
        text_snippet: doc.text_snippet,
        similarity: doc.similarity
      });
      
      if (doc.similarity > product.max_similarity) {
        product.max_similarity = doc.similarity;
      }
    }
    
    // Convert to array and sort by similarity
    return Array.from(productMap.values())
      .sort((a, b) => b.max_similarity - a.max_similarity);
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
}

/**
 * Get context text from retrieved documents
 * @param docs - Array of retrieved documents
 * @returns string - Formatted context text
 */
export function buildContextText(docs: RetrievedDocument[]): string {
  return docs
    .map((doc, index) => {
      const provenance = `[Product: ${doc.product_id}, Source: ${doc.source_type}${doc.source_id ? `, ID: ${doc.source_id}` : ''}]`;
      return `${provenance}\n${doc.text_snippet}`;
    })
    .join('\n\n');
}

/**
 * Get context text with similarity scores
 * @param docs - Array of retrieved documents
 * @returns string - Formatted context text with scores
 */
export function buildContextTextWithScores(docs: RetrievedDocument[]): string {
  return docs
    .map((doc, index) => {
      const provenance = `[Product: ${doc.product_id}, Source: ${doc.source_type}${doc.source_id ? `, ID: ${doc.source_id}` : ''}, Similarity: ${doc.similarity.toFixed(3)}]`;
      return `${provenance}\n${doc.text_snippet}`;
    })
    .join('\n\n');
}

/**
 * Validate that the retrieval system is working
 * @returns Promise<boolean> - True if retrieval is working
 */
export async function validateRetrieval(): Promise<boolean> {
  try {
    // Test with a simple query
    const docs = await retrieveRelevantDocs('test query', 1);
    return true;
  } catch (error) {
    console.error('Retrieval validation failed:', error);
    return false;
  }
}

/**
 * Get statistics about the embeddings database
 * @returns Promise<any> - Database statistics
 */
export async function getEmbeddingsStats(): Promise<any> {
  try {
    const { data, error } = await supabaseAdmin
      .from('embeddings')
      .select('source_type, product_id')
      .limit(1000); // Get a sample for stats
    
    if (error) {
      throw new Error(`Failed to get embeddings stats: ${error.message}`);
    }
    
    const stats: any = {
      total_embeddings: data?.length || 0,
      source_types: {},
      products: new Set()
    };
    
    data?.forEach(doc => {
      const sourceType = doc.source_type as string;
      stats.source_types[sourceType] = (stats.source_types[sourceType] || 0) + 1;
      stats.products.add(doc.product_id);
    });
    
    (stats as any).unique_products = stats.products.size;
    delete (stats as any).products; // Remove the Set object
    
    return stats;
  } catch (error) {
    console.error('Error getting embeddings stats:', error);
    throw error;
  }
}
