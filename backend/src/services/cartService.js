const CartItem = require('../models/CartItem');
const logger = require('../utils/logger');

class CartService {
  // Adicionar item ao carrinho
  static async addItem(userId, planType, quantity = 1) {
    try {
      const prices = CartItem.getPlanPrices();
      const price = prices[planType];

      if (!price) {
        throw new Error('Tipo de plano inválido');
      }

      const cartData = {
        user_id: userId,
        plan_type: planType,
        price,
        quantity
      };

      const cartItem = await CartItem.create(cartData);
      logger.info(`Item adicionado ao carrinho: Usuário ${userId}, Plano ${planType}`);
      
      return cartItem;
    } catch (error) {
      logger.error('Erro no CartService.addItem:', error);
      throw error;
    }
  }

  // Obter carrinho do usuário
  static async getUserCart(userId) {
    try {
      const items = await CartItem.findByUser(userId);
      const summary = await CartItem.getCheckoutSummary(userId);
      
      return {
        items: items.map(item => item.toJSON()),
        summary
      };
    } catch (error) {
      logger.error('Erro no CartService.getUserCart:', error);
      throw error;
    }
  }

  // Validar carrinho para checkout
  static async validateForCheckout(userId) {
    try {
      return await CartItem.validateCartForCheckout(userId);
    } catch (error) {
      logger.error('Erro no CartService.validateForCheckout:', error);
      throw error;
    }
  }

  // Limpar carrinho
  static async clearCart(userId) {
    try {
      const removedCount = await CartItem.clearUserCart(userId);
      logger.info(`Carrinho limpo: ${removedCount} itens removidos para usuário ${userId}`);
      return removedCount;
    } catch (error) {
      logger.error('Erro no CartService.clearCart:', error);
      throw error;
    }
  }

  // Remover itens expirados
  static async removeExpiredItems() {
    try {
      const removedCount = await CartItem.removeExpiredItems();
      if (removedCount > 0) {
        logger.info(`${removedCount} itens expirados removidos dos carrinhos`);
      }
      return removedCount;
    } catch (error) {
      logger.error('Erro no CartService.removeExpiredItems:', error);
      throw error;
    }
  }

  // Migrar carrinho (útil para login após navegação anônima)
  static async migrateCart(fromUserId, toUserId) {
    try {
      const migratedCount = await CartItem.migrateCart(fromUserId, toUserId);
      logger.info(`Carrinho migrado: ${migratedCount} itens de usuário ${fromUserId} para ${toUserId}`);
      return migratedCount;
    } catch (error) {
      logger.error('Erro no CartService.migrateCart:', error);
      throw error;
    }
  }
}

module.exports = CartService;