const express = require('express');
const PaymentController = require('../controllers/paymentController');
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

// Rotas públicas (sem autenticação)
router.get('/methods', PaymentController.getPaymentMethods);
router.get('/plans', PaymentController.getPlanPrices);

// Webhook para gateways de pagamento (sem autenticação)
router.post('/webhook/:gateway', PaymentController.processWebhook);

// Aplicar autenticação para rotas protegidas
router.use(auth);

// Rotas de carrinho
router.get('/cart', 
  logUserAction('view_cart'),
  PaymentController.getCart
);

router.post('/cart/add', 
  sanitizeInput,
  validateSubscription,
  logUserAction('add_to_cart'),
  PaymentController.addToCart
);

router.delete('/cart/:id', 
  validateParamId('id'),
  logUserAction('remove_from_cart'),
  PaymentController.removeFromCart
);

router.delete('/cart/clear', 
  logUserAction('clear_cart'),
  PaymentController.clearCart
);

router.get('/cart/validate', 
  PaymentController.validateCartForCheckout
);

router.post('/cart/checkout', 
  sanitizeInput,
  logUserAction('checkout'),
  PaymentController.checkoutCart
);

// Rotas de pagamento
router.post('/pix', 
  sanitizeInput,
  validateSubscription,
  logUserAction('create_pix_payment'),
  PaymentController.createPixPayment
);

router.post('/card', 
  sanitizeInput,
  validateSubscription,
  logUserAction('create_card_payment'),
  PaymentController.createCardPayment
);

router.post('/boleto', 
  sanitizeInput,
  validateSubscription,
  logUserAction('create_boleto_payment'),
  PaymentController.createBoletoPayment
);

// Rotas específicas por ID
router.get('/:id', 
  validateParamId('id'),
  requireOwnershipOrAdmin,
  PaymentController.getPaymentById
);

router.put('/:id/confirm', 
  validateParamId('id'),
  requireOwnershipOrAdmin,
  logUserAction('confirm_payment'),
  PaymentController.confirmPayment
);

router.put('/:id/cancel', 
  validateParamId('id'),
  requireOwnershipOrAdmin,
  logUserAction('cancel_payment'),
  PaymentController.cancelPayment
);

// Rotas do usuário
router.get('/user/payments', 
  logUserAction('view_user_payments'),
  PaymentController.getUserPayments
);

// Rotas administrativas
router.get('/admin/all', 
  requireAdmin,
  logUserAction('view_all_payments'),
  PaymentController.getAllPayments
);

router.get('/admin/statistics', 
  requireAdmin,
  logUserAction('view_payment_statistics'),
  PaymentController.getPaymentStatistics
);

router.put('/admin/:id/retry', 
  validateParamId('id'),
  requireAdmin,
  logUserAction('retry_payment'),
  PaymentController.retryPayment
);

router.get('/admin/export', 
  requireAdmin,
  logUserAction('export_payments'),
  PaymentController.exportPayments
);

module.exports = router;