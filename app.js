const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/config/db');
const logger = require('./src/middleware/logger');
const userRoutes = require('./src/routes/userRoutes');
const assetRoutes = require('./src/routes/assetRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Dev logging middleware
app.use(logger);

// Mount routers
app.use('/api/users', userRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/bookings', bookingRoutes);

// Home route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Real Estate Asset Management API'
  });
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
}); 