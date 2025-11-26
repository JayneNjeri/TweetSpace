const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { ObjectId } = require('mongodb');

// POST /users - Register a new user
router.post('/', async (req, res) => {
  try {
    const { username, email, password, bio } = req.body;
    
    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    const db = getDB();
    const usersCollection = db.collection('users');
    
    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      $or: [{ username }, { email }]
    });
    
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    
    // Create new user
    const newUser = {
      username,
      email,
      password, // Note: In production, this should be hashed
      bio: bio || '',
      profilePictureUrl: '',
      createdDate: new Date(),
      followerCount: 0,
      followingCount: 0
    };
    
    const result = await usersCollection.insertOne(newUser);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      message: 'User created successfully',
      user: {
        ...userWithoutPassword,
        _id: result.insertedId
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 11000) {
      res.status(409).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

// GET /users - Get all users or search users
router.get('/', async (req, res) => {
  try {
    const { search, userId } = req.query;
    const db = getDB();
    const usersCollection = db.collection('users');
    
    let query = {};
    
    // If search parameter is provided, search by username
    if (search) {
      query = {
        username: { $regex: search, $options: 'i' }
      };
    }
    
    // Get users
    const users = await usersCollection
      .find(query)
      .project({ password: 0 }) // Exclude password
      .toArray();
    
    // If userId is provided, add follow status for each user
    if (userId) {
      const followsCollection = db.collection('follows');
      const follows = await followsCollection
        .find({ followerId: new ObjectId(userId) })
        .toArray();
      
      const followingIds = follows.map(f => f.followingId.toString());
      
      users.forEach(user => {
        user.isFollowing = followingIds.includes(user._id.toString());
      });
    }
    
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;
