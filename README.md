# Lost & Found Portal 🔍

A campus lost and found web portal built with Express.js, MongoDB (Mongoose), and React (Vite).

## Features
- 🔐 **User Authentication**: Register & Login with JWT and encrypted passwords (bcrypt).
- 📦 **CRUD Listings**: Post lost or found items with image uploads (Multer).
- 🔍 **Search & Filters**: Filter listings by type (Lost / Found), category, and status (Active / Resolved).
- 🛡️ **Ownership Protection**: Only the user who posted an item can mark it as resolved, edit it, or delete it.
- 🖼️ **Image Support**: Upload and display photos of items.

---

## Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in `backend/`:
```env
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```
Start the backend server:
```bash
npm start
```
*Backend runs on `http://localhost:5001`*

---

### 2. Frontend Setup
In a new terminal window:
```bash
cd lost-found-portal
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*

---

## Tech Stack
- **Backend**: Node.js, Express.js, MongoDB, Mongoose, Multer, JWT, BcryptJS
- **Frontend**: React, Vite, React Router, Axios
