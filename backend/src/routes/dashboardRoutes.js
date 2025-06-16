const express = require('express');
const DashboardController = require('../controllers/dashboardController');
const { 
  auth, 
  requireAdmin, 
  logUserAction,
  updateLastAccess 
} = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação para todas as rotas
router.use(auth);
router.use(updateLastAccess);

// Dashboard do usuário
router.get('/user', 
  logUserAction('view_user_dashboard'),
  DashboardController.getUserDashboard
);

// Dashboard do admin (apenas para admins)
router.get('/admin', 
  requireAdmin,
  logUserAction('view_admin_dashboard'),
  DashboardController.getAdminDashboard
);

// Métricas de performance (apenas para admins)
router.get('/performance', 
  requireAdmin,
  logUserAction('view_performance_metrics'),
  DashboardController.getPerformanceMetrics
);

// Analytics de usuários (apenas para admins)
router.get('/user-analytics', 
  requireAdmin,
  logUserAction('view_user_analytics'),
  DashboardController.getUserAnalytics
);

// Relatório de receita (apenas para admins)
router.get('/revenue', 
  requireAdmin,
  logUserAction('view_revenue_report'),
  DashboardController.getRevenueReport
);

// Estatísticas de conteúdo (apenas para admins)
router.get('/content-stats', 
  requireAdmin,
  logUserAction('view_content_stats'),
  DashboardController.getContentStats
);

// Alertas do sistema (apenas para admins)
router.get('/alerts', 
  requireAdmin,
  logUserAction('view_system_alerts'),
  DashboardController.getSystemAlerts
);

module.exports = router;