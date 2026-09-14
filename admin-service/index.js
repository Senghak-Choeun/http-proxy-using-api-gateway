const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const Person = require('./person.schema');

const app = express();
app.use(express.json());
app.use(cors());

connectDB();

// 1. SEARCH USERS API
// Accessible via Gateway: GET http://localhost:4000/admin/searchuser?query=john
app.get('/searchuser', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Please provide a search query' });
    }

    // Search database for users matching name or emailid across all roles
    const users = await Person.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { emailid: { $regex: query, $options: 'i' } },
      ],
    }).select('-pass'); // Exclude password hashes from response

    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'No matching user records found' });
    }

    res.status(200).json({
      message: 'Users retrieved successfully',
      resultsCount: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 2. VIEW ALL USERS INFORMATION API
// Accessible via Gateway: GET http://localhost:4000/admin/viewalluser
app.get('/viewalluser', async (req, res) => {
  try {
    const users = await Person.find().select('-pass'); // Retrieve all records without passwords

    res.status(200).json({
      message: 'All user records retrieved successfully',
      totalUsers: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 3. DELETE A USER API
// Accessible via Gateway: DELETE http://localhost:4000/admin/deluser?emailid=user@example.com
app.delete('/deluser', async (req, res) => {
  try {
    const { emailid } = req.query;

    if (!emailid) {
      return res.status(400).json({ message: 'Please provide the emailid of the user to delete' });
    }

    const deletedUser = await Person.findOneAndDelete({ emailid });

    if (!deletedUser) {
      return res.status(404).json({ message: 'User record not found' });
    }

    res.status(200).json({
      message: `User with email '${emailid}' was deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Fixed Port: Set to 5003 to align with API Gateway target for '/admin'
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => console.log(`Admin Microservice running on port ${PORT}`));