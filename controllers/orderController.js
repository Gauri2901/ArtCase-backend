import Order from '../models/Order.js';

const buildOrderFilters = (query) => {
  const filters = {};

  // Filter by payment status
  if (query.status && query.status !== 'all') {
    filters['payment.status'] = query.status;
  }

  // Search by user or orderId
  if (query.user && query.user !== 'all') {
    const userRegex = new RegExp(query.user, 'i');
    filters.$or = [
      { 'user.name': userRegex },
      { 'user.email': userRegex },
      { orderId: userRegex },
    ];
  }

  // Filter by date range
  if (query.dateFrom || query.dateTo) {
    filters.placedAt = {};

    if (query.dateFrom) {
      const fromDate = new Date(`${query.dateFrom}T00:00:00.000Z`);
      if (!isNaN(fromDate)) {
        filters.placedAt.$gte = fromDate;
      }
    }

    if (query.dateTo) {
      const toDate = new Date(`${query.dateTo}T23:59:59.999Z`);
      if (!isNaN(toDate)) {
        filters.placedAt.$lte = toDate;
      }
    }
  }

  return filters;
};



// ✅ ADMIN / ALL ORDERS
export const getOrders = async (req, res) => {
  try {
    const filters = buildOrderFilters(req.query);

    const orders = await Order.find(filters).sort({ placedAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error('getOrders error:', error);
    res.status(500).json({ message: error.message });
  }
};



// ✅ USER ORDERS (FIXED)
export const getMyOrders = async (req, res) => {
  try {
    // 🔴 IMPORTANT FIX
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Not authorized. No user found.' });
    }

    const orders = await Order.find({
      'user.account': req.user._id,
    }).sort({ placedAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error('getMyOrders error:', error);
    res.status(500).json({ message: error.message });
  }
};



// ✅ NOTIFICATIONS (UNREAD ORDERS)
export const getUnreadOrders = async (_req, res) => {
  try {
    const unreadOrders = await Order.find({ unread: true })
      .sort({ placedAt: -1 })
      .limit(5);

    const unreadCount = await Order.countDocuments({ unread: true });

    res.status(200).json({
      unreadCount,
      orders: unreadOrders,
    });
  } catch (error) {
    console.error('getUnreadOrders error:', error);
    res.status(500).json({ message: error.message });
  }
};



// ✅ MARK AS READ
export const markOrdersAsRead = async (_req, res) => {
  try {
    await Order.updateMany({ unread: true }, { unread: false });

    res.status(200).json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('markOrdersAsRead error:', error);
    res.status(500).json({ message: error.message });
  }
};