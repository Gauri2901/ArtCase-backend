
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import Order from '../models/Order.js';
import User from '../models/User.js';

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

            const order = await Order.create({
                orderId: `ART-${Date.now().toString(36).toUpperCase()}`,
                user: {
                    account: req.user._id,
                    name: customer.name,
                    email: customer.email,
                    address: customer.address,
                    city: customer.city,
                    zip: customer.zip,
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
                placedAt: new Date(),
            });

            await User.findByIdAndUpdate(req.user._id, {
                $push: { orders: order._id },
            });

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
