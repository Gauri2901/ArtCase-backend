import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';

dotenv.config();

const sampleProducts = [
  {
    title: "Mountain Sunset",
    imageUrl: "/paintings/sunset.jpg",
    price: 49.99,
    description: "A beautiful oil painting capturing the serene colors of a mountain sunset.",
    category: "Oil",
    featured: true
  },
  {
    title: "Abstract Ocean",
    imageUrl: "/paintings/ocean.jpg",
    price: 79.99,
    description: "A large, dynamic abstract piece in acrylics, inspired by the power and motion of the ocean.",
    category: "Acrylic",
    featured: true
  },
  {
    title: "Forest Path",
    imageUrl: "/paintings/forest.jpg",
    price: 39.99,
    description: "A charming watercolor painting of a sun-dappled path through a green forest.",
    category: "Watercolor",
    featured: false
  },
  {
    title: "Cityscape",
    imageUrl: "/paintings/city.jpg",
    price: 99.99,
    description: "A modern, textured mixed-media piece depicting a vibrant city skyline at night.",
    category: "Mixed Media",
    featured: true
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB for seeding...");

    // Clear existing products
    await Product.deleteMany({});
    
    // Insert new ones
    await Product.insertMany(sampleProducts);
    
    console.log("Database seeded successfully!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedDB();