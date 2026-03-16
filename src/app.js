const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const routes = require('./routes/index');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { activityTracker } = require('./middleware/activityTracker');
const logger = require('./config/logger');

const app = express();

// Security Middleware
app.use(helmet());
app.use(mongoSanitize());

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// HTTP Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.http(message.trim()) }
}));

// Activity Tracker (inactivity logout)
app.use(activityTracker);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Rabanq API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1', routes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
