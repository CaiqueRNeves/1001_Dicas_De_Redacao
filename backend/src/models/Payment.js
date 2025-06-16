const { query, queryOne, run } = require('../config/database');
const logger = require('../utils/logger');

class Payment {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.subscription_id = data.subscription_id;
    this.amount = data.amount;
    this.payment_method = data.payment_method;
    this.status = data.status || 'pending';
    this.transaction_id = data.transaction_id;
    this.gateway_response = data.gateway_response;
    this.gateway = data.gateway;
    this.paid_at = data.paid_at;
    this.expires_at = data.expires_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Criar novo pagamento
  static async create(paymentData) {
    try {
      const {
        user_id,
        subscription_id,
        amount,
        payment_method,
        status = 'pending',
        transaction_id,
        gateway_response,
        gateway,
        expires_at
      } = paymentData;

      const result = await run(
        `INSERT INTO payments (
          user_id, subscription_id, amount, payment_method, status,
          transaction_id, gateway_response, gateway, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          user_id, subscription_id, amount, payment_method, status,
          transaction_id, gateway_response, gateway, expires_at
        ]
      );

      const newPayment = await Payment.findById(result.lastID);
      logger.info(`Pagamento criado: ID ${result.lastID}, Valor: R$ ${amount}`);
      
      return newPayment;
    } catch (error) {
      logger.error('Erro ao criar pagamento:', error);
      throw error;
    }
  }

  // Buscar pagamento por ID
  static async findById(id) {
    try {
      const paymentData = await queryOne(
        `SELECT p.*, u.name as user_name, u.email as user_email,
                s.plan_type as subscription_plan
         FROM payments p
         JOIN users u ON p.user_id = u.id
         LEFT JOIN subscriptions s ON p.subscription_id = s.id
         WHERE p.id = ?`,
        [id]
      );
      return paymentData ? new Payment(paymentData) : null;
    } catch (error) {
      logger.error('Erro ao buscar pagamento por ID:', error);
      throw error;
    }
  }

  // Buscar pagamento por transaction_id
  static async findByTransactionId(transactionId) {
    try {
      const paymentData = await queryOne(
        `SELECT p.*, u.name as user_name, u.email as user_email
         FROM payments p
         JOIN users u ON p.user_id = u.id
         WHERE p.transaction_id = ?`,
        [transactionId]
      );
      return paymentData ? new Payment(paymentData) : null;
    } catch (error) {
      logger.error('Erro ao buscar pagamento por transaction ID:', error);
      throw error;
    }
  }

  // Listar pagamentos com filtros
  static async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        user_id,
        status,
        payment_method,
        dateFrom,
        dateTo,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;

      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      let params = [];

      if (user_id) {
        whereClause += ' AND p.user_id = ?';
        params.push(user_id);
      }

      if (status) {
        whereClause += ' AND p.status = ?';
        params.push(status);
      }

      if (payment_method) {
        whereClause += ' AND p.payment_method = ?';
        params.push(payment_method);
      }

      if (dateFrom) {
        whereClause += ' AND date(p.created_at) >= ?';
        params.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ' AND date(p.created_at) <= ?';
        params.push(dateTo);
      }

      const payments = await query(
        `SELECT p.*, u.name as user_name, u.email as user_email,
                s.plan_type as subscription_plan
         FROM payments p
         JOIN users u ON p.user_id = u.id
         LEFT JOIN subscriptions s ON p.subscription_id = s.id
         ${whereClause}
         ORDER BY p.${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const totalResult = await queryOne(
        `SELECT COUNT(*) as total FROM payments p ${whereClause}`,
        params
      );

      return {
        payments: payments.map(data => new Payment(data)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResult.total,
          totalPages: Math.ceil(totalResult.total / limit)
        }
      };
    } catch (error) {
      logger.error('Erro ao listar pagamentos:', error);
      throw error;
    }
  }

  // Atualizar pagamento
  async update(updateData) {
    try {
      const allowedFields = [
        'status', 'gateway_response', 'paid_at', 'expires_at'
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

      updateFields.push('updated_at = datetime(\'now\')');
      params.push(this.id);

      await run(
        `UPDATE payments SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      Object.assign(this, updateData);
      this.updated_at = new Date().toISOString();

      logger.info(`Pagamento atualizado: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao atualizar pagamento:', error);
      throw error;
    }
  }

  // Confirmar pagamento
  async confirm() {
    try {
      await this.update({
        status: 'completed',
        paid_at: new Date().toISOString()
      });

      logger.info(`Pagamento confirmado: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao confirmar pagamento:', error);
      throw error;
    }
  }

  // Cancelar pagamento
  async cancel(reason = 'Cancelado pelo usuário') {
    try {
      await this.update({ status: 'cancelled' });
      logger.info(`Pagamento cancelado: ID ${this.id}, Motivo: ${reason}`);
      return this;
    } catch (error) {
      logger.error('Erro ao cancelar pagamento:', error);
      throw error;
    }
  }

  // Marcar como expirado
  async expire() {
    try {
      await this.update({ status: 'expired' });
      logger.info(`Pagamento expirado: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao expirar pagamento:', error);
      throw error;
    }
  }

  // Verificar se pagamento está pendente
  isPending() {
    return this.status === 'pending';
  }

  // Verificar se pagamento foi concluído
  isCompleted() {
    return this.status === 'completed';
  }

  // Verificar se pagamento expirou
  isExpired() {
    if (!this.expires_at) return false;
    return new Date(this.expires_at) < new Date();
  }

  // Obter dados do gateway como objeto
  getGatewayResponse() {
    try {
      return this.gateway_response ? JSON.parse(this.gateway_response) : {};
    } catch {
      return {};
    }
  }

  // Obter estatísticas de pagamentos
  static async getStatistics(options = {}) {
    try {
      const { dateFrom, dateTo, user_id } = options;

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

      if (user_id) {
        whereClause += ' AND user_id = ?';
        params.push(user_id);
      }

      const [total, completed, pending, failed, cancelled] = await Promise.all([
        queryOne(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payments ${whereClause}`, params),
        queryOne(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payments ${whereClause} AND status = 'completed'`, params),
        queryOne(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payments ${whereClause} AND status = 'pending'`, params),
        queryOne(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payments ${whereClause} AND status = 'failed'`, params),
        queryOne(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payments ${whereClause} AND status = 'cancelled'`, params)
      ]);

      const byMethod = await query(
        `SELECT payment_method, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
         FROM payments ${whereClause}
         GROUP BY payment_method`,
        params
      );

      return {
        total: {
          count: total.count,
          amount: total.total
        },
        completed: {
          count: completed.count,
          amount: completed.total
        },
        pending: {
          count: pending.count,
          amount: pending.total
        },
        failed: {
          count: failed.count,
          amount: failed.total
        },
        cancelled: {
          count: cancelled.count,
          amount: cancelled.total
        },
        byMethod: byMethod.reduce((acc, item) => {
          acc[item.payment_method] = {
            count: item.count,
            amount: item.total
          };
          return acc;
        }, {})
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas de pagamentos:', error);
      throw error;
    }
  }

  // Marcar pagamentos expirados
  static async markExpiredPayments() {
    try {
      const result = await run(
        'UPDATE payments SET status = "expired" WHERE status = "pending" AND expires_at < datetime(\'now\')'
      );

      logger.info(`${result.changes} pagamentos marcados como expirados`);
      return result.changes;
    } catch (error) {
      logger.error('Erro ao marcar pagamentos expirados:', error);
      throw error;
    }
  }

  // Converter para JSON
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      subscription_id: this.subscription_id,
      amount: this.amount,
      payment_method: this.payment_method,
      status: this.status,
      transaction_id: this.transaction_id,
      gateway_response: this.getGatewayResponse(),
      gateway: this.gateway,
      paid_at: this.paid_at,
      expires_at: this.expires_at,
      created_at: this.created_at,
      updated_at: this.updated_at,
      user_name: this.user_name,
      user_email: this.user_email,
      subscription_plan: this.subscription_plan,
      is_pending: this.isPending(),
      is_completed: this.isCompleted(),
      is_expired: this.isExpired()
    };
  }
}

module.exports = Payment;