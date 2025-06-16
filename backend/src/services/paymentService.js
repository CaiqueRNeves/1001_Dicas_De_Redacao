const logger = require('../utils/logger');
const { query, run } = require('../config/database');

// Configurações dos gateways de pagamento
const paymentGateways = {
  // Configuração exemplo - implementar com credenciais reais
  mercadopago: {
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY,
    webhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    mode: process.env.PAYPAL_MODE || 'sandbox'
  }
};

// Preços dos planos
const planPrices = {
  master: 40.00,
  vip: 50.00
};

// Criar pagamento PIX (simulado)
const createPixPayment = async (paymentData) => {
  try {
    const { amount, userEmail, userName, planType } = paymentData;
    
    // Gerar código PIX simulado
    const pixCode = generatePixCode();
    const qrCode = generateQRCode(pixCode);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
    
    const paymentRecord = {
      user_id: paymentData.user_id,
      amount,
      payment_method: 'pix',
      status: 'pending',
      transaction_id: pixCode,
      gateway: 'internal',
      gateway_response: JSON.stringify({
        pix_code: pixCode,
        qr_code: qrCode,
        expires_at: expiresAt
      }),
      expires_at: expiresAt.toISOString()
    };
    
    const result = await run(
      `INSERT INTO payments (user_id, amount, payment_method, status, transaction_id, gateway, gateway_response, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        paymentRecord.user_id,
        paymentRecord.amount,
        paymentRecord.payment_method,
        paymentRecord.status,
        paymentRecord.transaction_id,
        paymentRecord.gateway,
        paymentRecord.gateway_response,
        paymentRecord.expires_at
      ]
    );
    
    logger.payment(paymentData.user_id, amount, 'pix', 'pending', pixCode);
    
    return {
      success: true,
      paymentId: result.lastID,
      pixCode,
      qrCode,
      expiresAt,
      amount,
      status: 'pending'
    };
  } catch (error) {
    logger.error('Erro ao criar pagamento PIX:', error);
    throw error;
  }
};

// Criar pagamento com cartão (simulado)
const createCardPayment = async (paymentData) => {
  try {
    const { amount, cardData, userEmail, userName, planType } = paymentData;
    
    // Validar dados do cartão
    if (!isValidCard(cardData)) {
      throw new Error('Dados do cartão inválidos');
    }
    
    // Simular processamento do cartão
    const transactionId = generateTransactionId();
    const isApproved = simulateCardProcessing(cardData);
    
    const status = isApproved ? 'completed' : 'failed';
    const paidAt = isApproved ? new Date().toISOString() : null;
    
    const paymentRecord = {
      user_id: paymentData.user_id,
      amount,
      payment_method: cardData.type === 'credit' ? 'credit_card' : 'debit_card',
      status,
      transaction_id: transactionId,
      gateway: 'simulated',
      gateway_response: JSON.stringify({
        card_last_digits: cardData.number.slice(-4),
        authorization_code: isApproved ? generateAuthCode() : null,
        error_message: isApproved ? null : 'Cartão recusado'
      }),
      paid_at: paidAt
    };
    
    const result = await run(
      `INSERT INTO payments (user_id, amount, payment_method, status, transaction_id, gateway, gateway_response, paid_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        paymentRecord.user_id,
        paymentRecord.amount,
        paymentRecord.payment_method,
        paymentRecord.status,
        paymentRecord.transaction_id,
        paymentRecord.gateway,
        paymentRecord.gateway_response,
        paymentRecord.paid_at
      ]
    );
    
    logger.payment(paymentData.user_id, amount, paymentRecord.payment_method, status, transactionId);
    
    if (isApproved) {
      // Ativar assinatura
      await activateSubscription(paymentData.user_id, planType, result.lastID);
    }
    
    return {
      success: isApproved,
      paymentId: result.lastID,
      transactionId,
      status,
      message: isApproved ? 'Pagamento aprovado' : 'Pagamento recusado'
    };
  } catch (error) {
    logger.error('Erro ao processar pagamento com cartão:', error);
    throw error;
  }
};

