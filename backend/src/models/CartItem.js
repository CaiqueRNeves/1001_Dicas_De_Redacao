const { query, queryOne, run } = require('../config/database');
const logger = require('../utils/logger');

class CartItem {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.plan_type = data.plan_type;
    this.price = data.price;
    this.quantity = data.quantity || 1;
    this.created_at = data.created_at;
    this.expires_at = data.expires_at;
  }

  // Adicionar item ao carrinho
  static async create(cartData) {
    try {
      const {
        user_id,
        plan_type,
        price,
        quantity = 1
      } = cartData;

      // Definir expiração em 24 horas
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Verificar se já existe o mesmo item no carrinho
      const existingItem = await CartItem.findByUserAndPlan(user_id, plan_type);
      
      if (existingItem) {
        // Atualizar quantidade e expiração
        return await existingItem.update({
          quantity: quantity,
          expires_at: expiresAt
        });
      }

      const result = await run(
        `INSERT INTO cart_items (
          user_id, plan_type, price, quantity, created_at, expires_at
        ) VALUES (?, ?, ?, ?, datetime('now'), ?)`,
        [user_id, plan_type, price, quantity, expiresAt]
      );

      const newCartItem = await CartItem.findById(result.lastID);
      logger.info(`Item adicionado ao carrinho: ID ${result.lastID}, Usuário: ${user_id}, Plano: ${plan_type}`);
      
      return newCartItem;
    } catch (error) {
      logger.error('Erro ao adicionar item ao carrinho:', error);
      throw error;
    }
  }

  // Buscar item do carrinho por ID
  static async findById(id) {
    try {
      const cartData = await queryOne(
        `SELECT c.*, u.name as user_name, u.email as user_email
         FROM cart_items c
         JOIN users u ON c.user_id = u.id
         WHERE c.id = ?`,
        [id]
      );
      return cartData ? new CartItem(cartData) : null;
    } catch (error) {
      logger.error('Erro ao buscar item do carrinho por ID:', error);
      throw error;
    }
  }

  // Buscar item por usuário e plano
  static async findByUserAndPlan(userId, planType) {
    try {
      const cartData = await queryOne(
        `SELECT c.*, u.name as user_name, u.email as user_email
         FROM cart_items c
         JOIN users u ON c.user_id = u.id
         WHERE c.user_id = ? AND c.plan_type = ?`,
        [userId, planType]
      );
      return cartData ? new CartItem(cartData) : null;
    } catch (error) {
      logger.error('Erro ao buscar item por usuário e plano:', error);
      throw error;
    }
  }

  // Buscar todos os itens do carrinho do usuário
  static async findByUser(userId) {
    try {
      const cartItems = await query(
        `SELECT c.*, u.name as user_name, u.email as user_email
         FROM cart_items c
         JOIN users u ON c.user_id = u.id
         WHERE c.user_id = ? AND c.expires_at > datetime('now')
         ORDER BY c.created_at DESC`,
        [userId]
      );

      return cartItems.map(data => new CartItem(data));
    } catch (error) {
      logger.error('Erro ao buscar itens do carrinho:', error);
      throw error;
    }
  }

  // Atualizar item do carrinho
  async update(updateData) {
    try {
      const allowedFields = ['quantity', 'expires_at'];
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
        `UPDATE cart_items SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      Object.assign(this, updateData);

      logger.info(`Item do carrinho atualizado: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao atualizar item do carrinho:', error);
      throw error;
    }
  }

  // Remover item do carrinho
  async remove() {
    try {
      await run('DELETE FROM cart_items WHERE id = ?', [this.id]);
      logger.info(`Item removido do carrinho: ID ${this.id}`);
      return true;
    } catch (error) {
      logger.error('Erro ao remover item do carrinho:', error);
      throw error;
    }
  }

  // Limpar carrinho do usuário
  static async clearUserCart(userId) {
    try {
      const result = await run('DELETE FROM cart_items WHERE user_id = ?', [userId]);
      logger.info(`Carrinho limpo: ${result.changes} itens removidos para usuário ${userId}`);
      return result.changes;
    } catch (error) {
      logger.error('Erro ao limpar carrinho:', error);
      throw error;
    }
  }

  // Calcular total do carrinho
  static async calculateCartTotal(userId) {
    try {
      const result = await queryOne(
        `SELECT 
          COUNT(*) as total_items,
          SUM(price * quantity) as total_amount,
          SUM(quantity) as total_quantity
         FROM cart_items 
         WHERE user_id = ? AND expires_at > datetime('now')`,
        [userId]
      );

      return {
        total_items: result.total_items || 0,
        total_amount: result.total_amount || 0,
        total_quantity: result.total_quantity || 0
      };
    } catch (error) {
      logger.error('Erro ao calcular total do carrinho:', error);
      throw error;
    }
  }

  // Verificar se item expirou
  isExpired() {
    return new Date(this.expires_at) < new Date();
  }

  // Estender expiração do item
  async extendExpiration(hours = 24) {
    try {
      const newExpiration = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      await this.update({ expires_at: newExpiration });
      logger.info(`Expiração estendida: Item ${this.id} até ${newExpiration}`);
      return this;
    } catch (error) {
      logger.error('Erro ao estender expiração:', error);
      throw error;
    }
  }

  // Remover itens expirados automaticamente
  static async removeExpiredItems() {
    try {
      const result = await run(
        'DELETE FROM cart_items WHERE expires_at < datetime(\'now\')'
      );

      if (result.changes > 0) {
        logger.info(`${result.changes} itens expirados removidos do carrinho`);
      }

      return result.changes;
    } catch (error) {
      logger.error('Erro ao remover itens expirados:', error);
      throw error;
    }
  }

  // Verificar se usuário tem itens no carrinho
  static async hasItems(userId) {
    try {
      const result = await queryOne(
        'SELECT COUNT(*) as count FROM cart_items WHERE user_id = ? AND expires_at > datetime(\'now\')',
        [userId]
      );
      return result.count > 0;
    } catch (error) {
      logger.error('Erro ao verificar itens no carrinho:', error);
      return false;
    }
  }

  // Obter estatísticas do carrinho
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

      const [total, active, expired] = await Promise.all([
        queryOne(`SELECT COUNT(*) as count FROM cart_items ${whereClause}`, params),
        queryOne(`SELECT COUNT(*) as count FROM cart_items ${whereClause} AND expires_at > datetime('now')`, params),
        queryOne(`SELECT COUNT(*) as count FROM cart_items ${whereClause} AND expires_at < datetime('now')`, params)
      ]);

      const byPlan = await query(
        `SELECT plan_type, COUNT(*) as count, SUM(price * quantity) as total_value
         FROM cart_items ${whereClause} AND expires_at > datetime('now')
         GROUP BY plan_type`,
        params
      );

      const abandonmentRate = await queryOne(
        `SELECT 
          COUNT(CASE WHEN expires_at < datetime('now') THEN 1 END) * 100.0 / COUNT(*) as rate
         FROM cart_items ${whereClause}`,
        params
      );

      return {
        total: total.count,
        active: active.count,
        expired: expired.count,
        abandonment_rate: abandonmentRate.rate || 0,
        by_plan: byPlan.reduce((acc, item) => {
          acc[item.plan_type] = {
            count: item.count,
            total_value: item.total_value || 0
          };
          return acc;
        }, {})
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas do carrinho:', error);
      throw error;
    }
  }

  // Migrar carrinho para nova sessão/usuário
  static async migrateCart(fromUserId, toUserId) {
    try {
      const result = await run(
        'UPDATE cart_items SET user_id = ? WHERE user_id = ? AND expires_at > datetime(\'now\')',
        [toUserId, fromUserId]
      );

      logger.info(`Carrinho migrado: ${result.changes} itens de usuário ${fromUserId} para ${toUserId}`);
      return result.changes;
    } catch (error) {
      logger.error('Erro ao migrar carrinho:', error);
      throw error;
    }
  }

  // Obter resumo do carrinho para checkout
  static async getCheckoutSummary(userId) {
    try {
      const items = await CartItem.findByUser(userId);
      const totals = await CartItem.calculateCartTotal(userId);

      const summary = {
        items: items.map(item => item.toJSON()),
        totals,
        expires_at: items.length > 0 ? Math.min(...items.map(item => new Date(item.expires_at).getTime())) : null,
        is_valid: items.length > 0 && !items.some(item => item.isExpired())
      };

      return summary;
    } catch (error) {
      logger.error('Erro ao obter resumo do checkout:', error);
      throw error;
    }
  }

  // Validar itens do carrinho antes do checkout
  static async validateCartForCheckout(userId) {
    try {
      const items = await CartItem.findByUser(userId);

      if (items.length === 0) {
        return {
          valid: false,
          message: 'Carrinho vazio'
        };
      }

      const expiredItems = items.filter(item => item.isExpired());
      if (expiredItems.length > 0) {
        // Remover itens expirados
        await Promise.all(expiredItems.map(item => item.remove()));
        
        return {
          valid: false,
          message: 'Alguns itens expiraram e foram removidos do carrinho'
        };
      }

      // Verificar se usuário já tem assinatura ativa
      const activeSubscription = await query(
        'SELECT * FROM subscriptions WHERE user_id = ? AND status = "active" AND end_date > date(\'now\')',
        [userId]
      );

      if (activeSubscription.length > 0) {
        return {
          valid: false,
          message: 'Você já possui uma assinatura ativa'
        };
      }

      return {
        valid: true,
        items: items.length,
        total: await CartItem.calculateCartTotal(userId)
      };
    } catch (error) {
      logger.error('Erro ao validar carrinho:', error);
      throw error;
    }
  }

  // Obter preços dos planos
  static getPlanPrices() {
    return {
      master: 40.00,
      vip: 50.00
    };
  }

  // Converter para JSON
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      plan_type: this.plan_type,
      price: this.price,
      quantity: this.quantity,
      subtotal: this.price * this.quantity,
      created_at: this.created_at,
      expires_at: this.expires_at,
      user_name: this.user_name,
      user_email: this.user_email,
      is_expired: this.isExpired(),
      plan_details: {
        name: this.plan_type === 'vip' ? 'Plano VIP' : 'Plano Master',
        description: this.plan_type === 'vip' 
          ? 'Até 4 redações por semana' 
          : 'Até 2 redações por semana',
        price: this.price
      }
    };
  }
}

module.exports = CartItem;