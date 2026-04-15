import express from 'express';
import { 
  getWishlist, 
  toggleWishlistItem, 
  getAddresses, 
  addAddress, 
  updateAddress, 
  deleteAddress, 
  setDefaultAddress 
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // All user routes are protected

router.route('/wishlist')
  .get(getWishlist);

router.route('/wishlist/:id')
  .post(toggleWishlistItem);

router.route('/addresses')
  .get(getAddresses)
  .post(addAddress);

router.route('/addresses/:id')
  .put(updateAddress)
  .delete(deleteAddress);

router.patch('/addresses/:id/default', setDefaultAddress);

export default router;
