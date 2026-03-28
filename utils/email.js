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
          ${adminNotes ? `<p><strong>Admin notes:</strong> ${adminNotes}</p>` : ''}
        </div>
        <p style="margin-top: 16px;">We will reach out soon with the next steps.</p>
        <p>Art-Case</p>
      </div>
    `,
  });
};

export const sendCommissionOrderPlacedEmail = async ({
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
    subject: `Your Art-Case order ${orderId} has been created`,
    text: [
      `Hi ${customerName},`,
      '',
      'Your commission has now been placed as an order with Art-Case.',
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
        <h2 style="margin-bottom: 12px;">Your commission order has been placed</h2>
        <p>Hi ${customerName},</p>
        <p>Your custom artwork request has now been placed as an official order with Art-Case.</p>
        <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Artwork type:</strong> ${artworkType}</p>
          <p><strong>Price:</strong> ${formattedPrice}</p>
          <p><strong>Size details:</strong> ${sizeDetails}</p>
          <p><strong>Concept:</strong> ${description}</p>
          ${adminNotes ? `<p><strong>Admin notes:</strong> ${adminNotes}</p>` : ''}
        </div>
        <p style="margin-top: 16px;">We will share further progress updates with you by email.</p>
        <p>Art-Case</p>
      </div>
    `,
  });
};
