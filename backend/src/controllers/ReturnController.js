import { Return } from '../models/Return.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'src/uploads/returns';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `return-${Date.now()}-${Math.floor(Math.random() * 10000)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export const uploadReturnPhoto = upload.single('photoProof');

export const ReturnController = {
  // Process a return
  processReturn: async (req, res) => {
    try {
      const {
        orderId,
        saleNumber,
        customerName,
        returnReason,
        refundMethod,
        restocked,
        additionalNotes,
        returnItems: returnItemsString
      } = req.body;
      
      // Parse returnItems from JSON string (FormData sends it as string)
      const returnItems = JSON.parse(returnItemsString || '[]');
      
      // Get photo proof path if uploaded
      const photoProof = req.file ? `/uploads/returns/${req.file.filename}` : null;

      // Validation
      if (!orderId || !returnReason || !refundMethod || !returnItems || returnItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Validate at least one item has quantity > 0
      const hasValidItems = returnItems.some(item => item.quantity > 0);
      if (!hasValidItems) {
        return res.status(400).json({
          success: false,
          message: 'At least one item must have quantity greater than 0'
        });
      }

      // Get processed by from session/auth (for now use a default or from body)
      const processedBy = req.body.processedBy || req.user?.username || 'Admin';

      const result = await Return.processReturn({
        orderId,
        saleNumber,
        customerName,
        returnReason,
        refundMethod,
        restocked: restocked !== false, // Default to true
        photoProof,
        additionalNotes,
        processedBy,
        returnItems
      });

      res.json({
        success: true,
        message: 'Return processed successfully',
        data: result
      });
    } catch (error) {
      console.error('Process return error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process return'
      });
    }
  },

  // Get return history for an order
  getReturnsByOrder: async (req, res) => {
    try {
      const { orderId } = req.params;

      const returns = await Return.getReturnsByOrderId(orderId);

      res.json({
        success: true,
        data: returns
      });
    } catch (error) {
      console.error('Get returns error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch returns'
      });
    }
  },

  // Get all returns with filters
  getAllReturns: async (req, res) => {
    try {
      const { startDate, endDate, returnReason, limit, offset } = req.query;

      const filters = {
        startDate,
        endDate,
        returnReason,
        limit: limit || 50,
        offset: offset || 0
      };

      const returns = await Return.getAllReturns(filters);

      res.json({
        success: true,
        data: returns
      });
    } catch (error) {
      console.error('Get all returns error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch returns'
      });
    }
  },

  // Get return statistics
  getReturnStats: async (req, res) => {
    try {
      const stats = await Return.getReturnStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get return stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch return statistics'
      });
    }
  }
};
