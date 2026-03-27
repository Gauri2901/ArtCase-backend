import express from 'express';
import { admin, protect } from '../middleware/authMiddleware.js';
import { getOrders, getUnreadOrders, markOrdersAsRead } from '../controllers/orderController.js';

const router = express.Router();

router.get('/', protect, admin, getOrders);
router.get('/unread', protect, admin, getUnreadOrders);
router.patch('/mark-read', protect, admin, markOrdersAsRead);

export default router;
