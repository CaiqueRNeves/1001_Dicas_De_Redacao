const { query, queryOne, run } = require('../config/database');
const logger = require('../utils/logger');

class Subscription {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.plan_type = data.plan_type;
    this.status = data.status || 'active';
    this.start_date = data.start_date;
    this.end_date = data.end_date;
    this.price = data.price;
    this.payment_method = data.payment_method;
    this.auto_renewal = data.auto_renewal;
    this.created_at = data.created_at;
  }

  // Criar nova assinatura
  static async create(subscriptionData) {
    try {
      const { 
        user_id, 
        plan_type, 
        payment_method,
        auto_renewal = true 
      } = subscriptionData;

      // Definir preços dos planos
      const planPrices = {
        master: 40.00,
        vip: 50.00
      };

      const price = planPrices[plan_type];
      if (!price) {
        throw new Error('Tipo de plano inválido');
      }

      // Calcular datas
      const start_date = new Date().toISOString().split('T')[0];
      const end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Desativar assinatura anterior se existir
      await run(
        'UPDATE subscriptions SET status = "cancelled" WHERE user_id = ? AND status = "active"',
        [user_id]
      );

      const result = await run(
        `INSERT INTO subscriptions (
          user_id, plan_type, status, start_date, end_date, 
          price, payment_method, auto_renewal, created_at
        ) VALUES (?, ?, 'active', ?, ?, ?, ?, ?, datetime('now'))`,
        [user_id, plan_type, start_date, end_date, price, payment_method, auto_renewal]
      );

      // Atualizar referência na tabela users
      await run(
        'UPDATE users SET subscription_id = ? WHERE id = ?',
        [result.lastID, user_id]
      );

      const newSubscription = await Subscription.findById(result.lastID);
      logger.info(`Assinatura criada: ID ${result.lastID}, Usuário ${user_id}, Plano ${plan_type}`);
      
      return newSubscription;
    } catch (error) {
      logger.error('Erro ao criar assinatura:', error);
      throw error;
    }
  }

  // Buscar assinatura por ID
  static async findById(id) {
    try {
      const subscriptionData = await queryOne(
        `SELECT s.*, u.name as user_name, u.email as user_email 
         FROM subscriptions s 
         JOIN users u ON s.user_id = u.id 
         WHERE s.id = ?`,
        [id]
      );
      return subscriptionData ? new Subscription(subscriptionData) : null;
    } catch (error) {
      logger.error('Erro ao buscar assinatura por ID:', error);
      throw error;
    }
  }

  // Buscar assinatura ativa por usuário
  static async findActiveByUser(userId) {
    try {
      const subscriptionData = await queryOne(
        `SELECT s.*, u.name as user_name, u.email as user_email 
         FROM subscriptions s 
         JOIN users u ON s.user_id = u.id 
         WHERE s.user_id = ? AND s.status = 'active' AND s.end_date > date('now')`,
        [userId]
      );
      return subscriptionData ? new Subscription(subscriptionData) : null;
    } catch (error) {
      logger.error('Erro ao buscar assinatura ativa:', error);
      throw error;
    }
  }

  // Listar todas as assinaturas
  static async findAll(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        user_id, 
        plan_type, 
        status,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;
      
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      let params = [];

      if (user_id) {
        whereClause += ' AND s.user_id = ?';
        params.push(user_id);
      }

      if (plan_type) {
        whereClause += ' AND s.plan_type = ?';
        params.push(plan_type);
      }

      if (status) {
        whereClause += ' AND s.status = ?';
        params.push(status);
      }

      const subscriptions = await query(
        `SELECT s.*, u.name as user_name, u.email as user_email
         FROM subscriptions s 
         JOIN users u ON s.user_id = u.id
         ${whereClause}
         ORDER BY s.${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const totalResult = await queryOne(
        `SELECT COUNT(*) as total FROM subscriptions s ${whereClause}`,
        params
      );

      return {
        subscriptions: subscriptions.map(data => new Subscription(data)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResult.total,
          totalPages: Math.ceil(totalResult.total / limit)
        }
      };
    } catch (error) {
      logger.error('Erro ao listar assinaturas:', error);
      throw error;
    }
  }

  // Atualizar assinatura
  async update(updateData) {
    try {
      const allowedFields = [
        'plan_type', 'status', 'end_date', 'payment_method', 'auto_renewal'
      ];
      const updateFields = [];
      const params = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key} = ?`);
          params.push(value);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('Nenhum campo válido para atualizar');
      }

      params.push(this.id);

      await run(
        `UPDATE subscriptions SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      // Atualizar instância atual
      Object.assign(this, updateData);

      logger.info(`Assinatura atualizada: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao atualizar assinatura:', error);
      throw error;
    }
  }

  // Renovar assinatura
  async renew(months = 1) {
    try {
      const currentEndDate = new Date(this.end_date);
      const newEndDate = new Date(currentEndDate.getTime() + (months * 30 * 24 * 60 * 60 * 1000));
      
      await this.update({
        status: 'active',
        end_date: newEndDate.toISOString().split('T')[0]
      });

      logger.info(`Assinatura renovada: ID ${this.id} até ${newEndDate.toISOString().split('T')[0]}`);
      return this;
    } catch (error) {
      logger.error('Erro ao renovar assinatura:', error);
      throw error;
    }
  }

  // Cancelar assinatura
  async cancel() {
    try {
      await this.update({ status: 'cancelled' });
      
      // Remover referência da tabela users
      await run(
        'UPDATE users SET subscription_id = NULL WHERE subscription_id = ?',
        [this.id]
      );

      logger.info(`Assinatura cancelada: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao cancelar assinatura:', error);
      throw error;
    }
  }

  // Suspender assinatura
  async suspend() {
    try {
      await this.update({ status: 'inactive' });
      logger.info(`Assinatura suspensa: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao suspender assinatura:', error);
      throw error;
    }
  }

  // Reativar assinatura
  async reactivate() {
    try {
      await this.update({ status: 'active' });
      logger.info(`Assinatura reativada: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao reativar assinatura:', error);
      throw error;
    }
  }

  // Verificar se está ativa
  isActive() {
    const now = new Date();
    const endDate = new Date(this.end_date);
    return this.status === 'active' && endDate > now;
  }

  // Verificar se está próxima do vencimento
  isNearExpiration(days = 7) {
    const now = new Date();
    const endDate = new Date(this.end_date);
    const diffTime = endDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= days && diffDays > 0;
  }

  // Verificar se expirou
  isExpired() {
    const now = new Date();
    const endDate = new Date(this.end_date);
    return endDate < now;
  }

  // Obter limite de redações por semana
  getEssayLimit() {
    switch (this.plan_type) {
      case 'master':
        return 2;
      case 'vip':
        return 4;
      default:
        return 0;
    }
  }

  // Obter dias restantes
  getDaysRemaining() {
    const now = new Date();
    const endDate = new Date(this.end_date);
    const diffTime = endDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  }

  // Verificar assinaturas expirando
  static async findExpiring(days = 7) {
    try {
      const subscriptions = await query(
        `SELECT s.*, u.name as user_name, u.email as user_email
         FROM subscriptions s 
         JOIN users u ON s.user_id = u.id
         WHERE s.status = 'active' 
         AND date(s.end_date) <= date('now', '+${days} days')
         AND date(s.end_date) > date('now')`,
        []
      );

      return subscriptions.map(data => new Subscription(data));
    } catch (error) {
      logger.error('Erro ao buscar assinaturas expirando:', error);
      throw error;
    }
  }

  // Marcar assinaturas expiradas
  static async markExpired() {
    try {
      const result = await run(
        `UPDATE subscriptions 
         SET status = 'expired' 
         WHERE status = 'active' AND date(end_date) < date('now')`,
        []
      );

      // Remover referências dos usuários
      await run(
        `UPDATE users 
         SET subscription_id = NULL 
         WHERE subscription_id IN (
           SELECT id FROM subscriptions 
           WHERE status = 'expired'
         )`,
        []
      );

      logger.info(`${result.changes} assinaturas marcadas como expiradas`);
      return result.changes;
    } catch (error) {
      logger.error('Erro ao marcar assinaturas expiradas:', error);
      throw error;
    }
  }

  // Obter estatísticas de assinaturas
  static async getStatistics(options = {}) {
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

      const [total, active, cancelled, expired] = await Promise.all([
        queryOne(`SELECT COUNT(*) as count FROM subscriptions ${whereClause}`, params),
        queryOne(`SELECT COUNT(*) as count FROM subscriptions ${whereClause} AND status = 'active'`, params),
        queryOne(`SELECT COUNT(*) as count FROM subscriptions ${whereClause} AND status = 'cancelled'`, params),
        queryOne(`SELECT COUNT(*) as count FROM subscriptions ${whereClause} AND status = 'expired'`, params)
      ]);

      const byPlan = await query(
        `SELECT plan_type, COUNT(*) as count 
         FROM subscriptions ${whereClause} 
         GROUP BY plan_type`,
        params
      );

      const revenue = await queryOne(
        `SELECT SUM(price) as total 
         FROM subscriptions ${whereClause} AND status IN ('active', 'expired')`,
        params
      );

      const activeRevenue = await queryOne(
        `SELECT SUM(price) as total 
         FROM subscriptions 
         WHERE status = 'active'`,
        []
      );

      return {
        total: total.count,
        byStatus: {
          active: active.count,
          cancelled: cancelled.count,
          expired: expired.count
        },
        byPlan: byPlan.reduce((acc, item) => {
          acc[item.plan_type] = item.count;
          return acc;
        }, {}),
        revenue: {
          total: revenue.total || 0,
          active: activeRevenue.total || 0
        }
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas de assinaturas:', error);
      throw error;
    }
  }

  // Obter receita por período
  static async getRevenueBypériod(period = 'month') {
    try {
      let dateFormat;
      switch (period) {
        case 'day':
          dateFormat = '%Y-%m-%d';
          break;
        case 'month':
          dateFormat = '%Y-%m';
          break;
        case 'year':
          dateFormat = '%Y';
          break;
        default:
          dateFormat = '%Y-%m';
      }

      const revenue = await query(
        `SELECT 
          strftime('${dateFormat}', created_at) as period,
          plan_type,
          COUNT(*) as subscriptions,
          SUM(price) as revenue
         FROM subscriptions 
         WHERE status IN ('active', 'expired')
         GROUP BY strftime('${dateFormat}', created_at), plan_type
         ORDER BY period DESC`,
        []
      );

      return revenue;
    } catch (error) {
      logger.error('Erro ao obter receita por período:', error);
      throw error;
    }
  }

  // Converter para JSON
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      plan_type: this.plan_type,
      status: this.status,
      start_date: this.start_date,
      end_date: this.end_date,
      price: this.price,
      payment_method: this.payment_method,
      auto_renewal: this.auto_renewal,
      created_at: this.created_at,
      user_name: this.user_name,
      user_email: this.user_email,
      is_active: this.isActive(),
      is_near_expiration: this.isNearExpiration(),
      is_expired: this.isExpired(),
      days_remaining: this.getDaysRemaining(),
      essay_limit: this.getEssayLimit()
    };
  }
}

module.exports = Subscription;