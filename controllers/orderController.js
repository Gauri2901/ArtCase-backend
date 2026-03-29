import Order from '../models/Order.js';

const buildOrderFilters = (query) => {
  const filters = {};

  if (query.status && query.status !== 'all') {
    filters['payment.status'] = query.status;
  }

  if (query.user && query.user !== 'all') {
    const userRegex = new RegExp(query.user, 'i');
    filters.$or = [
      { 'user.name': userRegex },
      { 'user.email': userRegex },
      { orderId: userRegex },
    ];
  }

  if (query.dateFrom || query.dateTo) {
    filters.placedAt = {};
    if (query.dateFrom) {
      filters.placedAt.$gte = new Date(`${query.dateFrom}T00:00:00.000Z`);
    }
    if (query.dateTo) {
      filters.placedAt.$lte = new Date(`${query.dateTo}T23:59:59.999Z`);
    }
  }

  return filters;
};

export const getOrders = async (req, res) => {
  try {
    const filters = buildOrderFilters(req.query);
    const orders = await Order.find(filters).sort({ placedAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ 'user.account': req.user._id }).sort({ placedAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUnreadOrders = async (_req, res) => {
  try {
    const unreadOrders = await Order.find({ unread: true })
      .sort({ placedAt: -1 })
      .limit(5);

    const unreadCount = await Order.countDocuments({ unread: true });

    res.json({
      unreadCount,
      orders: unreadOrders,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markOrdersAsRead = async (_req, res) => {
  try {
    await Order.updateMany({ unread: true }, { unread: false });
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
