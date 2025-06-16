const Payment = require('../models/Payment');
const CartItem = require('../models/CartItem');
const paymentService = require('../services/paymentService');
const logger = require('../utils/logger');

class PaymentController {
  // Criar pagamento PIX
  static async createPixPayment(req, res) {
    try {
      const { planType } = req.body;
      const userId = req.user.id;

      if (!planType || !['master', 'vip'].includes(planType)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de plano inválido'
        });
      }

      const price = paymentService.planPrices[planType];
      
      const paymentData = {
        user_id: userId,
        amount: price,
        planType,
        userEmail: req.user.email,
        userName: req.user.name
      };

      const payment = await paymentService.createPixPayment(paymentData);

      res.json({
        success: true,
        message: 'Pagamento PIX criado com sucesso',
        data: payment
      });

    } catch (error) {
      logger.error('Erro ao criar pagamento PIX:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Criar pagamento com cartão
  static async createCardPayment(req, res) {
    try {
      const { planType, cardData } = req.body;
      const userId = req.user.id;

      if (!planType || !['master', 'vip'].includes(planType)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de plano inválido'
        });
      }

      if (!cardData || !cardData.number || !cardData.cvv || !cardData.holderName) {
        return res.status(400).json({
          success: false,
          message: 'Dados do cartão incompletos'
        });
      }

      const price = paymentService.planPrices[planType];
      
      const paymentData = {
        user_id: userId,
        amount: price,
        planType,
        cardData,
        userEmail: req.user.email,
        userName: req.user.name
      };

      const payment = await paymentService.createCardPayment(paymentData);

      res.json({
        success: payment.success,
        message: payment.message,
        data: payment
      });

    } catch (error) {
      logger.error('Erro ao processar pagamento com cartão:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Criar boleto bancário
  static async createBoletoPayment(req, res) {
    try {
      const { planType } = req.body;
      const userId = req.user.id;

      if (!planType || !['master', 'vip'].includes(planType)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de plano inválido'
        });
      }

      const price = paymentService.planPrices[planType];
      
      const paymentData = {
        user_id: userId,
        amount: price,
        planType,
        userEmail: req.user.email,
        userName: req.user.name
      };

      const payment = await paymentService.createBoletoPayment(paymentData);

      res.json({
        success: true,
        message: 'Boleto gerado com sucesso',
        data: payment
      });

    } catch (error) {
      logger.error('Erro ao gerar boleto:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Confirmar pagamento (PIX/Boleto)
  static async confirmPayment(req, res) {
    try {
      const { id } = req.params;
      const { confirmationData = {} } = req.body;

      const payment = await paymentService.getPaymentById(id);
      
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pagamento não encontrado'
        });
      }

      // Verificar se é do usuário ou se é admin
      if (req.user.role !== 'admin' && payment.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      const result = await paymentService.confirmPayment(id, confirmationData);

      // Enviar email de confirmação
      if (result.success && result.subscriptionActivated) {
        try {
          const emailService = require('../services/emailService');
          await emailService.sendSubscriptionCreatedEmail(
            req.user.email,
            req.user.name,
            payment.amount === 50 ? 'vip' : 'master',
            payment.amount
          );
        } catch (emailError) {
          logger.error('Erro ao enviar email de confirmação:', emailError);
        }
      }

      res.json({
        success: true,
        message: 'Pagamento confirmado com sucesso',
        data: result
      });

    } catch (error) {
      logger.error('Erro ao confirmar pagamento:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  }

  // Cancelar pagamento
  static async cancelPayment(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const payment = await paymentService.getPaymentById(id);
      
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pagamento não encontrado'
        });
      }

      // Verificar se é do usuário ou se é admin
      if (req.user.role !== 'admin' && payment.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      const result = await paymentService.cancelPayment(id, reason);

      res.json({
        success: true,
        message: 'Pagamento cancelado com sucesso',
        data: result
      });

    } catch (error) {
      logger.error('Erro ao cancelar pagamento:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  }

  // Obter pagamento por ID
  static async getPaymentById(req, res) {
    try {
      const { id } = req.params;

      const payment = await paymentService.getPaymentById(id);
      
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pagamento não encontrado'
        });
      }

      // Verificar se é do usuário ou se é admin
      if (req.user.role !== 'admin' && payment.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      res.json({
        success: true,
        data: payment
      });

    } catch (error) {
      logger.error('Erro ao obter pagamento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Listar pagamentos do usuário
  static async getUserPayments(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const userId = req.user.id;

      const options = { page, limit };
      if (status) options.status = status;

      const payments = await paymentService.getUserPayments(userId, options);

      res.json({
        success: true,
        data: payments.payments,
        pagination: payments.pagination
      });

    } catch (error) {
      logger.error('Erro ao listar pagamentos do usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Listar todos os pagamentos (admin)
  static async getAllPayments(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        paymentMethod, 
        dateFrom, 
        dateTo,
        userId
      } = req.query;

      const options = { page, limit };
      if (status) options.status = status;
      if (paymentMethod) options.payment_method = paymentMethod;
      if (dateFrom) options.dateFrom = dateFrom;
      if (dateTo) options.dateTo = dateTo;
      if (userId) options.user_id = userId;

      const payments = await Payment.findAll(options);

      res.json({
        success: true,
        data: payments.payments.map(payment => payment.toJSON()),
        pagination: payments.pagination
      });

    } catch (error) {
      logger.error('Erro ao listar pagamentos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter estatísticas de pagamentos (admin)
  static async getPaymentStatistics(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;
      
      const options = {};
      if (dateFrom) options.dateFrom = dateFrom;
      if (dateTo) options.dateTo = dateTo;

      const stats = await paymentService.getPaymentStatistics(options);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Erro ao obter estatísticas de pagamentos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Processar webhook de pagamento
  static async processWebhook(req, res) {
    try {
      const { gateway } = req.params;
      const signature = req.headers['x-signature'] || req.headers['signature'];
      const payload = req.body;

      const result = await paymentService.processWebhook(gateway, payload, signature);

      res.json({
        success: true,
        message: 'Webhook processado com sucesso',
        data: result
      });

    } catch (error) {
      logger.error('Erro ao processar webhook:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Erro ao processar webhook'
      });
    }
  }

  // Adicionar item ao carrinho
  static async addToCart(req, res) {
    try {
      const { planType, quantity = 1 } = req.body;
      const userId = req.user.id;

      if (!planType || !['master', 'vip'].includes(planType)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de plano inválido'
        });
      }

      const price = paymentService.planPrices[planType];

      const cartData = {
        user_id: userId,
        plan_type: planType,
        price,
        quantity
      };

      const cartItem = await CartItem.create(cartData);

      res.json({
        success: true,
        message: 'Item adicionado ao carrinho',
        data: cartItem.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao adicionar ao carrinho:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter carrinho do usuário
  static async getCart(req, res) {
    try {
      const userId = req.user.id;

      const cartItems = await CartItem.findByUser(userId);
      const cartSummary = await CartItem.getCheckoutSummary(userId);

      res.json({
        success: true,
        data: {
          items: cartItems.map(item => item.toJSON()),
          summary: cartSummary
        }
      });

    } catch (error) {
      logger.error('Erro ao obter carrinho:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Remover item do carrinho
  static async removeFromCart(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const cartItem = await CartItem.findById(id);

      if (!cartItem) {
        return res.status(404).json({
          success: false,
          message: 'Item não encontrado no carrinho'
        });
      }

      if (cartItem.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      await cartItem.remove();

      res.json({
        success: true,
        message: 'Item removido do carrinho'
      });

    } catch (error) {
      logger.error('Erro ao remover do carrinho:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Limpar carrinho
  static async clearCart(req, res) {
    try {
      const userId = req.user.id;

      const removed = await CartItem.clearUserCart(userId);

      res.json({
        success: true,
        message: `Carrinho limpo: ${removed} itens removidos`
      });

    } catch (error) {
      logger.error('Erro ao limpar carrinho:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Validar carrinho para checkout
  static async validateCartForCheckout(req, res) {
    try {
      const userId = req.user.id;

      const validation = await CartItem.validateCartForCheckout(userId);

      res.json({
        success: true,
        data: validation
      });

    } catch (error) {
      logger.error('Erro ao validar carrinho:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Checkout do carrinho
  static async checkoutCart(req, res) {
    try {
      const { paymentMethod, paymentData = {} } = req.body;
      const userId = req.user.id;

      // Validar carrinho
      const validation = await CartItem.validateCartForCheckout(userId);
      
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message
        });
      }

      // Obter itens do carrinho
      const cartItems = await CartItem.findByUser(userId);
      
      if (cartItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Carrinho vazio'
        });
      }

      // Por simplificação, assumir que só há um item (assinatura)
      const cartItem = cartItems[0];
      
      let payment;

      switch (paymentMethod) {
        case 'pix':
          payment = await paymentService.createPixPayment({
            user_id: userId,
            amount: cartItem.price,
            planType: cartItem.plan_type,
            userEmail: req.user.email,
            userName: req.user.name
          });
          break;
          
        case 'credit_card':
        case 'debit_card':
          payment = await paymentService.createCardPayment({
            user_id: userId,
            amount: cartItem.price,
            planType: cartItem.plan_type,
            cardData: paymentData,
            userEmail: req.user.email,
            userName: req.user.name
          });
          break;
          
        case 'boleto':
          payment = await paymentService.createBoletoPayment({
            user_id: userId,
            amount: cartItem.price,
            planType: cartItem.plan_type,
            userEmail: req.user.email,
            userName: req.user.name
          });
          break;
          
        default:
          return res.status(400).json({
            success: false,
            message: 'Método de pagamento inválido'
          });
      }

      // Limpar carrinho após checkout bem-sucedido
      if (payment.success !== false) {
        await CartItem.clearUserCart(userId);
      }

      res.json({
        success: payment.success !== false,
        message: payment.message || 'Checkout realizado com sucesso',
        data: payment
      });

    } catch (error) {
      logger.error('Erro no checkout:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter métodos de pagamento disponíveis
  static async getPaymentMethods(req, res) {
    try {
      const methods = [
        {
          id: 'pix',
          name: 'PIX',
          description: 'Pagamento instantâneo',
          processingTime: 'Imediato',
          fees: 'Sem taxas'
        },
        {
          id: 'credit_card',
          name: 'Cartão de Crédito',
          description: 'Visa, Mastercard, Elo',
          processingTime: 'Imediato',
          fees: 'Sem taxas'
        },
        {
          id: 'debit_card',
          name: 'Cartão de Débito',
          description: 'Débito online',
          processingTime: 'Imediato',
          fees: 'Sem taxas'
        },
        {
          id: 'boleto',
          name: 'Boleto Bancário',
          description: 'Pagamento em qualquer banco',
          processingTime: 'Até 3 dias úteis',
          fees: 'Sem taxas'
        }
      ];

      res.json({
        success: true,
        data: methods
      });

    } catch (error) {
      logger.error('Erro ao obter métodos de pagamento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter preços dos planos
  static async getPlanPrices(req, res) {
    try {
      const prices = {
        master: {
          price: paymentService.planPrices.master,
          currency: 'BRL',
          period: 'mensal',
          features: [
            'Até 2 redações por semana',
            'Correção profissional',
            'Feedback detalhado',
            'Materiais gratuitos'
          ]
        },
        vip: {
          price: paymentService.planPrices.vip,
          currency: 'BRL',
          period: 'mensal',
          features: [
            'Até 4 redações por semana',
            'Correção profissional',
            'Feedback detalhado',
            'Materiais gratuitos',
            'Prioridade no atendimento'
          ]
        }
      };

      res.json({
        success: true,
        data: prices
      });

    } catch (error) {
      logger.error('Erro ao obter preços:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Reprocessar pagamento falhado (admin)
  static async retryPayment(req, res) {
    try {
      const { id } = req.params;

      const payment = await paymentService.getPaymentById(id);
      
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pagamento não encontrado'
        });
      }

      if (payment.status !== 'failed') {
        return res.status(400).json({
          success: false,
          message: 'Pagamento não está com status de falha'
        });
      }

      // Aqui implementaria a lógica de retry específica para cada gateway
      // Por simplicidade, vamos apenas atualizar o status

      logger.info(`Retry de pagamento iniciado: ${id} por ${req.user.email}`);

      res.json({
        success: true,
        message: 'Retry de pagamento iniciado',
        data: { paymentId: id }
      });

    } catch (error) {
      logger.error('Erro ao fazer retry do pagamento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Exportar relatório de pagamentos (admin)
  static async exportPayments(req, res) {
    try {
      const { format = 'csv', dateFrom, dateTo, status } = req.query;

      const options = { limit: 10000 };
      if (dateFrom) options.dateFrom = dateFrom;
      if (dateTo) options.dateTo = dateTo;
      if (status) options.status = status;

      const payments = await Payment.findAll(options);

      const data = payments.payments.map(payment => ({
        id: payment.id,
        usuario: payment.user_name,
        email: payment.user_email,
        valor: payment.amount,
        metodo: payment.payment_method,
        status: payment.status,
        criado_em: payment.created_at,
        pago_em: payment.paid_at
      }));

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `pagamentos-${timestamp}`;

      if (format === 'csv') {
        const csv = convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send('\ufeff' + csv); // BOM para UTF-8
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        res.json({
          exportInfo: {
            exportedAt: new Date().toISOString(),
            recordCount: data.length,
            filters: { dateFrom, dateTo, status }
          },
          data
        });
      }

      logger.info(`Relatório de pagamentos exportado por ${req.user.email}: ${data.length} registros`);

    } catch (error) {
      logger.error('Erro ao exportar pagamentos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

// Função auxiliar para converter para CSV
function convertToCSV(data) {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header] || '';
        // Escapar vírgulas e aspas
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
}

module.exports = PaymentController;