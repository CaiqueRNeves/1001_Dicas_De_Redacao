const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');

class SubscriptionController {
  // Criar assinatura
  static async createSubscription(req, res) {
    try {
      const { plan_type, payment_method = 'online', auto_renewal = true } = req.body;
      const user_id = req.user.id;

      if (!plan_type || !['master', 'vip'].includes(plan_type)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de plano inválido'
        });
      }

      // Verificar se usuário já tem assinatura ativa
      const existingSubscription = await Subscription.findActiveByUser(user_id);
      if (existingSubscription) {
        return res.status(400).json({
          success: false,
          message: 'Usuário já possui assinatura ativa'
        });
      }

      const subscriptionData = {
        user_id,
        plan_type,
        payment_method,
        auto_renewal
      };

      const subscription = await Subscription.create(subscriptionData);

      logger.info(`Assinatura criada: ID ${subscription.id}, Usuário: ${user_id}, Plano: ${plan_type}`);

      res.status(201).json({
        success: true,
        message: 'Assinatura criada com sucesso',
        data: subscription.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao criar assinatura:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Listar assinaturas
  static async getSubscriptions(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        user_id, 
        plan_type, 
        status,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        user_id,
        plan_type,
        status,
        sortBy,
        sortOrder
      };

      const result = await Subscription.findAll(options);

      res.json({
        success: true,
        data: result.subscriptions.map(sub => sub.toJSON()),
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro ao listar assinaturas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter assinatura por ID
  static async getSubscriptionById(req, res) {
    try {
      const { id } = req.params;
      const subscription = await Subscription.findById(id);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Assinatura não encontrada'
        });
      }

      // Verificar permissões
      if (req.user.role !== 'admin' && subscription.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      res.json({
        success: true,
        data: subscription.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao obter assinatura:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter assinatura ativa do usuário
  static async getUserActiveSubscription(req, res) {
    try {
      const userId = req.user.id;
      const subscription = await Subscription.findActiveByUser(userId);

      if (!subscription) {
        return res.json({
          success: true,
          data: null,
          message: 'Nenhuma assinatura ativa encontrada'
        });
      }

      res.json({
        success: true,
        data: subscription.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao obter assinatura ativa:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar assinatura
  static async updateSubscription(req, res) {
    try {
      const { id } = req.params;
      const { plan_type, auto_renewal, end_date } = req.body;

      const subscription = await Subscription.findById(id);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Assinatura não encontrada'
        });
      }

      // Verificar permissões
      if (req.user.role !== 'admin' && subscription.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      const updateData = {};
      if (plan_type && ['master', 'vip'].includes(plan_type)) {
        updateData.plan_type = plan_type;
      }
      if (auto_renewal !== undefined) {
        updateData.auto_renewal = auto_renewal;
      }
      if (end_date && req.user.role === 'admin') {
        updateData.end_date = end_date;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum campo válido para atualizar'
        });
      }

      await subscription.update(updateData);

      logger.info(`Assinatura atualizada: ID ${subscription.id} por ${req.user.email}`);

      res.json({
        success: true,
        message: 'Assinatura atualizada com sucesso',
        data: subscription.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao atualizar assinatura:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Cancelar assinatura
  static async cancelSubscription(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const subscription = await Subscription.findById(id);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Assinatura não encontrada'
        });
      }

      // Verificar permissões
      if (req.user.role !== 'admin' && subscription.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      if (subscription.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Assinatura não está ativa'
        });
      }

      await subscription.cancel();

      logger.info(`Assinatura cancelada: ID ${subscription.id} por ${req.user.email}, Motivo: ${reason || 'Não informado'}`);

      res.json({
        success: true,
        message: 'Assinatura cancelada com sucesso',
        data: subscription.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao cancelar assinatura:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Renovar assinatura
  static async renewSubscription(req, res) {
    try {
      const { id } = req.params;
      const { months = 1 } = req.body;

      const subscription = await Subscription.findById(id);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Assinatura não encontrada'
        });
      }

      // Verificar permissões (apenas admin pode renovar)
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      await subscription.renew(parseInt(months));

      logger.info(`Assinatura renovada: ID ${subscription.id} por ${months} meses por ${req.user.email}`);

      res.json({
        success: true,
        message: `Assinatura renovada por ${months} mês(es)`,
        data: subscription.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao renovar assinatura:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Suspender assinatura
  static async suspendSubscription(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const subscription = await Subscription.findById(id);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Assinatura não encontrada'
        });
      }

      // Apenas admin pode suspender
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      if (subscription.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Assinatura não está ativa'
        });
      }

      await subscription.suspend();

      logger.info(`Assinatura suspensa: ID ${subscription.id} por ${req.user.email}, Motivo: ${reason || 'Não informado'}`);

      res.json({
        success: true,
        message: 'Assinatura suspensa com sucesso',
        data: subscription.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao suspender assinatura:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Reativar assinatura
  static async reactivateSubscription(req, res) {
    try {
      const { id } = req.params;

      const subscription = await Subscription.findById(id);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Assinatura não encontrada'
        });
      }

      // Apenas admin pode reativar
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      if (subscription.status !== 'inactive') {
        return res.status(400).json({
          success: false,
          message: 'Assinatura não está suspensa'
        });
      }

      await subscription.reactivate();

      logger.info(`Assinatura reativada: ID ${subscription.id} por ${req.user.email}`);

      res.json({
        success: true,
        message: 'Assinatura reativada com sucesso',
        data: subscription.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao reativar assinatura:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter planos disponíveis
  static async getAvailablePlans(req, res) {
    try {
      const plans = {
        master: {
          name: 'Plano Master',
          price: 40.00,
          currency: 'BRL',
          period: 'mensal',
          features: [
            'Até 2 redações por semana',
            'Correção profissional detalhada',
            'Feedback personalizado',
            'Acesso a materiais gratuitos',
            'Suporte por email'
          ],
          recommended: false
        },
        vip: {
          name: 'Plano VIP',
          price: 50.00,
          currency: 'BRL',
          period: 'mensal',
          features: [
            'Até 4 redações por semana',
            'Correção profissional detalhada',
            'Feedback personalizado',
            'Acesso a materiais gratuitos',
            'Suporte prioritário',
            'Acesso antecipado a novos conteúdos'
          ],
          recommended: true
        }
      };

      res.json({
        success: true,
        data: plans
      });

    } catch (error) {
      logger.error('Erro ao obter planos disponíveis:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter estatísticas de assinaturas
  static async getSubscriptionStatistics(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;
      
      const options = {};
      if (dateFrom) options.dateFrom = dateFrom;
      if (dateTo) options.dateTo = dateTo;

      const stats = await Subscription.getStatistics(options);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Erro ao obter estatísticas de assinaturas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter assinaturas expirando
  static async getExpiringSubscriptions(req, res) {
    try {
      const { days = 7 } = req.query;

      const subscriptions = await Subscription.findExpiring(parseInt(days));

      res.json({
        success: true,
        data: subscriptions.map(sub => sub.toJSON()),
        period: `${days} dias`
      });

    } catch (error) {
      logger.error('Erro ao obter assinaturas expirando:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Processar assinaturas expiradas
  static async processExpiredSubscriptions(req, res) {
    try {
      const expiredCount = await Subscription.markExpired();

      logger.info(`${expiredCount} assinaturas marcadas como expiradas por ${req.user.email}`);

      res.json({
        success: true,
        message: `${expiredCount} assinaturas processadas`,
        data: { expiredCount }
      });

    } catch (error) {
      logger.error('Erro ao processar assinaturas expiradas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter receita por período
  static async getRevenueBytPeriod(req, res) {
    try {
      const { period = 'month' } = req.query;

      const revenue = await Subscription.getRevenueBypériod(period);

      res.json({
        success: true,
        data: revenue,
        period
      });

    } catch (error) {
      logger.error('Erro ao obter receita por período:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Comparar planos
  static async comparePlans(req, res) {
    try {
      const comparison = {
        features: [
          {
            feature: 'Redações por semana',
            master: '2',
            vip: '4'
          },
          {
            feature: 'Correção profissional',
            master: true,
            vip: true
          },
          {
            feature: 'Feedback detalhado',
            master: true,
            vip: true
          },
          {
            feature: 'Materiais gratuitos',
            master: true,
            vip: true
          },
          {
            feature: 'Suporte prioritário',
            master: false,
            vip: true
          },
          {
            feature: 'Acesso antecipado',
            master: false,
            vip: true
          }
        ],
        pricing: {
          master: {
            monthly: 40.00,
            annually: 480.00,
            savings: 0
          },
          vip: {
            monthly: 50.00,
            annually: 600.00,
            savings: 0
          }
        }
      };

      res.json({
        success: true,
        data: comparison
      });

    } catch (error) {
      logger.error('Erro ao comparar planos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Histórico de assinaturas do usuário
  static async getUserSubscriptionHistory(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        user_id: userId,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      };

      const result = await Subscription.findAll(options);

      res.json({
        success: true,
        data: result.subscriptions.map(sub => sub.toJSON()),
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro ao obter histórico de assinaturas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Verificar elegibilidade para upgrade/downgrade
  static async checkUpgradeEligibility(req, res) {
    try {
      const userId = req.user.id;
      const { targetPlan } = req.query;

      const currentSubscription = await Subscription.findActiveByUser(userId);

      if (!currentSubscription) {
        return res.json({
          success: true,
          data: {
            eligible: false,
            reason: 'Nenhuma assinatura ativa encontrada'
          }
        });
      }

      const eligible = currentSubscription.plan_type !== targetPlan;
      const isUpgrade = (currentSubscription.plan_type === 'master' && targetPlan === 'vip');
      const isDowngrade = (currentSubscription.plan_type === 'vip' && targetPlan === 'master');

      res.json({
        success: true,
        data: {
          eligible,
          currentPlan: currentSubscription.plan_type,
          targetPlan,
          isUpgrade,
          isDowngrade,
          daysRemaining: currentSubscription.getDaysRemaining()
        }
      });

    } catch (error) {
      logger.error('Erro ao verificar elegibilidade:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Simular cobrança de renovação
  static async simulateRenewal(req, res) {
    try {
      const { id } = req.params;

      const subscription = await Subscription.findById(id);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Assinatura não encontrada'
        });
      }

      // Verificar se tem auto_renewal ativo
      if (!subscription.auto_renewal) {
        return res.json({
          success: true,
          data: {
            willRenew: false,
            reason: 'Auto renovação desabilitada'
          }
        });
      }

      const nextBillingDate = new Date(subscription.end_date);
      const amount = subscription.plan_type === 'vip' ? 50.00 : 40.00;

      res.json({
        success: true,
        data: {
          willRenew: true,
          nextBillingDate: nextBillingDate.toISOString(),
          amount,
          planType: subscription.plan_type,
          paymentMethod: subscription.payment_method
        }
      });

    } catch (error) {
      logger.error('Erro ao simular renovação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = SubscriptionController;