const express = require('express');
const path = require('path');

// Middlewares personalizados
const errorHandler = require('./middleware/errorHandler');
const lgpdCompliance = require('./middleware/lgpd');

// Rotas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const essayRoutes = require('./routes/essayRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const materialRoutes = require('./routes/materialRoutes');
const postRoutes = require('./routes/postRoutes');
const videoRoutes = require('./routes/videoRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const messageRoutes = require('./routes/messageRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const publicRoutes = require('./routes/publicRoutes');

const app = express();

// Middleware LGPD
app.use(lgpdCompliance);

// Rota de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Servidor funcionando',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/essays', essayRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/public', publicRoutes);

// Rota 404 para API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint não encontrado',
    path: req.originalUrl
  });
});

// Rota principal
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API 1001 Dicas de Redação',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      admin: '/api/admin',
      essays: '/api/essays',
      subscriptions: '/api/subscriptions',
      materials: '/api/materials',
      posts: '/api/posts',
      videos: '/api/videos',
      payments: '/api/payments',
      messages: '/api/messages',
      dashboard: '/api/dashboard',
      public: '/api/public'
    }
  });
});

// Middleware de tratamento de erros (deve ser o último)
app.use(errorHandler);

module.exports = app;