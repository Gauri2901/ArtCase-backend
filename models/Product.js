import mongoose from "mongoose";
export const productSchema = new mongoose.Schema({
  title: { 
    type: String,
    required: true 
  },
  imageUrl: { 
    type: String, 
    required: true 
  },
  price: { 
    type: Number, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    required: true,
    enum: ['Oil', 'Acrylic', 'Watercolor', 'Mixed Media'] 
  },
  dimensions: { 
    type: String, 
    default: '24" x 36"' 
  },
  year: { 
    type: Number, 
    default: 2025 
  },
  medium: { 
    type: String, 
    default: 'Oil on Canvas' 
  },
  featured: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

export default mongoose.model("Product", productSchema);