// Criar boleto bancário (simulado)
const createBoletoPayment = async (paymentData) => {
  try {
    const { amount, userEmail, userName, planType } = paymentData;
    
    const boletoCode = generateBoletoCode();
    const barCode = generateBarCode();
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 dias
    
    const paymentRecord = {
      user_id: paymentData.user_id,
      amount,
      payment_method: 'boleto',
      status: 'pending',
      transaction_id: boletoCode,
      gateway: 'internal',
      gateway_response: JSON.stringify({
        boleto_code: boletoCode,
        bar_code: barCode,
        due_date: dueDate,
        bank_line: generateBankLine()
      }),
      expires_at: dueDate.toISOString()
    };
    
    const result = await run(
      `INSERT INTO payments (user_id, amount, payment_method, status, transaction_id, gateway, gateway_response, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        paymentRecord.user_id,
        paymentRecord.amount,
        paymentRecord.payment_method,
        paymentRecord.status,
        paymentRecord.transaction_id,
        paymentRecord.gateway,
        paymentRecord.gateway_response,
        paymentRecord.expires_at
      ]
    );
    
    logger.payment(paymentData.user_id, amount, 'boleto', 'pending', boletoCode);
    
    return {
      success: true,
      paymentId: result.lastID,
      boletoCode,
      barCode,
      dueDate,
      amount,
      status: 'pending'
    };
  } catch (error) {
    logger.error('Erro ao criar boleto:', error);
    throw error;
  }
};

// Confirmar pagamento PIX ou boleto
const confirmPayment = async (paymentId, confirmationData = {}) => {
  try {
    const payment = await query(
      'SELECT * FROM payments WHERE id = ?',
      [paymentId]
    );
    
    if (!payment.length) {
      throw new Error('Pagamento não encontrado');
    }
    
    const paymentRecord = payment[0];
    
    if (paymentRecord.status !== 'pending') {
      throw new Error('Pagamento não está pendente');
    }
    
    // Atualizar status do pagamento
    await run(
      'UPDATE payments SET status = ?, paid_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?',
      ['completed', paymentId]
    );
    
    // Obter dados da assinatura do carrinho ou deduzir do valor
    const planType = paymentRecord.amount === planPrices.vip ? 'vip' : 'master';
    
    // Ativar assinatura
    await activateSubscription(paymentRecord.user_id, planType, paymentId);
    
    logger.payment(paymentRecord.user_id, paymentRecord.amount, paymentRecord.payment_method, 'completed', paymentRecord.transaction_id);
    
    return {
      success: true,
      paymentId,
      status: 'completed',
      subscriptionActivated: true
    };
  } catch (error) {
    logger.error('Erro ao confirmar pagamento:', error);
    throw error;
  }
};

// Cancelar pagamento
const cancelPayment = async (paymentId, reason = 'Cancelado pelo usuário') => {
  try {
    const payment = await query(
      'SELECT * FROM payments WHERE id = ?',
      [paymentId]
    );
    
    if (!payment.length) {
      throw new Error('Pagamento não encontrado');
    }
    
    const paymentRecord = payment[0];
    
    if (paymentRecord.status === 'completed') {
      throw new Error('Não é possível cancelar pagamento já confirmado');
    }
    
    await run(
      'UPDATE payments SET status = ?, updated_at = datetime(\'now\') WHERE id = ?',
      ['cancelled', paymentId]
    );
    
    logger.info(`Pagamento ${paymentId} cancelado: ${reason}`);
    
    return {
      success: true,
      paymentId,
      status: 'cancelled',
      reason
    };
  } catch (error) {
    logger.error('Erro ao cancelar pagamento:', error);
    throw error;
  }
};

// Ativar assinatura após pagamento confirmado
const activateSubscription = async (userId, planType, paymentId) => {
  try {
    const Subscription = require('../models/Subscription');
    
    // Cancelar assinatura anterior se existir
    await run(
      'UPDATE subscriptions SET status = "cancelled" WHERE user_id = ? AND status = "active"',
      [userId]
    );
    
    // Criar nova assinatura
    const subscriptionData = {
      user_id: userId,
      plan_type: planType,
      payment_method: 'online'
    };
    
    const subscription = await Subscription.create(subscriptionData);
    
    // Associar pagamento à assinatura
    await run(
      'UPDATE payments SET subscription_id = ? WHERE id = ?',
      [subscription.id, paymentId]
    );
    
    // Atualizar referência do usuário
    await run(
      'UPDATE users SET subscription_id = ? WHERE id = ?',
      [subscription.id, userId]
    );
    
    logger.info(`Assinatura ativada: Usuário ${userId}, Plano ${planType}`);
    
    return subscription;
  } catch (error) {
    logger.error('Erro ao ativar assinatura:', error);
    throw error;
  }
};

// Buscar pagamento por ID
const getPaymentById = async (paymentId) => {
  try {
    const payment = await query(
      `SELECT p.*, u.name as user_name, u.email as user_email,
              s.plan_type as subscription_plan
       FROM payments p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN subscriptions s ON p.subscription_id = s.id
       WHERE p.id = ?`,
      [paymentId]
    );
    
    if (!payment.length) {
      return null;
    }
    
    const paymentData = payment[0];
    
    // Parse do gateway_response se for JSON
    try {
      paymentData.gateway_response = JSON.parse(paymentData.gateway_response);
    } catch {
      // Manter como string se não for JSON válido
    }
    
    return paymentData;
  } catch (error) {
    logger.error('Erro ao buscar pagamento:', error);
    throw error;
  }
};

// Listar pagamentos do usuário
const getUserPayments = async (userId, options = {}) => {
  try {
    const { page = 1, limit = 10, status } = options;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE p.user_id = ?';
    let params = [userId];
    
    if (status) {
      whereClause += ' AND p.status = ?';
      params.push(status);
    }
    
    const payments = await query(
      `SELECT p.*, s.plan_type as subscription_plan
       FROM payments p
       LEFT JOIN subscriptions s ON p.subscription_id = s.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    const totalResult = await query(
      `SELECT COUNT(*) as total FROM payments p ${whereClause}`,
      params
    );
    
    return {
      payments: payments.map(p => {
        try {
          p.gateway_response = JSON.parse(p.gateway_response);
        } catch {
          // Manter como string se não for JSON válido
        }
        return p;
      }),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult[0].total,
        totalPages: Math.ceil(totalResult[0].total / limit)
      }
    };
  } catch (error) {
    logger.error('Erro ao listar pagamentos do usuário:', error);
    throw error;
  }
};

