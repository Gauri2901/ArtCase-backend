import crypto from 'crypto';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import Commission from '../models/Commission.js';
import Order from '../models/Order.js';
import { sendCommissionApprovedEmail, sendCommissionPaymentReceivedEmail } from '../utils/email.js';
import { createUserNotification } from '../utils/notifications.js';

dotenv.config();

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const buildAppUrl = (path) => {
  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${baseUrl}${path}`;
};

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const buildCommissionPayload = (body, user) => {
  const customerName = String(body.customerName ?? body.name ?? user?.name ?? '').trim();
  const email = String(body.email ?? user?.email ?? '').trim();
  const artworkType = String(body.artworkType ?? '').trim();
  const description = String(body.description ?? '').trim();
  const sizeDetails = String(body.sizeDetails ?? '').trim();
  const budget = Number(body.budget);
  const referenceImages = Array.isArray(body.referenceImages)
    ? body.referenceImages.map((image) => String(image).trim()).filter(Boolean)
    : [];

  if (!user?._id) {
    return { error: 'Please log in to submit a commission request.' };
  }

  if (!isNonEmptyString(customerName) || !isNonEmptyString(email) || !isNonEmptyString(artworkType) || !isNonEmptyString(description) || !isNonEmptyString(sizeDetails)) {
    return { error: 'Name, email, artwork type, description, and size details are required.' };
  }

  if (Number.isNaN(budget) || budget < 0) {
    return { error: 'Please enter a valid budget.' };
  }

  return {
    customer: {
      account: user._id,
      name: customerName,
      email,
    },
    artworkType,
    description,
    sizeDetails,
    budget,
    currency: 'INR',
    referenceImages,
  };
};

const appendHistory = (commission, status, changedBy, note = '') => {
  commission.history.push({
    status,
    changedBy,
    note,
    changedAt: new Date(),
  });
};

const ensureCommissionOrder = async (commission) => {
  if (commission.convertedOrder) {
    const existingOrder = await Order.findById(commission.convertedOrder);
    if (existingOrder) {
      existingOrder.user = {
        account: commission.customer.account ?? null,
        name: commission.customer.name,
        email: commission.customer.email,
        address: '',
        city: '',
        zip: '',
      };
      existingOrder.payment.amount = commission.quotedPrice ?? commission.budget;
      existingOrder.payment.currency = commission.currency || 'INR';
      existingOrder.payment.method = 'Custom Commission';
      existingOrder.commissionDetails = {
        commission: commission._id,
        artworkType: commission.artworkType,
        description: commission.description,
        sizeDetails: commission.sizeDetails,
        referenceImages: commission.referenceImages,
        adminNotes: commission.adminNotes,
      };
      await existingOrder.save();
      return existingOrder;
    }
  }

  const order = await Order.create({
    orderId: `COM-${Date.now().toString(36).toUpperCase()}`,
    user: {
      account: commission.customer.account ?? null,
      name: commission.customer.name,
      email: commission.customer.email,
      address: '',
      city: '',
      zip: '',
    },
    orderKind: 'commission',
    payment: {
      amount: commission.quotedPrice ?? commission.budget,
      currency: commission.currency || 'INR',
      method: 'Custom Commission',
      status: 'created',
      razorpayOrderId: '',
      razorpayPaymentId: '',
    },
    artworks: [],
    commissionDetails: {
      commission: commission._id,
      artworkType: commission.artworkType,
      description: commission.description,
      sizeDetails: commission.sizeDetails,
      referenceImages: commission.referenceImages,
      adminNotes: commission.adminNotes,
    },
    unread: true,
    placedAt: new Date(),
  });

  commission.convertedOrder = order._id;
  return order;
};

const findOwnedCommission = async (commissionId, userId) =>
  Commission.findOne({
    _id: commissionId,
    'customer.account': userId,
  }).populate('convertedOrder');

export const createCommission = async (req, res) => {
  try {
    const payload = buildCommissionPayload(req.body, req.user);

    if ('error' in payload) {
      return res.status(400).json({ message: payload.error });
    }

    const commission = await Commission.create({
      commissionId: `REQ-${Date.now().toString(36).toUpperCase()}`,
      ...payload,
      status: 'pending',
      adminNotes: '',
      quotedPrice: null,
      unread: true,
      payment: {
        status: 'unpaid',
        paymentLink: '',
        paymentOrderId: '',
        paymentId: '',
        linkSentAt: null,
        paidAt: null,
      },
      submittedAt: new Date(),
      history: [
        {
          status: 'pending',
          changedBy: req.user._id,
          note: 'Commission submitted.',
          changedAt: new Date(),
        },
      ],
    });

    await createUserNotification({
      userId: req.user._id,
      type: 'commission_submitted',
      title: 'Commission request submitted',
      message: `Your request ${commission.commissionId} has been sent to the studio.`,
      link: '/profile?section=orders',
    });

    res.status(201).json(commission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCommissions = async (req, res) => {
  try {
    const filters = {};

    if (req.query.status && req.query.status !== 'all') {
      filters.status = req.query.status;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(String(req.query.search), 'i');
      filters.$or = [
        { commissionId: searchRegex },
        { artworkType: searchRegex },
        { description: searchRegex },
        { 'customer.name': searchRegex },
        { 'customer.email': searchRegex },
      ];
    }

    const commissions = await Commission.find(filters)
      .populate('convertedOrder', 'orderId payment.amount payment.currency payment.status orderKind')
      .sort({ submittedAt: -1 });

    res.json(commissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyCommissions = async (req, res) => {
  try {
    const commissions = await Commission.find({ 'customer.account': req.user._id })
      .populate('convertedOrder', 'orderId payment.amount payment.currency payment.status orderKind')
      .sort({ submittedAt: -1 });

    res.json(commissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCommission = async (req, res) => {
  try {
    const commission = await Commission.findById(req.params.id);

    if (!commission) {
      return res.status(404).json({ message: 'Commission not found' });
    }

    const nextStatus = req.body.status ? String(req.body.status) : commission.status;
    const validStatuses = ['pending', 'approved', 'payment_pending', 'paid', 'rejected', 'in_progress', 'completed'];

    if (!validStatuses.includes(nextStatus)) {
      return res.status(400).json({ message: 'Invalid commission status.' });
    }

    const nextNotes = typeof req.body.adminNotes === 'string' ? req.body.adminNotes.trim() : commission.adminNotes;
    const quotedPrice =
      req.body.quotedPrice === '' || req.body.quotedPrice === null || req.body.quotedPrice === undefined
        ? commission.quotedPrice
        : Number(req.body.quotedPrice);

    if (req.body.quotedPrice !== '' && req.body.quotedPrice !== null && req.body.quotedPrice !== undefined && Number.isNaN(quotedPrice)) {
      return res.status(400).json({ message: 'Quoted price must be a valid number.' });
    }

    const previousStatus = commission.status;
    const previousQuotedPrice = commission.quotedPrice;
    commission.adminNotes = nextNotes;
    commission.quotedPrice = quotedPrice ?? null;
    commission.unread = false;

    if (nextStatus === 'paid') {
      return res.status(400).json({ message: 'Paid status is set automatically after successful payment.' });
    }

    if (nextStatus === 'approved' || nextStatus === 'payment_pending') {
      if (commission.quotedPrice == null) {
        return res.status(400).json({ message: 'Please set the final price before sending the payment link.' });
      }

      const order = await ensureCommissionOrder(commission);
      const paymentLink = buildAppUrl(`/profile?section=orders&order=${order.orderId}`);

      commission.status = 'payment_pending';
      commission.payment.paymentLink = paymentLink;
      commission.payment.status = commission.payment.status === 'paid' ? 'paid' : 'unpaid';
      commission.payment.linkSentAt = new Date();
      commission.approvedAt = commission.approvedAt || new Date();

      if (previousStatus !== 'payment_pending' || previousQuotedPrice !== commission.quotedPrice) {
        appendHistory(commission, 'payment_pending', req.user?._id ?? null, 'Payment link sent to customer.');
      }

      await sendCommissionApprovedEmail({
        to: commission.customer.email,
        customerName: commission.customer.name,
        commissionId: commission.commissionId,
        artworkType: commission.artworkType,
        description: commission.description,
        sizeDetails: commission.sizeDetails,
        quotedPrice: commission.quotedPrice,
        currency: commission.currency || 'INR',
        adminNotes: commission.adminNotes,
        paymentLink,
      });

      await createUserNotification({
        userId: commission.customer.account,
        type: 'commission_payment_link',
        title: 'Payment link is ready',
        message: `Your commission ${commission.commissionId} is approved. Complete payment to start the artwork.`,
        link: `/profile?section=orders&order=${order.orderId}`,
      });
    } else if (nextStatus === 'rejected') {
      commission.status = 'rejected';
      appendHistory(commission, 'rejected', req.user?._id ?? null, commission.adminNotes || 'Commission rejected.');

      await createUserNotification({
        userId: commission.customer.account,
        type: 'commission_rejected',
        title: 'Commission request updated',
        message: `Your commission ${commission.commissionId} was marked as rejected.`,
        link: '/profile?section=orders',
      });
    } else if (nextStatus === 'completed') {
      if (commission.payment.status !== 'paid') {
        return res.status(400).json({ message: 'Only paid commissions can be marked as completed.' });
      }

      commission.status = 'completed';
      commission.completedAt = new Date();
      appendHistory(commission, 'completed', req.user?._id ?? null, commission.adminNotes || 'Commission completed.');

      await createUserNotification({
        userId: commission.customer.account,
        type: 'commission_completed',
        title: 'Commission completed',
        message: `Your commission ${commission.commissionId} is marked as completed.`,
        link: '/profile?section=orders',
      });
    } else if (nextStatus === 'in_progress') {
      if (commission.payment.status !== 'paid') {
        return res.status(400).json({ message: 'Commission can move to in progress only after payment.' });
      }

      commission.status = 'in_progress';
      appendHistory(commission, 'in_progress', req.user?._id ?? null, commission.adminNotes || 'Commission moved to in progress.');
    } else {
      commission.status = nextStatus;
      if (previousStatus !== nextStatus) {
        appendHistory(commission, nextStatus, req.user?._id ?? null, 'Commission updated.');
      }
    }

    if (commission.convertedOrder) {
      await Order.findByIdAndUpdate(commission.convertedOrder, {
        $set: {
          'payment.amount': commission.quotedPrice ?? commission.budget,
          'payment.currency': commission.currency || 'INR',
          'payment.method': 'Custom Commission',
          'commissionDetails.artworkType': commission.artworkType,
          'commissionDetails.description': commission.description,
          'commissionDetails.sizeDetails': commission.sizeDetails,
          'commissionDetails.referenceImages': commission.referenceImages,
          'commissionDetails.adminNotes': commission.adminNotes,
        },
      });
    }

    await commission.save();

    const populatedCommission = await Commission.findById(commission._id).populate(
      'convertedOrder',
      'orderId payment.amount payment.currency payment.status orderKind'
    );

    res.json({
      message: 'Commission updated successfully.',
      commission: populatedCommission,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCommissionPaymentOrder = async (req, res) => {
  try {
    const commission = await findOwnedCommission(req.params.id, req.user._id);

    if (!commission) {
      return res.status(404).json({ message: 'Commission not found.' });
    }

    if (commission.status !== 'payment_pending' || commission.payment.status === 'paid' || commission.quotedPrice == null) {
      return res.status(400).json({ message: 'This commission is not ready for payment.' });
    }

    const order = await razorpayInstance.orders.create({
      amount: Math.round(commission.quotedPrice * 100),
      currency: commission.currency || 'INR',
      receipt: `commission_${commission.commissionId}`,
      notes: {
        commissionId: commission.commissionId,
        customerEmail: commission.customer.email,
      },
    });

    commission.payment.paymentOrderId = order.id;
    await commission.save();

    if (commission.convertedOrder) {
      await Order.findByIdAndUpdate(commission.convertedOrder._id, {
        $set: {
          'payment.razorpayOrderId': order.id,
          'payment.amount': commission.quotedPrice,
          'payment.currency': commission.currency || 'INR',
          'payment.status': 'created',
        },
      });
    }

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      commissionId: commission.commissionId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyCommissionPayment = async (req, res) => {
  try {
    const commission = await findOwnedCommission(req.params.id, req.user._id);

    if (!commission) {
      return res.status(404).json({ message: 'Commission not found.' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest('hex');

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: 'Invalid signature sent.' });
    }

    commission.payment.status = 'paid';
    commission.payment.paymentOrderId = razorpay_order_id;
    commission.payment.paymentId = razorpay_payment_id;
    commission.payment.paidAt = new Date();
    commission.status = 'paid';
    appendHistory(commission, 'paid', req.user._id, 'Payment received from customer.');
    commission.status = 'in_progress';
    appendHistory(commission, 'in_progress', req.user._id, 'Commission automatically moved to in progress after payment.');

    let orderId = '';

    if (commission.convertedOrder) {
      const order = await Order.findById(commission.convertedOrder._id);
      if (order) {
        order.payment.amount = commission.quotedPrice ?? commission.budget;
        order.payment.currency = commission.currency || 'INR';
        order.payment.method = 'Razorpay';
        order.payment.status = 'paid';
        order.payment.razorpayOrderId = razorpay_order_id;
        order.payment.razorpayPaymentId = razorpay_payment_id;
        order.unread = true;
        await order.save();
        orderId = order.orderId;
      }
    }

    await commission.save();

    await createUserNotification({
      userId: commission.customer.account,
      type: 'commission_paid',
      title: 'Payment received',
      message: `Your payment for commission ${commission.commissionId} was received. Work will begin now.`,
      link: '/profile?section=orders',
    });

    await sendCommissionPaymentReceivedEmail({
      to: commission.customer.email,
      customerName: commission.customer.name,
      orderId: orderId || commission.commissionId,
      artworkType: commission.artworkType,
      description: commission.description,
      sizeDetails: commission.sizeDetails,
      amount: commission.quotedPrice ?? commission.budget,
      currency: commission.currency || 'INR',
      adminNotes: commission.adminNotes,
    });

    res.json({
      message: 'Commission payment verified successfully.',
      status: commission.status,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
