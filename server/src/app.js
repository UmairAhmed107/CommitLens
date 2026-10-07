// Express Application Configuration (System Design Section 1.2, 4.0)
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const requirementRoutes = require('./routes/requirementRoutes');
const testRoutes = require('./routes/testRoutes');
const gitRoutes = require('./routes/gitRoutes');
const mappingRoutes = require('./routes/mappingRoutes');
const bugRoutes = require('./routes/bugRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Core Middleware
app.use(cors());
app.use(express.json());

// System Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'SCIT API', timestamp: new Date() });
});

// Mount API routes under /api
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', requirementRoutes);
app.use('/api', testRoutes);
app.use('/api', gitRoutes);
app.use('/api', mappingRoutes);
app.use('/api', bugRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', reportRoutes);

// Catch-all 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    details: [`Cannot ${req.method} ${req.originalUrl}`]
  });
});

// Central error handler
app.use(errorHandler);

module.exports = app;
