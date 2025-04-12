const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to database
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded bodies

// Define Routes
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/projects', require('./routes/api/projects'));
app.use('/api/statuses', require('./routes/api/status'));
app.use('/api/cards', require('./routes/api/cards'));
app.use('/api/comments', require('./routes/api/comments'));
app.use('/api/tags', require('./routes/api/tags'));


// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Kanban API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Server Error'
  });
});

// Set port and start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});