// Funções auxiliares para simulação

// Gerar código PIX simulado
const generatePixCode = () => {
  return '00020126' + Date.now().toString() + Math.random().toString(36).substring(2);
};

// Gerar QR Code simulado
const generateQRCode = (pixCode) => {
  return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
};

// Gerar código de transação
const generateTransactionId = () => {
  return 'TXN' + Date.now() + Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Validar dados do cartão (simulado)
const isValidCard = (cardData) => {
  if (!cardData.number || cardData.number.length < 13) return false;
  if (!cardData.cvv || cardData.cvv.length < 3) return false;
  if (!cardData.expiryMonth || !cardData.expiryYear) return false;
  if (!cardData.holderName || cardData.holderName.length < 2) return false;
  
  // Verificar se cartão não está expirado
  const now = new Date();
  const expiryDate = new Date(parseInt(cardData.expiryYear), parseInt(cardData.expiryMonth) - 1);
  
  return expiryDate > now;
};

// Simular processamento do cartão
const simulateCardProcessing = (cardData) => {
  // Simular falha em 10% dos casos
  if (Math.random() < 0.1) return false;
  
  // Simular falha para cartões específicos (para testes)
  if (cardData.number.endsWith('0000')) return false;
  
  return true;
};

// Gerar código de autorização
const generateAuthCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Gerar código do boleto
const generateBoletoCode = () => {
  return '34191' + Date.now().toString().slice(-10) + '0' + Math.random().toString().slice(2, 6);
};

// Gerar código de barras
const generateBarCode = () => {
  return '34191' + '0' + Date.now().toString().slice(-4) + '00000' + planPrices.master.toString().replace('.', '') + '00000000';
};

// Gerar linha digitável do banco
const generateBankLine = () => {
  const boleto = generateBoletoCode();
  return `${boleto.slice(0, 5)}.${boleto.slice(5, 10)} ${boleto.slice(10, 15)}.${boleto.slice(15, 21)} ${boleto.slice(21, 26)}.${boleto.slice(26, 32)} ${boleto.slice(32, 33)} ${boleto.slice(33)}`;
};

// Verificar status de pagamentos expirados
const checkExpiredPayments = async () => {
  try {
    const expiredPayments = await query(
      'SELECT id FROM payments WHERE status = "pending" AND expires_at < datetime(\'now\')'
    );
    
    for (const payment of expiredPayments) {
      await run(
        'UPDATE payments SET status = "expired", updated_at = datetime(\'now\') WHERE id = ?',
        [payment.id]
      );
    }
    
    if (expiredPayments.length > 0) {
      logger.info(`${expiredPayments.length} pagamentos marcados como expirados`);
    }
    
    return expiredPayments.length;
  } catch (error) {
    logger.error('Erro ao verificar pagamentos expirados:', error);
    throw error;
  }
};

// Obter estatísticas de pagamentos
const getPaymentStatistics = async (options = {}) => {
  try {
    const { dateFrom, dateTo } = options;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (dateFrom) {
      whereClause += ' AND date(created_at) >= ?';
      params.push(dateFrom);
    }
    
    if (dateTo) {
      whereClause += ' AND date(created_at) <= ?';
      params.push(dateTo);
    }
    
    const [total, completed, pending, failed, cancelled] = await Promise.all([
      query(`SELECT COUNT(*) as count, SUM(amount) as total FROM payments ${whereClause}`, params),
      query(`SELECT COUNT(*) as count, SUM(amount) as total FROM payments ${whereClause} AND status = 'completed'`, params),
      query(`SELECT COUNT(*) as count, SUM(amount) as total FROM payments ${whereClause} AND status = 'pending'`, params),
      query(`SELECT COUNT(*) as count, SUM(amount) as total FROM payments ${whereClause} AND status = 'failed'`, params),
      query(`SELECT COUNT(*) as count, SUM(amount) as total FROM payments ${whereClause} AND status = 'cancelled'`, params)
    ]);
    
    const byMethod = await query(
      `SELECT payment_method, COUNT(*) as count, SUM(amount) as total 
       FROM payments ${whereClause} 
       GROUP BY payment_method`,
      params
    );
    
    return {
      total: {
        count: total[0].count,
        amount: total[0].total || 0
      },
      completed: {
        count: completed[0].count,
        amount: completed[0].total || 0
      },
      pending: {
        count: pending[0].count,
        amount: pending[0].total || 0
      },
      failed: {
        count: failed[0].count,
        amount: failed[0].total || 0
      },
      cancelled: {
        count: cancelled[0].count,
        amount: cancelled[0].total || 0
      },
      byMethod: byMethod.reduce((acc, item) => {
        acc[item.payment_method] = {
          count: item.count,
          amount: item.total || 0
        };
        return acc;
      }, {})
    };
  } catch (error) {
    logger.error('Erro ao obter estatísticas de pagamentos:', error);
    throw error;
  }
};

// Processar webhook (para integrações reais)
const processWebhook = async (gateway, payload, signature) => {
  try {
    // Verificar assinatura do webhook
    if (!verifyWebhookSignature(gateway, payload, signature)) {
      throw new Error('Assinatura do webhook inválida');
    }
    
    // Processar evento baseado no gateway
    switch (gateway) {
      case 'mercadopago':
        return await processMercadoPagoWebhook(payload);
      case 'stripe':
        return await processStripeWebhook(payload);
      default:
        throw new Error(`Gateway ${gateway} não suportado`);
    }
  } catch (error) {
    logger.error('Erro ao processar webhook:', error);
    throw error;
  }
};

// Verificar assinatura do webhook
const verifyWebhookSignature = (gateway, payload, signature) => {
  // Implementar verificação específica para cada gateway
  return true; // Simplificado para exemplo
};

// Processar webhook do Mercado Pago
const processMercadoPagoWebhook = async (payload) => {
  // Implementar lógica específica do Mercado Pago
  logger.info('Webhook Mercado Pago processado');
  return { success: true };
};

// Processar webhook do Stripe
const processStripeWebhook = async (payload) => {
  // Implementar lógica específica do Stripe
  logger.info('Webhook Stripe processado');
  return { success: true };
};

module.exports = {
  createPixPayment,
  createCardPayment,
  createBoletoPayment,
  confirmPayment,
  cancelPayment,
  getPaymentById,
  getUserPayments,
  checkExpiredPayments,
  getPaymentStatistics,
  processWebhook,
  planPrices
};