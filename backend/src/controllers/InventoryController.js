import { Product } from '../models/Product.js';
import { Inventory } from '../models/Inventory.js';

export const InventoryController = {
  // Get inventory stats
  getInventoryStats: async (req, res) => {
    try {
      const stats = await Inventory.getStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Get products with inventory information
  getProductsWithInventory: async (req, res) => {
    try {
      const { search, category, status } = req.query;
      const filters = {
        search,
        category,
        stockStatus: status
      };

      const products = await Inventory.getProductsWithInventory(filters);

      res.json({
        success: true,
        data: {
          products
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Update product stock
  updateStock: async (req, res) => {
    try {
      const { id } = req.params; // This will be the product_id (e.g., PRD-006)
      const { quantityToAdd, reorderPoint, notes, createdBy, transactionDate, supplierId } = req.body;


      // Find product by product_id
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      await Inventory.updateStock(id, parseInt(quantityToAdd) || 0, reorderPoint, {
        notes,
        createdBy,
        transactionDate,
        supplierId
      });

      // Get updated inventory data
      const updatedInventory = await Inventory.findByProductId(id);

      res.json({
        success: true,
        message: 'Stock updated successfully',
        data: {
          ...product,
          ...updatedInventory
        }
      });
    } catch (error) {
      console.error('✗ Stock update error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Bulk stock in for multiple products
  bulkStockIn: async (req, res) => {
    try {
      const { supplier, receivedBy, serialNumber, products } = req.body;

      if (!products || products.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No products provided'
        });
      }

      if (!supplier || !receivedBy) {
        return res.status(400).json({
          success: false,
          message: 'Supplier and receivedBy are required'
        });
      }

      await Inventory.bulkStockIn({
        supplier,
        receivedBy,
        serialNumber,
        products
      });

      res.json({
        success: true,
        message: `Successfully updated stock for ${products.length} product(s)`
      });
    } catch (error) {
      console.error('Bulk stock in error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process bulk stock in'
      });
    }
  },

  // Return to supplier for multiple products
  returnToSupplier: async (req, res) => {
    try {
      const { supplier, returnedBy, returnDate, products, reason } = req.body;

      if (!products || products.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No products provided'
        });
      }

      if (!supplier || !returnedBy) {
        return res.status(400).json({
          success: false,
          message: 'Supplier and returnedBy are required'
        });
      }

      await Inventory.returnToSupplier({
        supplier,
        returnedBy,
        returnDate,
        products,
        reason
      });

      res.json({
        success: true,
        message: `Successfully returned ${products.length} product(s) to supplier`
      });
    } catch (error) {
      console.error('Return to supplier error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process return to supplier'
      });
    }
  }
};