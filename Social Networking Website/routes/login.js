const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const crypto = require('crypto');

// Helper function to generate session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// GET /login - Check if user is logged in
router.get('/', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ loggedIn: false, message: 'No session token provided' });
    }
    
    const session = req.sessions.get(token);
    
    if (!session) {
      return res.status(401).json({ loggedIn: false, message: 'Invalid or expired session' });
    }
    
    res.json({
      loggedIn: true,
      user: session.user
    });
  } catch (error) {
    console.error('Error checking login status:', error);
    res.status(500).json({ error: 'Failed to check login status' });
  }
});

// POST /login - Login user
router.post('/', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const db = getDB();
    const usersCollection = db.collection('users');
    
    // Find user by username
    const user = await usersCollection.findOne({ username });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Check password (in production, compare hashed passwords)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Generate session token
    const token = generateSessionToken();
    
    // Store session
    const { password: _, ...userWithoutPassword } = user;
    req.sessions.set(token, {
      user: userWithoutPassword,
      createdAt: new Date()
    });
    
    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// DELETE /login - Logout user
router.delete('/', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(400).json({ error: 'No session token provided' });
    }
    
    const session = req.sessions.get(token);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Remove session
    req.sessions.delete(token);
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

module.exports = router;
