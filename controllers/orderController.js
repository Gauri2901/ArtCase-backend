import Order from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import { ensureInvoiceForOrder } from '../utils/invoiceService.js';

const normalizeOrder = (orderDocument) => {
  const order = orderDocument.toObject ? orderDocument.toObject() : orderDocument;
  const artworkSubtotal =
    order.artworks?.reduce((sum, artwork) => sum + Number(artwork.price || 0) * Number(artwork.quantity || 1), 0)
    ?? 0;
  const paymentAmount = Number(order.payment?.amount || 0);
  const storedSubtotal = Number(order.pricing?.subtotal ?? 0);
  const storedDiscount = Number(order.pricing?.discount ?? 0);
  const storedShipping = Number(order.pricing?.shipping ?? 0);
  const storedTotal = Number(order.pricing?.total ?? 0);

  const subtotal = storedSubtotal > 0 ? storedSubtotal : artworkSubtotal > 0 ? artworkSubtotal : paymentAmount;
  const total = storedTotal > 0 ? storedTotal : paymentAmount > 0 ? paymentAmount : subtotal + storedShipping - storedDiscount;

  return {
    ...order,
    user: {
      ...order.user,
      phone: order.user?.phone || '',
    },
    pricing: {
      subtotal,
      discount: storedDiscount,
      shipping: storedShipping,
      total,
      currency: order.pricing?.currency || order.payment?.currency || 'INR',
    },
    invoice: {
      invoiceNumber: order.invoice?.invoiceNumber || `INV-${order.orderId}`,
      issuedAt: order.invoice?.issuedAt || order.placedAt,
      pdfUrl: order.invoice?.pdfUrl || '',
    },
  };
};

const findAuthorizedOrder = async ({ orderId, user }) => {
  const order = await Order.findById(orderId);

  if (!order) {
    return null;
  }

  if (user?.isAdmin) {
    return order;
  }

  if (order.user?.account && String(order.user.account) === String(user?._id)) {
    return order;
  }

  return undefined;
};

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

    res.status(200).json(orders.map(normalizeOrder));
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

    res.status(200).json(orders.map(normalizeOrder));
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
      orders: unreadOrders.map(normalizeOrder),
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

export const getOrderInvoice = async (req, res) => {
  try {
    const order = await findAuthorizedOrder({ orderId: req.params.id, user: req.user });

    if (order === null) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order === undefined) {
      return res.status(403).json({ message: 'Not authorized to access this invoice' });
    }

    const existingInvoice = await Invoice.findOne({ order: order._id });
    const invoiceResult = existingInvoice?.pdf?.url
      ? { invoice: existingInvoice, pdfBuffer: null, fileName: existingInvoice.pdf.fileName }
      : await ensureInvoiceForOrder(order);

    if (!order.invoice) {
      order.invoice = {};
    }

    order.invoice.invoiceNumber = invoiceResult.invoice.invoiceNumber;
    order.invoice.issuedAt = invoiceResult.invoice.pdf.generatedAt;
    order.invoice.pdfUrl = invoiceResult.invoice.pdf.url;
    await order.save();

    res.status(200).json({
      invoiceId: invoiceResult.invoice._id,
      invoiceNumber: invoiceResult.invoice.invoiceNumber,
      fileName: invoiceResult.invoice.pdf.fileName,
      issuedAt: invoiceResult.invoice.pdf.generatedAt,
      downloadUrl: invoiceResult.invoice.pdf.url,
      bytes: invoiceResult.invoice.pdf.bytes,
    });
  } catch (error) {
    console.error('getOrderInvoice error:', error);
    res.status(500).json({ message: error.message });
  }
};
