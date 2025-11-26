const { MongoClient } = require('mongodb');

// MongoDB Atlas connection URL and database name
// Paste your MongoDB Atlas connection string below
const url = 'mongodb+srv://jaynenjeri739_db_user:CyqSTILCYsJU72Ze@cluster0.uhikndc.mongodb.net/?appName=Cluster0';
const dbName = 'socialNetworkDB';

let db = null;
let client = null;

// Connect to MongoDB
async function connectDB() {
  try {
    client = new MongoClient(url);
    await client.connect();
    console.log('Connected successfully to MongoDB');
    
    db = client.db(dbName);
    
    // Create indexes for better performance
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('contents').createIndex({ authorId: 1 });
    await db.collection('contents').createIndex({ timestamp: -1 });
    await db.collection('follows').createIndex({ followerId: 1 });
    await db.collection('follows').createIndex({ followingId: 1 });
    await db.collection('follows').createIndex({ followerId: 1, followingId: 1 }, { unique: true });
    
    return db;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

// Get database instance
function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
}

// Close database connection
async function closeDB() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

module.exports = {
  connectDB,
  getDB,
  closeDB
};
