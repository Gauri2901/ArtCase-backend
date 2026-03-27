import express from 'express';
import { admin, protect } from '../middleware/authMiddleware.js';
import { getUploadLogById, getUploadLogs } from '../controllers/logController.js';

const router = express.Router();

router.get('/', protect, admin, getUploadLogs);
router.get('/:id', protect, admin, getUploadLogById);

export default router;
