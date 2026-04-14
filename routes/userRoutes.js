import express from 'express';
import { getWishlist, toggleWishlistItem } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // All user routes are protected

router.route('/wishlist')
  .get(getWishlist);

router.route('/wishlist/:id')
  .post(toggleWishlistItem);

export default router;
