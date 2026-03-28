import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Commission from '../models/Commission.js';

export const getAdminStats = async (_req, res) => {
  try {
    const [totalArtworks, totalOrders, unreadOrders, totalCommissions, unreadCommissions] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ unread: true }),
      Commission.countDocuments(),
      Commission.countDocuments({ unread: true }),
    ]);

    res.json({
      totalArtworks,
      totalOrders,
      unreadOrders,
      totalCommissions,
      unreadCommissions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
