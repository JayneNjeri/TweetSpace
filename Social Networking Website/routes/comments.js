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

// POST /comments - Add a comment to a post
router.post('/', requireAuth, async (req, res) => {
  try {
    const { contentId, text } = req.body;
    
    if (!contentId || !text) {
      return res.status(400).json({ error: 'Content ID and comment text are required' });
    }
    
    if (text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }
    
    const db = getDB();
    const commentsCollection = db.collection('comments');
    const contentsCollection = db.collection('contents');
    
    // Check if the post exists
    const content = await contentsCollection.findOne({ _id: new ObjectId(contentId) });
    if (!content) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Create the comment
    const newComment = {
      contentId: new ObjectId(contentId),
      authorId: new ObjectId(req.user._id),
      authorUsername: req.user.username,
      text: text.trim(),
      timestamp: new Date()
    };
    
    const result = await commentsCollection.insertOne(newComment);
    
    // Update comment count on the post
    await contentsCollection.updateOne(
      { _id: new ObjectId(contentId) },
      { $inc: { commentCount: 1 } }
    );
    
    res.status(201).json({
      message: 'Comment added successfully',
      comment: {
        ...newComment,
        _id: result.insertedId
      }
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// GET /comments/:contentId - Get all comments for a post
router.get('/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    
    const db = getDB();
    const commentsCollection = db.collection('comments');
    const usersCollection = db.collection('users');
    
    const comments = await commentsCollection
      .find({ contentId: new ObjectId(contentId) })
      .sort({ timestamp: -1 })
      .toArray();
    
    if (comments.length > 0) {
      // Collect all unique author IDs
      const authorIds = [...new Set(comments.map(c => c.authorId.toString()))];
      
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
      
      // Add profile pictures to comments
      comments.forEach(comment => {
        const authorId = comment.authorId.toString();
        if (authorMap[authorId]) {
          comment.authorProfilePicture = authorMap[authorId];
        }
      });
    }
    
    res.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// DELETE /comments/:id - Delete a comment
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = getDB();
    const commentsCollection = db.collection('comments');
    const contentsCollection = db.collection('contents');
    
    // Find the comment
    const comment = await commentsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Check if user is the author of the comment
    if (comment.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }
    
    // Delete the comment
    await commentsCollection.deleteOne({ _id: new ObjectId(id) });
    
    // Update comment count on the post
    await contentsCollection.updateOne(
      { _id: comment.contentId },
      { $inc: { commentCount: -1 } }
    );
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;
