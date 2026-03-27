import express from 'express';
import { admin, protect } from '../middleware/authMiddleware.js';
import { getAdminStats } from '../controllers/adminController.js';

const router = express.Router();

router.get('/stats', protect, admin, getAdminStats);

export default router;
