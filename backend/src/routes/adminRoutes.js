const express = require('express');
const AdminController = require('../controllers/adminController');
const { 
  adminAuth, 
  requireAdminPermission,
  requireAdminConfirmation,
  logAdminAction,
  detectSuspiciousActivity,
  adminRateLimit,
  notifyOtherAdmins,
  autoBackupBeforeDestruction
} = require('../middleware/adminAuth');
const { 
  validateSiteSettings,
  validateParamId,
  sanitizeInput 
} = require('../middleware/validation');
const { imageUpload, handleUploadError } = require('../config/multer');

const router = express.Router();

// Aplicar autenticação admin para todas as rotas
router.use(adminAuth);
router.use(detectSuspiciousActivity);
router.use(adminRateLimit(50, 15 * 60 * 1000)); // 50 requests por 15 min

// Dashboard e métricas
router.get('/dashboard', 
  logAdminAction('view_dashboard'),
  AdminController.getDashboard
);

router.get('/metrics', 
  requireAdminPermission('site.view'),
  logAdminAction('view_metrics'),
  AdminController.getSystemMetrics
);

router.get('/statistics', 
  requireAdminPermission('site.view'),
  logAdminAction('view_statistics'),
  AdminController.getDetailedStats
);

// Relatórios e atividades
router.get('/activity-report', 
  requireAdminPermission('site.view'),
  logAdminAction('view_activity_report'),
  AdminController.getActivityReport
);

router.get('/performance', 
  requireAdminPermission('site.view'),
  AdminController.getPerformanceMetrics
);

// Configurações do site
router.get('/settings', 
  requireAdminPermission('site.configure'),
  AdminController.getSiteSettings
);

router.put('/settings', 
  requireAdminPermission('site.configure'),
  requireAdminConfirmation,
  sanitizeInput,
  validateSiteSettings,
  logAdminAction('update_site_settings'),
  notifyOtherAdmins('site_settings_update'),
  AdminController.updateSiteSetting
);

router.post('/settings/backup', 
  requireAdminPermission('site.configure'),
  logAdminAction('backup_settings'),
  AdminController.backupSettings
);

router.post('/settings/restore', 
  requireAdminPermission('site.configure'),
  requireAdminConfirmation,
  autoBackupBeforeDestruction,
  logAdminAction('restore_settings'),
  notifyOtherAdmins('settings_restore'),
  AdminController.restoreSettings
);

router.post('/settings/reset', 
  requireAdminPermission('site.configure'),
  requireAdminConfirmation,
  autoBackupBeforeDestruction,
  logAdminAction('reset_settings'),
  notifyOtherAdmins('settings_reset'),
  AdminController.resetSettings
);

// Logs do sistema
router.get('/logs', 
  requireAdminPermission('site.view'),
  logAdminAction('view_system_logs'),
  AdminController.getSystemLogs
);

// Limpeza e manutenção
router.post('/cleanup', 
  requireAdminPermission('site.manage'),
  requireAdminConfirmation,
  logAdminAction('data_cleanup'),
  AdminController.cleanupData
);

// Email em massa
router.post('/bulk-email', 
  requireAdminPermission('site.manage'),
  requireAdminConfirmation,
  sanitizeInput,
  logAdminAction('send_bulk_email'),
  notifyOtherAdmins('bulk_email_sent'),
  AdminController.sendBulkEmail
);

// Exportação de dados
router.get('/export/:type', 
  requireAdminPermission('site.view'),
  logAdminAction('export_data'),
  AdminController.exportData
);

module.exports = router;