const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { ObjectId } = require('mongodb');

// Middleware to check authentication
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const session = req.sessions.get(token);
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  
  req.user = session.user;
  next();
}

// POST /follow - Follow a user
router.post('/', requireAuth, async (req, res) => {
  try {
    const { followingId } = req.body;
    
    if (!followingId) {
      return res.status(400).json({ error: 'Following user ID is required' });
    }
    
    const followerId = req.user._id.toString();
    
    // Check if trying to follow yourself
    if (followerId === followingId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }
    
    const db = getDB();
    const followsCollection = db.collection('follows');
    const usersCollection = db.collection('users');
    
    // Check if user to follow exists
    const userToFollow = await usersCollection.findOne({ _id: new ObjectId(followingId) });
    if (!userToFollow) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if already following
    const existingFollow = await followsCollection.findOne({
      followerId: new ObjectId(followerId),
      followingId: new ObjectId(followingId)
    });
    
    if (existingFollow) {
      return res.status(409).json({ error: 'Already following this user' });
    }
    
    // Create follow relationship
    const newFollow = {
      followerId: new ObjectId(followerId),
      followingId: new ObjectId(followingId),
      timestamp: new Date()
    };
    
    await followsCollection.insertOne(newFollow);
    
    // Update follower and following counts
    await usersCollection.updateOne(
      { _id: new ObjectId(followerId) },
      { $inc: { followingCount: 1 } }
    );
    
    await usersCollection.updateOne(
      { _id: new ObjectId(followingId) },
      { $inc: { followerCount: 1 } }
    );
    
    res.status(201).json({
      message: 'Successfully followed user',
      follow: newFollow
    });
  } catch (error) {
    console.error('Error following user:', error);
    if (error.code === 11000) {
      res.status(409).json({ error: 'Already following this user' });
    } else {
      res.status(500).json({ error: 'Failed to follow user' });
    }
  }
});

// DELETE /follow - Unfollow a user
router.delete('/', requireAuth, async (req, res) => {
  try {
    const { followingId } = req.body;
    
    if (!followingId) {
      return res.status(400).json({ error: 'Following user ID is required' });
    }
    
    const followerId = req.user._id.toString();
    
    const db = getDB();
    const followsCollection = db.collection('follows');
    const usersCollection = db.collection('users');
    
    // Check if follow relationship exists
    const existingFollow = await followsCollection.findOne({
      followerId: new ObjectId(followerId),
      followingId: new ObjectId(followingId)
    });
    
    if (!existingFollow) {
      return res.status(404).json({ error: 'Not following this user' });
    }
    
    // Delete follow relationship
    await followsCollection.deleteOne({
      followerId: new ObjectId(followerId),
      followingId: new ObjectId(followingId)
    });
    
    // Update follower and following counts
    await usersCollection.updateOne(
      { _id: new ObjectId(followerId) },
      { $inc: { followingCount: -1 } }
    );
    
    await usersCollection.updateOne(
      { _id: new ObjectId(followingId) },
      { $inc: { followerCount: -1 } }
    );
    
    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

module.exports = router;
