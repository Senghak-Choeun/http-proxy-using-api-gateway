const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const connectDB = require('./db');
const Person = require('./person.schema');

const app = express();
app.use(express.json());
app.use(cors());

connectDB();

// Helper function to extract logged-in user info from JWT passed by API Gateway
const getUserFromToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return jwt.decode(parts[1]); // Decoded token contains { id, emailid, role }
};

// 1. VIEW OWN PROFILE
// Accessible via Gateway: GET http://localhost:4000/user/viewprofile
app.get('/viewprofile', async (req, res) => {
  try {
    const userData = getUserFromToken(req);

    if (!userData || !userData.id) {
      return res.status(401).json({ message: 'User ID missing or invalid token' });
    }

    const user = await Person.findById(userData.id).select('-pass'); // Exclude password hash

    if (!user) {
      return res.status(404).json({ message: 'User profile not found in database' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 2. UPDATE OWN PROFILE
// Accessible via Gateway: PUT http://localhost:4000/user/updateprofile
app.put('/updateprofile', async (req, res) => {
  try {
    const userData = getUserFromToken(req);
    const { name, mobile } = req.body;

    if (!userData || !userData.id) {
      return res.status(401).json({ message: 'User ID missing or invalid token' });
    }

    if (!name && !mobile) {
      return res.status(400).json({ message: 'Please provide name or mobile to update' });
    }

    // Build update object dynamically
    const updateData = {};
    if (name) updateData.name = name;
    if (mobile) updateData.mobile = mobile;

    // Update user details in MongoDB
    const updatedUser = await Person.findByIdAndUpdate(
      userData.id,
      updateData,
      { new: true }
    ).select('-pass'); // Exclude password from response

    if (!updatedUser) {
      return res.status(404).json({ message: 'User record not found in database' });
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Fixed Port: Set to 5004 to align with API Gateway routing
const PORT = process.env.PORT || 5004;
app.listen(PORT, () => console.log(`User Microservice running on port ${PORT}`));