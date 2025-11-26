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

// GET /feed - Get personalized feed from followed users
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const db = getDB();
    
    // Get list of users the current user follows
    const followsCollection = db.collection('follows');
    const follows = await followsCollection
      .find({ followerId: new ObjectId(userId) })
      .toArray();
    
    // Extract the IDs of users being followed
    const followingIds = follows.map(f => f.followingId);
    
    if (followingIds.length === 0) {
      return res.json({
        message: 'No posts in feed. Start following users to see their posts!',
        feed: []
      });
    }
    
    // Get contents from followed users
    const contentsCollection = db.collection('contents');
    const feedContents = await contentsCollection
      .find({ authorId: { $in: followingIds } })
      .sort({ timestamp: -1 })
      .toArray();
    
    // Fetch images for contents that have imageId
    const imagesCollection = db.collection('images');
    for (let content of feedContents) {
      if (content.imageId) {
        const image = await imagesCollection.findOne({ _id: content.imageId });
        if (image) {
          const base64Image = image.data.buffer.toString('base64');
          content.imageData = `data:${image.contentType};base64,${base64Image}`;
        }
      }
      
      // Check if current user has liked this post
      const likes = content.likes || [];
      content.isLiked = likes.includes(userId);
    }
    
    res.json({
      feed: feedContents,
      count: feedContents.length
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

module.exports = router;
