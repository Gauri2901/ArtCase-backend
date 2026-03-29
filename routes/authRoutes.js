import express from 'express';
import { registerUser, authUser, getProfile, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authUser);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

export default router;
