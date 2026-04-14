
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { sendOrderPlacedEmail } from '../utils/email.js';
import { ensureInvoiceForOrder } from '../utils/invoiceService.js';

dotenv.config();

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createOrder = async (req, res) => {
    try {
        const { amount, currency } = req.body;

        const options = {
            amount: Math.round(amount * 100), // amount in smallest currency unit
            currency: currency || "INR",
            receipt: `receipt_order_${Date.now()}`,
        };

        const order = await razorpayInstance.orders.create(options);

        if (!order) return res.status(500).send("Some error occured");

        res.json(order);
    } catch (error) {
        res.status(500).send(error);
    }
};

export const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            customer,
            artworks,
            amount,
            currency,
            method,
            pricing,
        } = req.body;

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized' });
            }

            if (!customer || !Array.isArray(artworks) || artworks.length === 0) {
                return res.status(400).json({ message: 'Customer and artwork details are required' });
            }

            const subtotal = artworks.reduce((sum, artwork) => sum + Number(artwork.price || 0) * Number(artwork.quantity || 1), 0);
            const normalizedPricing = {
                subtotal,
                discount: Number(pricing?.discount || 0),
                shipping: Number(pricing?.shipping || 0),
                total: Number(amount || subtotal),
                currency: currency || 'INR',
            };
            const placedAt = new Date();
            const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

            const order = await Order.create({
                orderId: `ART-${Date.now().toString(36).toUpperCase()}`,
                user: {
                    account: req.user._id,
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone || req.user.phone || '',
                    address: customer.address,
                    city: customer.city,
                    zip: customer.zip,
                    state: customer.state || '',
                },
                orderKind: 'purchase',
                payment: {
                    amount,
                    currency: currency || 'INR',
                    method: method || 'Razorpay',
                    status: 'paid',
                    razorpayOrderId: razorpay_order_id,
                    razorpayPaymentId: razorpay_payment_id,
                },
                pricing: normalizedPricing,
                invoice: {
                    invoiceNumber,
                    issuedAt: placedAt,
                },
                artworks: artworks.map((artwork) => ({
                    artwork: artwork.artworkId,
                    title: artwork.title,
                    imageUrl: artwork.imageUrl,
                    price: artwork.price,
                    quantity: artwork.quantity,
                    category: artwork.category,
                })),
                commissionDetails: {
                    commission: null,
                    artworkType: '',
                    description: '',
                    sizeDetails: '',
                    referenceImages: [],
                    adminNotes: '',
                },
                unread: true,
                placedAt,
            });

            // Save address to user profile if it doesn't exist
            const currentUser = await User.findById(req.user._id);
            if (currentUser) {
                const addressExists = currentUser.addresses.some(addr => 
                    addr.addressLine === customer.address && 
                    addr.city === customer.city && 
                    addr.zip === customer.zip
                );

                if (!addressExists) {
                    currentUser.addresses.push({
                        name: customer.name,
                        phone: customer.phone || currentUser.phone || '',
                        addressLine: customer.address,
                        city: customer.city,
                        state: customer.state || '', // Added state if available
                        zip: customer.zip,
                        isDefault: currentUser.addresses.length === 0,
                        addressType: 'Home'
                    });
                }
                
                currentUser.orders.push(order._id);
                await currentUser.save();
            }

            const invoiceResult = await ensureInvoiceForOrder(order);
            order.invoice.invoiceNumber = invoiceResult.invoice.invoiceNumber;
            order.invoice.issuedAt = invoiceResult.invoice.pdf.generatedAt;
            order.invoice.pdfUrl = invoiceResult.invoice.pdf.url;
            await order.save();

            try {
                await sendOrderPlacedEmail({
                    to: customer.email,
                    customerName: customer.name,
                    orderId: order.orderId,
                    orderDate: order.placedAt,
                    invoiceNumber: order.invoice.invoiceNumber,
                    paymentMethod: order.payment.method,
                    paymentStatus: order.payment.status,
                    razorpayOrderId: order.payment.razorpayOrderId,
                    razorpayPaymentId: order.payment.razorpayPaymentId,
                    phone: order.user.phone,
                    address: order.user.address,
                    city: order.user.city,
                    zip: order.user.zip,
                    items: order.artworks,
                    pricing: order.pricing,
                    invoiceAttachment: {
                        fileName: invoiceResult.fileName,
                        buffer: invoiceResult.pdfBuffer,
                    },
                });
            } catch (emailError) {
                console.error('Failed to send order placed email:', emailError);
            }

            return res.status(200).json({
                message: "Payment verified successfully",
                order,
            });
        } else {
            return res.status(400).json({ message: "Invalid signature sent!" });
        }
    } catch (error) {
        res.status(500).send(error);
    }
};
