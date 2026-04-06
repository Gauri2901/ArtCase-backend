const createTransporter = async () => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return null;
  }

  let nodemailer;
  try {
    ({ default: nodemailer } = await import('nodemailer'));
  } catch (error) {
    console.warn('Email skipped: nodemailer is not installed.', error);
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

const formatCurrency = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(amount);

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const sendCommissionApprovedEmail = async ({
  to,
  customerName,
  commissionId,
  artworkType,
  description,
  sizeDetails,
  quotedPrice,
  currency = 'INR',
  adminNotes = '',
  paymentLink = '',
}) => {
  const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = await createTransporter();

  if (!transporter || !smtpFrom) {
    console.warn('Commission approval email skipped: SMTP environment variables are not configured.');
    return;
  }

  const formattedPrice = formatCurrency(quotedPrice, currency);

  await transporter.sendMail({
    from: smtpFrom,
    to,
    subject: `Your Art-Case commission ${commissionId} has been approved`,
    text: [
      `Hi ${customerName},`,
      '',
      'Your custom artwork request has been approved.',
      `Commission ID: ${commissionId}`,
      `Artwork type: ${artworkType}`,
      `Quoted price: ${formattedPrice}`,
      `Size details: ${sizeDetails}`,
      `Concept: ${description}`,
      paymentLink ? `Complete payment here: ${paymentLink}` : '',
      adminNotes ? `Admin notes: ${adminNotes}` : '',
      '',
      'Our team will contact you with the next steps shortly.',
      '',
      'Art-Case',
    ]
      .filter(Boolean)
      .join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 12px;">Your commission has been approved</h2>
        <p>Hi ${customerName},</p>
        <p>Your custom artwork request has been approved by the Art-Case studio.</p>
        <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
          <p><strong>Commission ID:</strong> ${commissionId}</p>
          <p><strong>Artwork type:</strong> ${artworkType}</p>
          <p><strong>Quoted price:</strong> ${formattedPrice}</p>
          <p><strong>Size details:</strong> ${sizeDetails}</p>
          <p><strong>Concept:</strong> ${description}</p>
          ${paymentLink ? `<p><strong>Payment link:</strong> <a href="${paymentLink}">${paymentLink}</a></p>` : ''}
          ${adminNotes ? `<p><strong>Admin notes:</strong> ${adminNotes}</p>` : ''}
        </div>
        <p style="margin-top: 16px;">We will reach out soon with the next steps.</p>
        <p>Art-Case</p>
      </div>
    `,
  });
};

export const sendCommissionPaymentReceivedEmail = async ({
  to,
  customerName,
  orderId,
  artworkType,
  description,
  sizeDetails,
  amount,
  currency = 'INR',
  adminNotes = '',
}) => {
  const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = await createTransporter();

  if (!transporter || !smtpFrom) {
    console.warn('Commission order email skipped: SMTP environment variables are not configured.');
    return;
  }

  const formattedPrice = formatCurrency(amount, currency);

  await transporter.sendMail({
    from: smtpFrom,
    to,
    subject: `Payment received for your Art-Case order ${orderId}`,
    text: [
      `Hi ${customerName},`,
      '',
      'We have received your commission payment successfully.',
      `Order ID: ${orderId}`,
      `Artwork type: ${artworkType}`,
      `Price: ${formattedPrice}`,
      `Size details: ${sizeDetails}`,
      `Concept: ${description}`,
      adminNotes ? `Admin notes: ${adminNotes}` : '',
      '',
      'We will update you as the artwork moves ahead.',
      '',
      'Art-Case',
    ]
      .filter(Boolean)
      .join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 12px;">Your payment has been received</h2>
        <p>Hi ${customerName},</p>
        <p>Your custom artwork payment has been received successfully. The commission can now move into production.</p>
        <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Artwork type:</strong> ${artworkType}</p>
          <p><strong>Price:</strong> ${formattedPrice}</p>
          <p><strong>Size details:</strong> ${sizeDetails}</p>
          <p><strong>Concept:</strong> ${description}</p>
          ${adminNotes ? `<p><strong>Admin notes:</strong> ${adminNotes}</p>` : ''}
        </div>
        <p style="margin-top: 16px;">We will keep you updated as the artwork moves forward.</p>
        <p>Art-Case</p>
      </div>
    `,
  });
};

export const sendPasswordResetOTPEmail = async ({
  to,
  userName,
  otp,
}) => {
  const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = await createTransporter();

  if (!transporter || !smtpFrom) {
    console.warn('Password reset OTP email skipped: SMTP environment variables are not configured.');
    return;
  }

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject: 'Your Password Reset OTP - Art-Case',
      text: [
        `Hi ${userName},`,
        '',
        'You requested to reset your password. Use the OTP below to proceed:',
        ``,
        `OTP: ${otp}`,
        ``,
        'This OTP will expire in 10 minutes.',
        'If you did not request this, please ignore this email.',
        '',
        'Art-Case',
      ]
        .filter(Boolean)
        .join('\n'),
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 12px;">Password Reset Request</h2>
        <p>Hi ${userName},</p>
        <p>You requested to reset your password. Use the OTP below to proceed:</p>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb; text-align: center; margin: 20px 0;">
          <p style="font-size: 32px; font-weight: bold; color: #1f2937; margin: 0; letter-spacing: 4px;">${otp}</p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This OTP will expire in 10 minutes.</p>
        <p style="color: #6b7280;">If you did not request this, please ignore this email.</p>
        <p style="margin-top: 16px;">Art-Case</p>
      </div>
    `,
    });
  } catch (error) {
    console.error('Error sending password reset OTP email:', error);
    throw error;
  }
};

export const sendOrderPlacedEmail = async ({
  to,
  customerName,
  orderId,
  orderDate,
  invoiceNumber,
  paymentMethod,
  paymentStatus,
  razorpayOrderId = '',
  razorpayPaymentId = '',
  phone = '',
  address = '',
  city = '',
  zip = '',
  items = [],
  pricing,
}) => {
  const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = await createTransporter();

  if (!transporter || !smtpFrom) {
    console.warn('Order placed email skipped: SMTP environment variables are not configured.');
    return;
  }

  const currency = pricing.currency || 'INR';
  const lines = items.map((item) =>
    `- ${item.title} (${item.category}) x${item.quantity} - ${formatCurrency(item.price * item.quantity, currency)}`
  );

  await transporter.sendMail({
    from: smtpFrom,
    to,
    subject: `Order placed successfully: ${orderId}`,
    text: [
      `Hi ${customerName},`,
      '',
      'Your Art-Case order has been placed successfully.',
      `Order ID: ${orderId}`,
      `Invoice number: ${invoiceNumber}`,
      `Order date: ${new Date(orderDate).toLocaleString('en-IN')}`,
      `Payment method: ${paymentMethod}`,
      `Payment status: ${paymentStatus}`,
      razorpayOrderId ? `Razorpay order ID: ${razorpayOrderId}` : '',
      razorpayPaymentId ? `Razorpay payment ID: ${razorpayPaymentId}` : '',
      phone ? `Phone: ${phone}` : '',
      `Shipping address: ${[address, city, zip].filter(Boolean).join(', ') || 'Not provided'}`,
      '',
      'Items:',
      ...lines,
      '',
      `Subtotal: ${formatCurrency(pricing.subtotal, currency)}`,
      `Discount: ${formatCurrency(pricing.discount, currency)}`,
      `Shipping: ${formatCurrency(pricing.shipping, currency)}`,
      `Total: ${formatCurrency(pricing.total, currency)}`,
      '',
      'Thank you for shopping with Art-Case.',
      '',
      'Art-Case',
    ]
      .filter(Boolean)
      .join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 12px;">Your order has been placed</h2>
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>Thank you for shopping with Art-Case. Your order is confirmed and we have shared all the important details below.</p>
        <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
          <p><strong>Order ID:</strong> ${escapeHtml(orderId)}</p>
          <p><strong>Invoice number:</strong> ${escapeHtml(invoiceNumber)}</p>
          <p><strong>Order date:</strong> ${escapeHtml(new Date(orderDate).toLocaleString('en-IN'))}</p>
          <p><strong>Payment method:</strong> ${escapeHtml(paymentMethod)}</p>
          <p><strong>Payment status:</strong> ${escapeHtml(paymentStatus)}</p>
          ${razorpayOrderId ? `<p><strong>Razorpay order ID:</strong> ${escapeHtml(razorpayOrderId)}</p>` : ''}
          ${razorpayPaymentId ? `<p><strong>Razorpay payment ID:</strong> ${escapeHtml(razorpayPaymentId)}</p>` : ''}
          ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ''}
          <p><strong>Shipping address:</strong> ${escapeHtml([address, city, zip].filter(Boolean).join(', ') || 'Not provided')}</p>
        </div>
        <div style="margin-top: 16px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h3 style="margin-top: 0;">Order summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Item</th>
                <th style="text-align: left; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Qty</th>
                <th style="text-align: right; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item) => `
                    <tr>
                      <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                        <div><strong>${escapeHtml(item.title)}</strong></div>
                        <div style="color: #6b7280; font-size: 13px;">${escapeHtml(item.category)}</div>
                      </td>
                      <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">${item.quantity}</td>
                      <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">${formatCurrency(item.price * item.quantity, currency)}</td>
                    </tr>
                  `
                )
                .join('')}
            </tbody>
          </table>
          <div style="margin-top: 16px;">
            <p><strong>Subtotal:</strong> ${formatCurrency(pricing.subtotal, currency)}</p>
            <p><strong>Discount:</strong> ${formatCurrency(pricing.discount, currency)}</p>
            <p><strong>Shipping:</strong> ${formatCurrency(pricing.shipping, currency)}</p>
            <p style="font-size: 18px;"><strong>Total:</strong> ${formatCurrency(pricing.total, currency)}</p>
          </div>
        </div>
        <p style="margin-top: 16px;">You can log in to your Art-Case account anytime to view your full order details and invoice.</p>
        <p>Art-Case</p>
      </div>
    `,
  });
};
