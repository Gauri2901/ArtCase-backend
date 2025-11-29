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
    password: { 
        type: String, 
        required: true 
    },
    isAdmin: { 
        type: Boolean, 
        default: false 
    }, 
    address: { 
        type: String, 
        default: '' 
    },
    city: { 
        type: String, 
        default: '' 
    },
    zip: { 
        type: String, 
        default: '' 
    },
    wishlist: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product' 
    }],
    orders: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Order' 
    }] // Placeholder for later
}, { timestamps: true });

export default mongoose.model('User', userSchema);