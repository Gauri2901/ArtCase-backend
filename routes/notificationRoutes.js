import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getMyNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '../controllers/notificationController.js';

const router = express.Router();

router.get('/mine', protect, getMyNotifications);
router.patch('/mine/read-all', protect, markAllNotificationsAsRead);
router.patch('/mine/:id/read', protect, markNotificationAsRead);

export default router;
