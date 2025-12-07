import express from 'express';
import { ActivityLogController } from '../../controllers/ActivityLogController.js';

const router = express.Router();

router.get('/', ActivityLogController.getLogs);

export default router;