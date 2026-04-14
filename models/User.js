import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    phone: {
        type: String,
        default: ''
    },
    password: { 
        type: String, 
        required: true 
    },
    isAdmin: { 
        type: Boolean, 
        default: false 
    }, 
    addresses: [{
        name: String,
        phone: String,
        addressLine: String,
        city: String,
        state: String,
        zip: String,
        isDefault: {
            type: Boolean,
            default: false
        },
        addressType: {
            type: String,
            enum: ['Home', 'Work', 'Other'],
            default: 'Home'
        }
    }],
    wishlist: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product' 
    }],
    orders: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Order' 
    }], // Placeholder for later
    resetPasswordOTP: {
        type: String,
        default: null
    },
    resetPasswordOTPExpiry: {
        type: Date,
        default: null
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordTokenExpiry: {
        type: Date,
        default: null
    }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
