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
    
    if (feedContents.length === 0) {
      return res.json({ feed: [], count: 0 });
    }
    
    // Fetch images and author profile pictures for contents
    const imagesCollection = db.collection('images');
    const usersCollection = db.collection('users');
    
    // Collect all unique author IDs
    const authorIds = [...new Set(feedContents.map(c => c.authorId.toString()))];
    
    // Fetch all authors in one query
    const authors = await usersCollection
      .find(
        { _id: { $in: authorIds.map(id => new ObjectId(id)) } },
        { projection: { profilePictureUrl: 1 } }
      )
      .toArray();
    
    // Create a map for quick lookup
    const authorMap = {};
    authors.forEach(author => {
      authorMap[author._id.toString()] = author.profilePictureUrl;
    });
    
    // Process all contents
    for (let content of feedContents) {
      // Fetch post image if exists
      if (content.imageId) {
        const image = await imagesCollection.findOne({ _id: content.imageId });
        if (image) {
          const base64Image = image.data.buffer.toString('base64');
          content.imageData = `data:${image.contentType};base64,${base64Image}`;
        }
      }
      
      // Add author profile picture from map
      const authorId = content.authorId.toString();
      if (authorMap[authorId]) {
        content.authorProfilePicture = authorMap[authorId];
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
