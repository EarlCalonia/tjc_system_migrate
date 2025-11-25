import { Product } from '../models/Product.js';

export class ProductController {
  // Get all products with server-side pagination
  static async getAllProducts(req, res) {
    try {
      // 1. Parse Query Parameters
      const { search, category, brand, status } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const filters = {
        search,
        category,
        brand,
        status
      };

      // 2. Call the Model
      // NOTE: Product.findAll must be updated to accept (filters, limit, offset)
      // and return an object: { products: [...], total: 13 }
      const result = await Product.findAll(filters, limit, offset);

      // Handle response structure (Support if model returns object or just array)
      const products = result.products || result || [];
      const totalCount = result.total || products.length;

      res.json({
        success: true,
        data: {
          products: products, // This is the specific 10 items
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalProducts: totalCount, // This will now show the REAL total (e.g., 13)
            hasNextPage: (page * limit) < totalCount,
            hasPrevPage: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch products',
        error: error.message
      });
    }
  }

  // Get product by ID
  static async getProductById(req, res) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product',
        error: error.message
      });
    }
  }

  // Create new product
  static async createProduct(req, res) {
    try {
      const productData = req.body;
      productData.image = req.file ? `/uploads/${req.file.filename}` : null;
      productData.requires_serial = req.body.requires_serial === 'true';

      const productId = await Product.create(productData);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { id: productId }
      });
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create product',
        error: error.message
      });
    }
  }

  // Update product
  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const productData = req.body;
      
      // Convert string 'true'/'false' to boolean
      productData.requires_serial = req.body.requires_serial === 'true';

      // --- VALIDATION BLOCK ---
      if (productData.requires_serial === false) {
        // Find the product in the database *before* updating
        const currentProduct = await Product.findById(id);
        
        // Check if the setting is being changed from true (1) to false (0)
        if (currentProduct && currentProduct.requires_serial) {
          // The user is trying to disable serial numbers.
          // Check if any serial numbers exist for this product.
          const serialsExist = await Product.hasSerialNumbers(id); 
          
          if (serialsExist) {
            throw new Error(`Cannot disable serial numbers. This product has existing serial numbers associated with it.`);
          }
        }
      }
      // --- END VALIDATION ---

      // Image handling
      if (req.file) {
        productData.image = `/uploads/${req.file.filename}`;
      } else {
        productData.image = productData.image || null;
      }
      
      const updated = await Product.update(id, productData);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.json({
        success: true,
        message: 'Product updated successfully'
      });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update product',
        error: error.message
      });
    }
  }

  // Delete product
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const deleted = await Product.delete(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      
      if (error.code === 'PRODUCT_IN_USE') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete product. This product is referenced in existing sales records.',
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete product',
        error: error.message
      });
    }
  }

  // Get categories
  static async getCategories(req, res) {
    try {
      const categories = await Product.getCategories();
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error.message
      });
    }
  }

  // Get brands
  static async getBrands(req, res) {
    try {
      const brands = await Product.getBrands();
      res.json({
        success: true,
        data: brands
      });
    } catch (error) {
      console.error('Error fetching brands:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch brands',
        error: error.message
      });
    }
  }
}