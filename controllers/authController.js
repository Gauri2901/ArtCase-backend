import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendPasswordResetOTPEmail } from '../utils/email.js';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
    const { name, email, password, phone = '' } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
        name,
        email,
        phone,
        password: hashedPassword,
    });

    if (user) {
        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            isAdmin: user.isAdmin,
            token: generateToken(user.id),
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const authUser = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            isAdmin: user.isAdmin,
            token: generateToken(user.id),
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

export const getProfile = async (req, res) => {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        isAdmin: user.isAdmin,
        token: generateToken(user.id),
    });
};

export const updateProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const nextEmail = String(req.body.email ?? user.email).trim();
    const existingEmailOwner = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });

    if (existingEmailOwner) {
        return res.status(400).json({ message: 'Email is already in use.' });
    }

    user.name = String(req.body.name ?? user.name).trim();
    user.email = nextEmail;
    user.phone = String(req.body.phone ?? user.phone ?? '').trim();

    const updatedUser = await user.save();

    res.json({
        _id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone || '',
        isAdmin: updatedUser.isAdmin,
        token: generateToken(updatedUser.id),
    });
};

// @desc    Forgot Password - Send OTP to email
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.trim()) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email: email.trim() });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save OTP to user document
        user.resetPasswordOTP = otp;
        user.resetPasswordOTPExpiry = otpExpiry;
        await user.save();

        // Send OTP email
        await sendPasswordResetOTPEmail({
            to: user.email,
            userName: user.name,
            otp,
        });

        res.json({ message: 'OTP sent to your email' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }
};

// @desc    Verify OTP for password reset
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        const user = await User.findOne({ email: email.trim() });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if OTP exists and is not expired
        if (!user.resetPasswordOTP || !user.resetPasswordOTPExpiry) {
            return res.status(400).json({ message: 'OTP not found. Please request a new one.' });
        }

        if (new Date() > user.resetPasswordOTPExpiry) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        if (user.resetPasswordOTP !== otp.trim()) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Generate reset token
        const resetToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
        user.resetPasswordToken = resetToken;
        user.resetPasswordTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
        
        // Clear OTP after verification
        user.resetPasswordOTP = null;
        user.resetPasswordOTPExpiry = null;
        await user.save();

        res.json({ 
            message: 'OTP verified successfully',
            resetToken,
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ message: 'Failed to verify OTP. Please try again.' });
    }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
    try {
        const { email, newPassword, confirmPassword, resetToken } = req.body;

        if (!email || !newPassword || !confirmPassword || !resetToken) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        const user = await User.findOne({ email: email.trim() });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify reset token
        if (!user.resetPasswordToken || user.resetPasswordToken !== resetToken) {
            return res.status(400).json({ message: 'Invalid reset token. Please start the process again.' });
        }

        if (!user.resetPasswordTokenExpiry || new Date() > user.resetPasswordTokenExpiry) {
            return res.status(400).json({ message: 'Reset token has expired. Please start the process again.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordTokenExpiry = null;
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Failed to reset password. Please try again.' });
    }
};
