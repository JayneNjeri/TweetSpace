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

// POST /contents - Create a new post
router.post('/', requireAuth, async (req, res) => {
  try {
    const { text, imageData, imageType } = req.body;
    
    if (!text && !imageData) {
      return res.status(400).json({ error: 'Post must contain text or an image' });
    }
    
    const db = getDB();
    const contentsCollection = db.collection('contents');
    
    // Create new content
    const newContent = {
      authorId: new ObjectId(req.user._id),
      authorUsername: req.user.username,
      text: text || '',
      timestamp: new Date(),
      likes: [],
      likesCount: 0,
      commentCount: 0
    };
    
    // If image data is provided, store it as binary
    if (imageData) {
      // Check if it's base64
      if (imageData.startsWith('data:image')) {
        // Extract base64 data
        const base64Data = imageData.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Store image in a separate collection or as binary
        const imagesCollection = db.collection('images');
        const imageResult = await imagesCollection.insertOne({
          data: buffer,
          contentType: imageType || 'image/jpeg',
          uploadedAt: new Date()
        });
        
        newContent.imageId = imageResult.insertedId;
      } else {
        newContent.imageUrl = imageData; // Assuming it's a URL
      }
    }
    
    const result = await contentsCollection.insertOne(newContent);
    
    res.status(201).json({
      message: 'Content created successfully',
      content: {
        ...newContent,
        _id: result.insertedId
      }
    });
  } catch (error) {
    console.error('Error creating content:', error);
    res.status(500).json({ error: 'Failed to create content' });
  }
});

// GET /contents - Get all contents or user-specific contents
router.get('/', async (req, res) => {
  try {
    const { userId, contentId } = req.query;
    const db = getDB();
    const contentsCollection = db.collection('contents');
    
    let query = {};
    
    // If contentId is provided, get specific content
    if (contentId) {
      const content = await contentsCollection.findOne({ _id: new ObjectId(contentId) });
      
      if (!content) {
        return res.status(404).json({ error: 'Content not found' });
      }
      
      // If content has imageId, fetch the image
      if (content.imageId) {
        const imagesCollection = db.collection('images');
        const image = await imagesCollection.findOne({ _id: content.imageId });
        if (image) {
          const base64Image = image.data.buffer.toString('base64');
          content.imageData = `data:${image.contentType};base64,${base64Image}`;
        }
      }
      
      return res.json({ content });
    }
    
    // If userId is provided, get user-specific contents
    if (userId) {
      query.authorId = new ObjectId(userId);
    }
    
    // Get contents sorted by most recent
    const contents = await contentsCollection
      .find(query)
      .sort({ timestamp: -1 })
      .toArray();
    
    if (contents.length === 0) {
      return res.json({ contents: [] });
    }
    
    // Fetch images and author profile pictures for contents
    const imagesCollection = db.collection('images');
    const usersCollection = db.collection('users');
    
    // Collect all unique author IDs
    const authorIds = [...new Set(contents.map(c => c.authorId.toString()))];
    
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
    
    // Get auth token once
    const token = req.headers.authorization?.replace('Bearer ', '');
    const session = token ? req.sessions?.get(token) : null;
    const currentUserId = session?.user?._id?.toString();
    
    // Process all contents
    for (let content of contents) {
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
      
      // Add isLiked status
      if (currentUserId) {
        content.isLiked = content.likes?.includes(currentUserId) || false;
      }
    }
    
    res.json({ contents });
  } catch (error) {
    console.error('Error fetching contents:', error);
    res.status(500).json({ error: 'Failed to fetch contents' });
  }
});

// POST /contents/like - Like a post (bonus feature)
router.post('/like', requireAuth, async (req, res) => {
  try {
    const { contentId } = req.body;
    
    if (!contentId) {
      return res.status(400).json({ error: 'Content ID is required' });
    }
    
    const db = getDB();
    const contentsCollection = db.collection('contents');
    
    const userId = req.user._id.toString();
    
    // Check if already liked
    const content = await contentsCollection.findOne({ _id: new ObjectId(contentId) });
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    const likes = content.likes || [];
    const hasLiked = likes.includes(userId);
    
    let update;
    if (hasLiked) {
      // Unlike
      update = {
        $pull: { likes: userId },
        $inc: { likesCount: -1 }
      };
    } else {
      // Like
      update = {
        $addToSet: { likes: userId },
        $inc: { likesCount: 1 }
      };
    }
    
    const result = await contentsCollection.updateOne(
      { _id: new ObjectId(contentId) },
      update
    );
    
    // Get updated content to return new count
    const updatedContent = await contentsCollection.findOne({ _id: new ObjectId(contentId) });
    
    console.log('Updated content:', updatedContent);
    console.log('Likes count:', updatedContent.likesCount);
    
    const response = {
      message: hasLiked ? 'Post unliked' : 'Post liked',
      liked: !hasLiked,
      likesCount: updatedContent.likesCount || 0
    };
    
    console.log('Sending response:', response);
    
    res.json(response);
  } catch (error) {
    console.error('Error liking content:', error);
    res.status(500).json({ error: 'Failed to like content' });
  }
});

module.exports = router;
