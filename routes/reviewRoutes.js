import express from 'express';
import {
  createReview,
  getProductReviews,
  getMyReviews,
} from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, createReview);
router.route('/product/:id').get(getProductReviews);
router.route('/mine').get(protect, getMyReviews);

export default router;
