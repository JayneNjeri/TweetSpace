const express = require('express');
const cors = require('cors');
const { connectDB, closeDB } = require('./database');
const userRoutes = require('./routes/users');
const loginRoutes = require('./routes/login');
const contentRoutes = require('./routes/contents');
const followRoutes = require('./routes/follow');
const feedRoutes = require('./routes/feed');
const commentRoutes = require('./routes/comments');

const app = express();
const PORT = 3000;
const STUDENT_ID = 'M01046675';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Simple session management (store sessions in memory)
const sessions = new Map();
app.use((req, res, next) => {
  req.sessions = sessions;
  next();
});

// Serve static HTML file
app.use(express.static('public'));

// API Routes
app.use(`/${STUDENT_ID}/users`, userRoutes);
app.use(`/${STUDENT_ID}/login`, loginRoutes);
app.use(`/${STUDENT_ID}/contents`, contentRoutes);
app.use(`/${STUDENT_ID}/follow`, followRoutes);
app.use(`/${STUDENT_ID}/feed`, feedRoutes);
app.use(`/${STUDENT_ID}/comments`, commentRoutes);

// Root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`API endpoints are available at http://localhost:${PORT}/${STUDENT_ID}/`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await closeDB();
  process.exit(0);
});

startServer();
