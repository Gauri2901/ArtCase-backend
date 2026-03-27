import Product from '../models/Product.js';
import Order from '../models/Order.js';

export const getAdminStats = async (_req, res) => {
  try {
    const [totalArtworks, totalOrders, unreadOrders] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ unread: true }),
    ]);

    res.json({
      totalArtworks,
      totalOrders,
      unreadOrders,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
