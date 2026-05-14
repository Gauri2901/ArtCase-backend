# ArtCase - Backend

This is the backend service for ArtCase, a digital art marketplace. It provides the API that powers the frontend application, handling everything from user authentication to payments and invoice generation.

## 🚀 Features

* **Authentication**: Secure login and registration using JWT and bcrypt.
* **Product Management**: API endpoints for adding, reading, updating, and deleting artworks.
* **Image Uploads**: Direct integration with Cloudinary to safely store artwork images.
* **Payment Gateways**: Supports payments through Razorpay.
* **Automated Invoices**: Automatically creates PDF invoices for successful orders.
* **Email Notifications**: Sends order confirmations and password reset links.
* **AI Integration**: Uses Google Generative AI / OpenAI for smart artwork tagging.
* **Admin Controls**: Dedicated endpoints for managing users, orders, and site data.

## 🛠️ Tech Stack

* **Runtime**: Node.js
* **Framework**: Express.js
* **Database**: MongoDB with Mongoose
* **Authentication**: JSON Web Tokens (JWT)
* **File Storage**: Cloudinary (via Multer)
* **Payments**: Razorpay SDK
* **Invoices**: PDFKit

## 📦 Local Setup

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Environment Variables**:
   Create a `.env` file in the root folder and add the following keys:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   FRONTEND_URL=http://localhost:5173
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
   
   # Payments
   RAZORPAY_KEY_ID=
   RAZORPAY_KEY_SECRET=
   ```
4. **Run the server**:
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:5000`.

## 🗂️ Folder Structure

* `/controllers`: Business logic for each route.
* `/models`: Database schemas for MongoDB.
* `/routes`: API endpoints definition.
* `/middleware`: Custom middleware (e.g., auth checks, error handling).
* `/utils`: Helper functions (PDF generator, email sender, database connection).
