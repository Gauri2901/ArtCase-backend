import { Readable } from 'stream';
import Invoice from '../models/Invoice.js';
import cloudinary from './cloudinary.js';
import { buildInvoicePdfBuffer } from './invoicePdf.js';

const buildInvoiceItems = (order) => {
  if (order.orderKind === 'commission') {
    return [
      {
        title: order.commissionDetails?.artworkType || 'Custom commission',
        category: order.commissionDetails?.sizeDetails || 'Commission',
        quantity: 1,
        unitPrice: Number(order.pricing?.total || order.payment.amount || 0),
        lineTotal: Number(order.pricing?.total || order.payment.amount || 0),
      },
    ];
  }

  return order.artworks.map((artwork) => ({
    title: artwork.title,
    category: artwork.category,
    quantity: artwork.quantity,
    unitPrice: Number(artwork.price || 0),
    lineTotal: Number(artwork.price || 0) * Number(artwork.quantity || 1),
  }));
};

const uploadPdfBuffer = async ({ buffer, invoiceNumber }) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'artcase_invoices',
        public_id: invoiceNumber,
        resource_type: 'raw',
        overwrite: true,
        format: 'pdf',
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });

export const ensureInvoiceForOrder = async (orderDocument) => {
  const order = orderDocument.toObject ? orderDocument.toObject() : orderDocument;
  const invoiceNumber = order.invoice?.invoiceNumber || `INV-${order.orderId}`;
  const generatedAt = order.invoice?.issuedAt || order.placedAt || new Date();

  let invoice = await Invoice.findOne({ order: order._id });

  if (!invoice) {
    invoice = new Invoice({
      order: order._id,
      invoiceNumber,
      orderId: order.orderId,
      user: {
        name: order.user.name,
        email: order.user.email,
        phone: order.user.phone || '',
        address: order.user.address || '',
        city: order.user.city || '',
        zip: order.user.zip || '',
        state: order.user.state || '',
      },
      payment: {
        method: order.payment.method,
        status: order.payment.status,
        amount: Number(order.payment.amount || 0),
        currency: order.payment.currency || 'INR',
        razorpayOrderId: order.payment.razorpayOrderId || '',
        razorpayPaymentId: order.payment.razorpayPaymentId || '',
      },
      pricing: {
        subtotal: Number(order.pricing?.subtotal || order.payment.amount || 0),
        discount: Number(order.pricing?.discount || 0),
        shipping: Number(order.pricing?.shipping || 0),
        total: Number(order.pricing?.total || order.payment.amount || 0),
        currency: order.pricing?.currency || order.payment.currency || 'INR',
      },
      items: buildInvoiceItems(order),
      pdf: {
        fileName: `${invoiceNumber}.pdf`,
        cloudinaryPublicId: '',
        url: '',
        bytes: 0,
        generatedAt,
      },
    });
  } else {
    invoice.orderId = order.orderId;
    invoice.user = {
      name: order.user.name,
      email: order.user.email,
      phone: order.user.phone || '',
      address: order.user.address || '',
      city: order.user.city || '',
      zip: order.user.zip || '',
      state: order.user.state || '',
    };
    invoice.payment = {
      method: order.payment.method,
      status: order.payment.status,
      amount: Number(order.payment.amount || 0),
      currency: order.payment.currency || 'INR',
      razorpayOrderId: order.payment.razorpayOrderId || '',
      razorpayPaymentId: order.payment.razorpayPaymentId || '',
    };
    invoice.pricing = {
      subtotal: Number(order.pricing?.subtotal || order.payment.amount || 0),
      discount: Number(order.pricing?.discount || 0),
      shipping: Number(order.pricing?.shipping || 0),
      total: Number(order.pricing?.total || order.payment.amount || 0),
      currency: order.pricing?.currency || order.payment.currency || 'INR',
    };
    invoice.items = buildInvoiceItems(order);
    invoice.pdf.fileName = `${invoiceNumber}.pdf`;
    invoice.pdf.generatedAt = generatedAt;
  }

  const pdfBuffer = await buildInvoicePdfBuffer({ invoice, order });
  const upload = await uploadPdfBuffer({ buffer: pdfBuffer, invoiceNumber });

  invoice.pdf.cloudinaryPublicId = upload.public_id || '';
  invoice.pdf.url = upload.secure_url || '';
  invoice.pdf.bytes = upload.bytes || pdfBuffer.length;
  invoice.pdf.generatedAt = new Date();

  await invoice.save();

  return {
    invoice,
    pdfBuffer,
    fileName: invoice.pdf.fileName,
  };
};
