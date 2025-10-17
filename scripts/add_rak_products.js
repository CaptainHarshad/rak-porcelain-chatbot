const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Mock OpenAI embedding function for now (you'll need to implement this)
async function getEmbedding(text) {
  // For now, return a placeholder embedding
  // In production, you'd call the actual OpenAI API
  const embedding = new Array(1536).fill(0).map(() => Math.random() - 0.5);
  return embedding;
}

async function addProductsToDatabase() {
  try {
    console.log('🚀 Starting RAK Porcelain product import...');
    
    // Read the product dataset
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
      
      // Add additional embeddings for specifications
      const specsText = `Specifications: Material: ${product.specifications.material}, Colors: ${product.specifications.colors.join(', ')}, Pieces: ${product.specifications.pieces}, Collection: ${product.specifications.collection}`;
      const specsEmbedding = await getEmbedding(specsText);
      
      await supabase
        .from('embeddings')
        .insert({
          product_id: insertedProduct.id,
          source_type: 'specification',
          text_snippet: specsText,
          embedding: specsEmbedding,
          metadata: {
            collection: product.specifications.collection,
            sku: product.sku,
            category: product.category
          }
        });
      
      console.log(`✅ Specifications embedding added for: ${product.name}`);
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
    
    // Check embeddings
    const { data: embeddings, error: embeddingsError } = await supabase
      .from('embeddings')
      .select('product_id, source_type, text_snippet')
      .limit(5);
    
    if (embeddingsError) {
      console.error('❌ Error checking embeddings:', embeddingsError.message);
    } else {
      console.log('\n🔍 Sample embeddings:');
      embeddings.forEach(e => {
        console.log(`  - ${e.source_type}: ${e.text_snippet.substring(0, 50)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during import:', error.message);
  }
}

// Run the import
addProductsToDatabase();
