#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { getEmbedding, getEmbeddings } from '../backend/src/lib/openaiClient';

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ProductData {
  name: string;
  description: string;
  category?: string;
  sku?: string;
  price?: number;
  specifications?: any;
  faqs?: Array<{ question: string; answer: string }>;
  documents?: Array<{ title: string; content: string; type: string }>;
}

interface Chunk {
  text: string;
  metadata: {
    product_id: string;
    source_type: string;
    source_id?: string;
    chunk_index: number;
    [key: string]: any;
  };
}

/**
 * Chunk text into overlapping segments
 */
function chunkText(text: string, chunkSize: number = 500, overlap: number = 100): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim());
    }
  }
  
  return chunks;
}

/**
 * Process a single product and generate embeddings
 */
async function processProduct(productData: ProductData): Promise<void> {
  console.log(`Processing product: ${productData.name}`);
  
  // Create product in database
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert([{
      name: productData.name,
      description: productData.description,
      category: productData.category,
      sku: productData.sku,
      price: productData.price,
      specifications: productData.specifications
    }])
    .select()
    .single();
  
  if (productError) {
    throw new Error(`Failed to create product: ${productError.message}`);
  }
  
  console.log(`Created product with ID: ${product.id}`);
  
  // Generate chunks and embeddings
  const chunks: Chunk[] = [];
  
  // Process description
  if (productData.description) {
    const descriptionChunks = chunkText(productData.description);
    descriptionChunks.forEach((chunk, index) => {
      chunks.push({
        text: chunk,
        metadata: {
          product_id: product.id,
          source_type: 'description',
          chunk_index: index
        }
      });
    });
  }
  
  // Process FAQs
  if (productData.faqs) {
    productData.faqs.forEach((faq, faqIndex) => {
      const faqText = `Q: ${faq.question}\nA: ${faq.answer}`;
      const faqChunks = chunkText(faqText);
      faqChunks.forEach((chunk, index) => {
        chunks.push({
          text: chunk,
          metadata: {
            product_id: product.id,
            source_type: 'faq',
            source_id: `faq_${faqIndex}`,
            chunk_index: index,
            question: faq.question
          }
        });
      });
    });
  }
  
  // Process documents
  if (productData.documents) {
    productData.documents.forEach((doc, docIndex) => {
      const docText = `${doc.title}\n\n${doc.content}`;
      const docChunks = chunkText(docText);
      docChunks.forEach((chunk, index) => {
        chunks.push({
          text: chunk,
          metadata: {
            product_id: product.id,
            source_type: 'document',
            source_id: `doc_${docIndex}`,
            chunk_index: index,
            document_title: doc.title,
            document_type: doc.type
          }
        });
      });
    });
  }
  
  // Process specifications
  if (productData.specifications) {
    const specText = JSON.stringify(productData.specifications, null, 2);
    const specChunks = chunkText(specText);
    specChunks.forEach((chunk, index) => {
      chunks.push({
        text: chunk,
        metadata: {
          product_id: product.id,
          source_type: 'specification',
          chunk_index: index
        }
      });
    });
  }
  
  console.log(`Generated ${chunks.length} chunks for product: ${productData.name}`);
  
  // Generate embeddings in batches
  const batchSize = 10;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map(chunk => chunk.text);
    
    try {
      console.log(`Generating embeddings for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
      const embeddings = await getEmbeddings(texts);
      
      // Insert embeddings into database
      const embeddingRecords = batch.map((chunk, index) => ({
        product_id: chunk.metadata.product_id,
        source_type: chunk.metadata.source_type,
        source_id: chunk.metadata.source_id,
        text_snippet: chunk.text,
        embedding: embeddings[index],
        metadata: chunk.metadata
      }));
      
      const { error: embeddingError } = await supabase
        .from('embeddings')
        .insert(embeddingRecords);
      
      if (embeddingError) {
        throw new Error(`Failed to insert embeddings: ${embeddingError.message}`);
      }
      
      console.log(`Inserted ${embeddingRecords.length} embeddings`);
      
    } catch (error) {
      console.error(`Error processing batch ${Math.floor(i / batchSize) + 1}:`, error);
      throw error;
    }
  }
  
  console.log(`Successfully processed product: ${productData.name}`);
}

/**
 * Load products from JSON file
 */
function loadProductsFromFile(filePath: string): ProductData[] {
  const data = fs.readFileSync(filePath, 'utf-8');
  const products = JSON.parse(data);
  
  if (!Array.isArray(products)) {
    throw new Error('Products file must contain an array of products');
  }
  
  return products;
}

/**
 * Main ingestion function
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log('Usage: ts-node ingest_products.ts <products_file.json>');
      console.log('Example: ts-node ingest_products.ts sample_products.json');
      process.exit(1);
    }
    
    const productsFile = args[0];
    
    if (!fs.existsSync(productsFile)) {
      console.error(`Products file not found: ${productsFile}`);
      process.exit(1);
    }
    
    console.log(`Loading products from: ${productsFile}`);
    const products = loadProductsFromFile(productsFile);
    console.log(`Found ${products.length} products to process`);
    
    // Process each product
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`\n--- Processing product ${i + 1}/${products.length} ---`);
      
      try {
        await processProduct(product);
      } catch (error) {
        console.error(`Error processing product ${product.name}:`, error);
        // Continue with next product
      }
    }
    
    console.log('\n--- Ingestion Complete ---');
    console.log(`Successfully processed ${products.length} products`);
    
    // Get final statistics
    const { data: stats } = await supabase
      .from('embeddings')
      .select('count')
      .limit(1);
    
    console.log(`Total embeddings in database: ${stats?.length || 0}`);
    
  } catch (error) {
    console.error('Ingestion failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { processProduct, chunkText, loadProductsFromFile };
