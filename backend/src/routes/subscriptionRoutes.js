const express = require('express');
const SubscriptionController = require('../controllers/subscriptionController');
const { 
  auth, 
  requireAdmin,
  requireOwnershipOrAdmin,
  logUserAction 
} = require('../middleware/auth');
const { 
  validateSubscription,
  validateParamId,
  sanitizeInput 
} = require('../middleware/validation');

const router = express.Router();

// Aplicar autenticação para todas as rotas
router.use(auth);

// Rotas gerais
router.get('/plans', SubscriptionController.getAvailablePlans);
router.get('/compare', SubscriptionController.comparePlans);

// Rotas do usuário atual
router.get('/active', 
  logUserAction('view_active_subscription'),
  SubscriptionController.getUserActiveSubscription
);

router.get('/history', 
  logUserAction('view_subscription_history'),
  SubscriptionController.getUserSubscriptionHistory
);

router.get('/eligibility', 
  SubscriptionController.checkUpgradeEligibility
);

// Rotas específicas por ID
router.get('/:id', 
  validateParamId('id'),
  requireOwnershipOrAdmin,
  SubscriptionController.getSubscriptionById
);

router.put('/:id', 
  validateParamId('id'),
  requireOwnershipOrAdmin,
  sanitizeInput,
  validateSubscription,
  logUserAction('update_subscription'),
  SubscriptionController.updateSubscription
);

router.put('/:id/cancel', 
  validateParamId('id'),
  requireOwnershipOrAdmin,
  logUserAction('cancel_subscription'),
  SubscriptionController.cancelSubscription
);

router.get('/:id/simulate-renewal', 
  validateParamId('id'),
  requireOwnershipOrAdmin,
  SubscriptionController.simulateRenewal
);

// Criar nova assinatura
router.post('/', 
  sanitizeInput,
  validateSubscription,
  logUserAction('create_subscription'),
  SubscriptionController.createSubscription
);

// Rotas administrativas
router.get('/admin/all', 
  requireAdmin,
  logUserAction('view_all_subscriptions'),
  SubscriptionController.getSubscriptions
);

router.get('/admin/statistics', 
  requireAdmin,
  logUserAction('view_subscription_statistics'),
  SubscriptionController.getSubscriptionStatistics
);

router.get('/admin/expiring', 
  requireAdmin,
  logUserAction('view_expiring_subscriptions'),
  SubscriptionController.getExpiringSubscriptions
);

router.post('/admin/process-expired', 
  requireAdmin,
  logUserAction('process_expired_subscriptions'),
  SubscriptionController.processExpiredSubscriptions
);

router.get('/admin/revenue', 
  requireAdmin,
  logUserAction('view_subscription_revenue'),
  SubscriptionController.getRevenueBytPeriod
);

router.put('/admin/:id/renew', 
  validateParamId('id'),
  requireAdmin,
  sanitizeInput,
  logUserAction('admin_renew_subscription'),
  SubscriptionController.renewSubscription
);

router.put('/admin/:id/suspend', 
  validateParamId('id'),
  requireAdmin,
  logUserAction('suspend_subscription'),
  SubscriptionController.suspendSubscription
);

router.put('/admin/:id/reactivate', 
  validateParamId('id'),
  requireAdmin,
  logUserAction('reactivate_subscription'),
  SubscriptionController.reactivateSubscription
);

module.exports = router;