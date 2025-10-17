import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadFile, createProduct } from '../lib/supabaseClient.js';
import { getEmbedding } from '../lib/openaiClient.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/json',
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed types: CSV, JSON, PDF, images'));
    }
  }
});

/**
 * POST /api/upload/products
 * Upload and process product data files
 */
router.post('/api/upload/products', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const results = [];
    
    for (const file of files) {
      try {
        const result = await processUploadedFile(file);
        results.push({
          filename: file.originalname,
          status: 'success',
          ...result
        });
      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        results.push({
          filename: file.originalname,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    res.json({
      message: 'Files processed',
      results
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process uploaded files'
    });
  }
});

/**
 * POST /api/upload/product-data
 * Upload product data directly (JSON)
 */
router.post('/api/upload/product-data', async (req, res) => {
  try {
    const { products } = req.body;
    
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Products array is required' });
    }
    
    const results = [];
    
    for (const productData of products) {
      try {
        const product = await createProduct(productData);
        
        // Generate embeddings for product description
        if (productData.description) {
          const embedding = await getEmbedding(productData.description);
          
          // Store embedding in database
          const { supabaseAdmin } = await import('../lib/supabaseClient.js');
          await supabaseAdmin.from('embeddings').insert({
            product_id: product.id,
            source_type: 'description',
            text_snippet: productData.description,
            embedding: embedding,
            metadata: { chunk_index: 0, is_auto_generated: true }
          });
        }
        
        results.push({
          product_id: product.id,
          name: product.name,
          status: 'success'
        });
        
      } catch (error) {
        console.error(`Error creating product ${productData.name}:`, error);
        results.push({
          name: productData.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    res.json({
      message: 'Products processed',
      results
    });
    
  } catch (error) {
    console.error('Product data upload error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process product data'
    });
  }
});

/**
 * POST /api/upload/images
 * Upload product images
 */
router.post('/api/upload/images', upload.array('images', 20), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { productId } = req.body;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    
    const results = [];
    
    for (const file of files) {
      try {
        // Upload to Supabase Storage
        const filePath = `products/${productId}/${file.filename}`;
        const fileBuffer = fs.readFileSync(file.path);
        const publicUrl = await uploadFile('product-images', filePath, fileBuffer);
        
        // Save image record to database
        const { supabaseAdmin } = await import('../lib/supabaseClient.js');
        const { data, error } = await supabaseAdmin
          .from('product_images')
          .insert({
            product_id: productId,
            image_url: publicUrl,
            alt_text: file.originalname,
            is_primary: results.length === 0 // First image is primary
          })
          .select()
          .single();
        
        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }
        
        results.push({
          filename: file.originalname,
          image_url: publicUrl,
          status: 'success'
        });
        
        // Clean up local file
        fs.unlinkSync(file.path);
        
      } catch (error) {
        console.error(`Error uploading image ${file.originalname}:`, error);
        results.push({
          filename: file.originalname,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    res.json({
      message: 'Images uploaded',
      results
    });
    
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to upload images'
    });
  }
});

/**
 * Process uploaded file based on type
 */
async function processUploadedFile(file: Express.Multer.File): Promise<any> {
  const filePath = file.path;
  const fileType = file.mimetype;
  
  switch (fileType) {
    case 'text/csv':
      return await processCSVFile(filePath);
    
    case 'application/json':
      return await processJSONFile(filePath);
    
    case 'application/pdf':
      return await processPDFFile(filePath);
    
    case 'image/jpeg':
    case 'image/png':
    case 'image/webp':
      return await processImageFile(filePath, file.originalname);
    
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Process CSV file
 */
async function processCSVFile(filePath: string): Promise<any> {
  // This would typically use a CSV parsing library like csv-parser
  // For now, we'll return a placeholder
  return {
    type: 'csv',
    message: 'CSV processing not implemented yet',
    records: 0
  };
}

/**
 * Process JSON file
 */
async function processJSONFile(filePath: string): Promise<any> {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    if (Array.isArray(data)) {
      // Process array of products
      const results = [];
      for (const product of data) {
        const created = await createProduct(product);
        results.push(created);
      }
      return {
        type: 'json',
        message: 'JSON products processed',
        records: results.length
      };
    } else {
      // Single product
      const created = await createProduct(data);
      return {
        type: 'json',
        message: 'JSON product processed',
        records: 1,
        product: created
      };
    }
  } catch (error) {
    throw new Error(`JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process PDF file
 */
async function processPDFFile(filePath: string): Promise<any> {
  // This would typically use a PDF parsing library like pdf-parse
  // For now, we'll return a placeholder
  return {
    type: 'pdf',
    message: 'PDF processing not implemented yet',
    pages: 0
  };
}

/**
 * Process image file
 */
async function processImageFile(filePath: string, originalName: string): Promise<any> {
  // Upload to Supabase Storage
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = `${Date.now()}-${originalName}`;
  const publicUrl = await uploadFile('product-images', fileName, fileBuffer);
  
  return {
    type: 'image',
    message: 'Image uploaded',
    image_url: publicUrl
  };
}

/**
 * GET /api/upload/status
 * Get upload status and statistics
 */
router.get('/api/upload/status', async (req, res) => {
  try {
    const { getEmbeddingsStats } = await import('../lib/retrieval.js');
    const { getProducts } = await import('../lib/supabaseClient.js');
    
    const [stats, products] = await Promise.all([
      getEmbeddingsStats(),
      getProducts()
    ]);
    
    res.json({
      embeddings: stats,
      products: {
        total: products.length,
        categories: [...new Set(products.map(p => p.category))].filter(Boolean)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get upload status'
    });
  }
});

export default router;
