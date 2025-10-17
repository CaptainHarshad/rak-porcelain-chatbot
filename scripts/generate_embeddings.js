const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config({ path: '../.env' });

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

async function generateEmbeddingsForProducts() {
  try {
    console.log('🚀 Starting embedding generation for RAK Porcelain products...');
    
    // Get all products that don't have embeddings yet
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (productsError) {
      throw new Error(`Error fetching products: ${productsError.message}`);
    }
    
    console.log(`📦 Found ${products.length} products to process`);
    
    for (const product of products) {
      console.log(`\n🔍 Processing: ${product.name}`);
      
      // Check if embeddings already exist
      const { data: existingEmbeddings, error: checkError } = await supabase
        .from('embeddings')
        .select('id')
        .eq('product_id', product.id);
      
      if (checkError) {
        console.error(`❌ Error checking existing embeddings: ${checkError.message}`);
        continue;
      }
      
      if (existingEmbeddings && existingEmbeddings.length > 0) {
        console.log(`⏭️  Embeddings already exist for ${product.name}, skipping...`);
        continue;
      }
      
      try {
        // Generate embedding for product description
        console.log(`📝 Generating description embedding...`);
        const descriptionEmbedding = await getEmbedding(product.description);
        
        // Insert description embedding
        const { error: descError } = await supabase
          .from('embeddings')
          .insert({
            product_id: product.id,
            source_type: 'description',
            text_snippet: product.description,
            embedding: descriptionEmbedding,
            metadata: {
              collection: product.specifications?.collection || 'Unknown',
              sku: product.sku,
              category: product.category
            }
          });
        
        if (descError) {
          console.error(`❌ Error inserting description embedding: ${descError.message}`);
        } else {
          console.log(`✅ Description embedding added`);
        }
        
        // Generate embedding for specifications
        const specsText = `Specifications: Material: ${product.specifications?.material || 'Unknown'}, Colors: ${product.specifications?.colors?.join(', ') || 'Unknown'}, Pieces: ${product.specifications?.pieces || 'Unknown'}, Collection: ${product.specifications?.collection || 'Unknown'}, Price: $${product.price}`;
        
        console.log(`📝 Generating specifications embedding...`);
        const specsEmbedding = await getEmbedding(specsText);
        
        // Insert specifications embedding
        const { error: specsError } = await supabase
          .from('embeddings')
          .insert({
            product_id: product.id,
            source_type: 'specification',
            text_snippet: specsText,
            embedding: specsEmbedding,
            metadata: {
              collection: product.specifications?.collection || 'Unknown',
              sku: product.sku,
              category: product.category
            }
          });
        
        if (specsError) {
          console.error(`❌ Error inserting specifications embedding: ${specsError.message}`);
        } else {
          console.log(`✅ Specifications embedding added`);
        }
        
        // Generate embedding for product name and category
        const nameText = `Product: ${product.name}, Category: ${product.category}, SKU: ${product.sku}`;
        
        console.log(`📝 Generating name/category embedding...`);
        const nameEmbedding = await getEmbedding(nameText);
        
        // Insert name/category embedding
        const { error: nameError } = await supabase
          .from('embeddings')
          .insert({
            product_id: product.id,
            source_type: 'product_info',
            text_snippet: nameText,
            embedding: nameEmbedding,
            metadata: {
              collection: product.specifications?.collection || 'Unknown',
              sku: product.sku,
              category: product.category
            }
          });
        
        if (nameError) {
          console.error(`❌ Error inserting name embedding: ${nameError.message}`);
        } else {
          console.log(`✅ Name/category embedding added`);
        }
        
        console.log(`✅ All embeddings generated for: ${product.name}`);
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error processing ${product.name}:`, error.message);
        continue;
      }
    }
    
    console.log('\n🎉 Embedding generation completed!');
    
    // Verify the embeddings
    const { data: embeddings, error: verifyError } = await supabase
      .from('embeddings')
      .select('product_id, source_type, text_snippet')
      .limit(10);
    
    if (verifyError) {
      console.error('❌ Error verifying embeddings:', verifyError.message);
    } else {
      console.log('\n📊 Sample embeddings generated:');
      embeddings.forEach(e => {
        console.log(`  - ${e.source_type}: ${e.text_snippet.substring(0, 60)}...`);
      });
    }
    
    // Get embedding statistics
    const { data: stats, error: statsError } = await supabase
      .from('embeddings')
      .select('source_type')
      .then(result => {
        if (result.error) throw result.error;
        const counts = {};
        result.data.forEach(e => {
          counts[e.source_type] = (counts[e.source_type] || 0) + 1;
        });
        return { data: counts };
      });
    
    if (statsError) {
      console.error('❌ Error getting stats:', statsError.message);
    } else {
      console.log('\n📈 Embedding statistics:');
      Object.entries(stats).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count} embeddings`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during embedding generation:', error.message);
  }
}

// Run the embedding generation
generateEmbeddingsForProducts();
