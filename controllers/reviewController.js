import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

// @desc    Create new review
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req, res) => {
  const { rating, comment, title, productId, orderId } = req.body;

  try {
    // 1. Check if order exists and belongs to user
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.email !== req.user.email) {
      return res.status(401).json({ message: 'Not authorized to review this order' });
    }

    // 2. Check if order is paid
    if (order.payment.status !== 'paid') {
      return res.status(400).json({ message: 'You can only review paid orders' });
    }

    // 3. Check if product exists in order
    const hasProduct = order.artworks.some((item) => item.artwork.toString() === productId);
    if (!hasProduct) {
      return res.status(400).json({ message: 'Product not found in this order' });
    }

    // 4. Check if already reviewed
    const alreadyReviewed = await Review.findOne({
      user: req.user._id,
      product: productId,
      order: orderId,
    });

    if (alreadyReviewed) {
      return res.status(400).json({ message: 'Product already reviewed for this order' });
    }

    // 5. Create review
    const review = await Review.create({
      user: req.user._id,
      product: productId,
      order: orderId,
      name: req.user.name,
      rating: Number(rating),
      comment,
      title,
      isVerifiedPurchase: true,
    });

    // 6. Update product rating & numReviews
    const product = await Product.findById(productId);
    const reviews = await Review.find({ product: productId });

    product.numReviews = reviews.length;
    product.rating =
      reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;

    await product.save();

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get reviews for a product
// @route   GET /api/reviews/product/:id
// @access  Public
export const getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.id })
      .sort({ createdAt: -1 })
      .populate('user', 'name');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's reviews
// @route   GET /api/reviews/mine
// @access  Private
export const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('product', 'title imageUrl');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
