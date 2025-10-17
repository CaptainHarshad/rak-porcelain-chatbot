import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getEmbedding(text) {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
        input: text
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    throw error;
  }
}

async function addProductsToDatabase() {
  try {
    console.log('🚀 Starting RAK Porcelain product import...');
    
    // Read the product dataset
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const datasetPath = path.join(__dirname, 'rak_products_dataset.json');
    const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    
    console.log(`📦 Found ${dataset.products.length} products to import`);
    
    // Add products to database
    for (const product of dataset.products) {
      console.log(`\n📝 Adding product: ${product.name}`);
      
      // Insert product
      const { data: insertedProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name: product.name,
          description: product.description,
          category: product.category,
          sku: product.sku,
          price: product.price,
          specifications: product.specifications
        })
        .select()
        .single();
      
      if (productError) {
        console.error(`❌ Error adding product ${product.name}:`, productError.message);
        continue;
      }
      
      console.log(`✅ Product added with ID: ${insertedProduct.id}`);
      
      // Generate embedding for product description
      console.log(`🔍 Generating embedding for: ${product.name}`);
      try {
        const embedding = await getEmbedding(product.description);
        
        // Insert embedding
        const { error: embeddingError } = await supabase
          .from('embeddings')
          .insert({
            product_id: insertedProduct.id,
            source_type: 'description',
            text_snippet: product.description,
            embedding: embedding,
            metadata: {
              collection: product.specifications.collection,
              sku: product.sku,
              category: product.category
            }
          });
        
        if (embeddingError) {
          console.error(`❌ Error adding embedding for ${product.name}:`, embeddingError.message);
        } else {
          console.log(`✅ Embedding added for: ${product.name}`);
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (embeddingError) {
        console.error(`❌ Error generating embedding for ${product.name}:`, embeddingError.message);
        continue;
      }
    }
    
    console.log('\n🎉 All products imported successfully!');
    
    // Verify the import
    const { data: products, error: verifyError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (verifyError) {
      console.error('❌ Error verifying import:', verifyError.message);
    } else {
      console.log('\n📊 Recent products in database:');
      products.forEach(p => {
        console.log(`  - ${p.name} (${p.sku}) - $${p.price}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during import:', error.message);
  }
}

// Run the import
addProductsToDatabase();
