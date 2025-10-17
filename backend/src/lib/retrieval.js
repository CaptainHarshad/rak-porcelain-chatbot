"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieveRelevantDocs = retrieveRelevantDocs;
exports.retrieveRelevantDocsWithThreshold = retrieveRelevantDocsWithThreshold;
exports.retrieveDocsByProduct = retrieveDocsByProduct;
exports.searchProducts = searchProducts;
exports.buildContextText = buildContextText;
exports.buildContextTextWithScores = buildContextTextWithScores;
exports.validateRetrieval = validateRetrieval;
exports.getEmbeddingsStats = getEmbeddingsStats;
const supabaseClient_1 = require("./supabaseClient");
const openaiClient_1 = require("./openaiClient");
/**
 * Retrieve relevant documents using vector similarity search
 * @param query - The search query
 * @param topK - Number of top results to return (default: 5)
 * @returns Promise<RetrievedDocument[]> - Array of retrieved documents
 */
async function retrieveRelevantDocs(query, topK = 5) {
    try {
        // Get embedding for the query
        const queryEmbedding = await (0, openaiClient_1.getEmbedding)(query);
        // Use the match_embeddings function to find similar documents
        const { data, error } = await supabaseClient_1.supabaseAdmin.rpc('match_embeddings', {
            query_embedding: queryEmbedding,
            match_count: topK
        });
        if (error) {
            throw new Error(`Vector search error: ${error.message}`);
        }
        return data || [];
    }
    catch (error) {
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
async function retrieveRelevantDocsWithThreshold(query, topK = 5, minSimilarity = 0.7) {
    try {
        const docs = await retrieveRelevantDocs(query, topK);
        return docs.filter(doc => doc.similarity >= minSimilarity);
    }
    catch (error) {
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
async function retrieveDocsByProduct(productId, sourceType) {
    try {
        let query = supabaseClient_1.supabaseAdmin
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
    }
    catch (error) {
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
async function searchProducts(query, topK = 10) {
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
    }
    catch (error) {
        console.error('Error searching products:', error);
        throw error;
    }
}
/**
 * Get context text from retrieved documents
 * @param docs - Array of retrieved documents
 * @returns string - Formatted context text
 */
function buildContextText(docs) {
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
function buildContextTextWithScores(docs) {
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
async function validateRetrieval() {
    try {
        // Test with a simple query
        const docs = await retrieveRelevantDocs('test query', 1);
        return true;
    }
    catch (error) {
        console.error('Retrieval validation failed:', error);
        return false;
    }
}
/**
 * Get statistics about the embeddings database
 * @returns Promise<any> - Database statistics
 */
async function getEmbeddingsStats() {
    try {
        const { data, error } = await supabaseClient_1.supabaseAdmin
            .from('embeddings')
            .select('source_type, product_id')
            .limit(1000); // Get a sample for stats
        if (error) {
            throw new Error(`Failed to get embeddings stats: ${error.message}`);
        }
        const stats = {
            total_embeddings: data?.length || 0,
            source_types: {},
            products: new Set()
        };
        data?.forEach(doc => {
            stats.source_types[doc.source_type] = (stats.source_types[doc.source_type] || 0) + 1;
            stats.products.add(doc.product_id);
        });
        stats.unique_products = stats.products.size;
        delete stats.products; // Remove the Set object
        return stats;
    }
    catch (error) {
        console.error('Error getting embeddings stats:', error);
        throw error;
    }
}
//# sourceMappingURL=retrieval.js.map