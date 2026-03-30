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

  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(quotedPrice);

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

  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(amount);

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
