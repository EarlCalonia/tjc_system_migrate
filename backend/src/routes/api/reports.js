import express from 'express';
import { ReportsController } from '../../controllers/ReportsController.js';

const router = express.Router();

// Get sales report data with pagination and filtering
router.get('/sales', ReportsController.getSalesReport);

// Get inventory report data with pagination and filtering
router.get('/inventory', ReportsController.getInventoryReport);

// Get filter options (brands and categories)
router.get('/filter-options', ReportsController.getFilterOptions);

router.get('/returns', ReportsController.getReturnsReport);

export default router;
