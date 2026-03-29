import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

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
