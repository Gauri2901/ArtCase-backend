import Commission from '../models/Commission.js';
import Order from '../models/Order.js';
import { sendCommissionApprovedEmail, sendCommissionOrderPlacedEmail } from '../utils/email.js';

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const buildCommissionPayload = (body) => {
  const customerName = String(body.customerName ?? body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const artworkType = String(body.artworkType ?? '').trim();
  const description = String(body.description ?? '').trim();
  const sizeDetails = String(body.sizeDetails ?? '').trim();
  const budget = Number(body.budget);
  const referenceImages = Array.isArray(body.referenceImages)
    ? body.referenceImages.map((image) => String(image).trim()).filter(Boolean)
    : [];

  if (!isNonEmptyString(customerName) || !isNonEmptyString(email) || !isNonEmptyString(artworkType) || !isNonEmptyString(description) || !isNonEmptyString(sizeDetails)) {
    return { error: 'Name, email, artwork type, description, and size details are required.' };
  }

  if (Number.isNaN(budget) || budget < 0) {
    return { error: 'Please enter a valid budget.' };
  }

  return {
    customer: {
      account: body.account ?? null,
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

const createCommissionOrder = async (commission) => {
  const amount = commission.quotedPrice ?? commission.budget;

  return Order.create({
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
      amount,
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
};

export const createCommission = async (req, res) => {
  try {
    const payload = buildCommissionPayload({
      ...req.body,
      account: req.user?._id ?? null,
    });

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
      submittedAt: new Date(),
      history: [
        {
          status: 'pending',
          changedBy: req.user?._id ?? null,
          note: 'Commission submitted.',
          changedAt: new Date(),
        },
      ],
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

export const updateCommission = async (req, res) => {
  try {
    const commission = await Commission.findById(req.params.id);

    if (!commission) {
      return res.status(404).json({ message: 'Commission not found' });
    }

    const nextStatus = req.body.status ? String(req.body.status) : commission.status;
    const validStatuses = ['pending', 'approved', 'rejected', 'in_progress', 'completed'];

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

    if (nextStatus === 'approved' && (quotedPrice === null || quotedPrice === undefined)) {
      return res.status(400).json({ message: 'Please add a quoted price before approving a commission.' });
    }

    const previousStatus = commission.status;
    const previousNotes = commission.adminNotes;
    const previousQuotedPrice = commission.quotedPrice;
    commission.status = nextStatus;
    commission.adminNotes = nextNotes;
    commission.quotedPrice = quotedPrice ?? null;
    commission.unread = false;

    const shouldAppendHistory =
      previousStatus !== nextStatus ||
      nextNotes !== previousNotes ||
      (quotedPrice ?? null) !== previousQuotedPrice;

    if (previousStatus !== nextStatus) {
      appendHistory(commission, nextStatus, req.user?._id ?? null, nextNotes || `Status changed to ${nextStatus}.`);
    } else if (shouldAppendHistory) {
      appendHistory(commission, commission.status, req.user?._id ?? null, 'Commission details updated.');
    }

    if (nextStatus === 'approved') {
      let createdOrUpdatedOrder = null;

      if (!commission.convertedOrder) {
        const order = await createCommissionOrder(commission);
        commission.convertedOrder = order._id;
        createdOrUpdatedOrder = order;
      } else {
        createdOrUpdatedOrder = await Order.findByIdAndUpdate(commission.convertedOrder, {
          $set: {
            'payment.amount': commission.quotedPrice ?? commission.budget,
            'payment.currency': commission.currency || 'INR',
            'payment.method': 'Custom Commission',
            'payment.status': 'created',
            'commissionDetails.artworkType': commission.artworkType,
            'commissionDetails.description': commission.description,
            'commissionDetails.sizeDetails': commission.sizeDetails,
            'commissionDetails.referenceImages': commission.referenceImages,
            'commissionDetails.adminNotes': commission.adminNotes,
          },
        }, { new: true });
      }

      if (previousStatus !== 'approved') {
        await sendCommissionApprovedEmail({
          to: commission.customer.email,
          customerName: commission.customer.name,
          commissionId: commission.commissionId,
          artworkType: commission.artworkType,
          description: commission.description,
          sizeDetails: commission.sizeDetails,
          quotedPrice: commission.quotedPrice ?? commission.budget,
          currency: commission.currency || 'INR',
          adminNotes: commission.adminNotes,
        });

        if (createdOrUpdatedOrder) {
          await sendCommissionOrderPlacedEmail({
            to: commission.customer.email,
            customerName: commission.customer.name,
            orderId: createdOrUpdatedOrder.orderId,
            artworkType: commission.artworkType,
            description: commission.description,
            sizeDetails: commission.sizeDetails,
            amount: commission.quotedPrice ?? commission.budget,
            currency: commission.currency || 'INR',
            adminNotes: commission.adminNotes,
          });
        }
      }
    }

    await commission.save();

    const populatedCommission = await Commission.findById(commission._id).populate(
      'convertedOrder',
      'orderId payment.amount payment.currency payment.status orderKind'
    );

    res.json({
      message: shouldAppendHistory ? 'Commission updated successfully.' : 'No commission changes detected.',
      commission: populatedCommission,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
