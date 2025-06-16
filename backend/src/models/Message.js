const { query, queryOne, run } = require('../config/database');
const logger = require('../utils/logger');

class Message {
  constructor(data) {
    this.id = data.id;
    this.sender_id = data.sender_id;
    this.recipient_id = data.recipient_id;
    this.subject = data.subject;
    this.content = data.content;
    this.essay_id = data.essay_id;
    this.is_read = data.is_read || false;
    this.created_at = data.created_at;
    this.read_at = data.read_at;
  }

  // Criar nova mensagem
  static async create(messageData) {
    try {
      const {
        sender_id,
        recipient_id,
        subject,
        content,
        essay_id
      } = messageData;

      const result = await run(
        `INSERT INTO messages (
          sender_id, recipient_id, subject, content, essay_id, created_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [sender_id, recipient_id, subject, content, essay_id]
      );

      const newMessage = await Message.findById(result.lastID);
      logger.info(`Mensagem criada: ID ${result.lastID}, De: ${sender_id} Para: ${recipient_id}`);
      
      return newMessage;
    } catch (error) {
      logger.error('Erro ao criar mensagem:', error);
      throw error;
    }
  }

  // Buscar mensagem por ID
  static async findById(id) {
    try {
      const messageData = await queryOne(
        `SELECT m.*, 
                s.name as sender_name, s.email as sender_email,
                r.name as recipient_name, r.email as recipient_email,
                e.title as essay_title
         FROM messages m
         JOIN users s ON m.sender_id = s.id
         JOIN users r ON m.recipient_id = r.id
         LEFT JOIN essays e ON m.essay_id = e.id
         WHERE m.id = ?`,
        [id]
      );
      return messageData ? new Message(messageData) : null;
    } catch (error) {
      logger.error('Erro ao buscar mensagem por ID:', error);
      throw error;
    }
  }

  // Listar mensagens com filtros
  static async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sender_id,
        recipient_id,
        is_read,
        essay_id,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;

      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      let params = [];

      if (sender_id) {
        whereClause += ' AND m.sender_id = ?';
        params.push(sender_id);
      }

      if (recipient_id) {
        whereClause += ' AND m.recipient_id = ?';
        params.push(recipient_id);
      }

      if (is_read !== undefined) {
        whereClause += ' AND m.is_read = ?';
        params.push(is_read);
      }

      if (essay_id) {
        whereClause += ' AND m.essay_id = ?';
        params.push(essay_id);
      }

      const messages = await query(
        `SELECT m.*, 
                s.name as sender_name, s.email as sender_email,
                r.name as recipient_name, r.email as recipient_email,
                e.title as essay_title
         FROM messages m
         JOIN users s ON m.sender_id = s.id
         JOIN users r ON m.recipient_id = r.id
         LEFT JOIN essays e ON m.essay_id = e.id
         ${whereClause}
         ORDER BY m.${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const totalResult = await queryOne(
        `SELECT COUNT(*) as total FROM messages m ${whereClause}`,
        params
      );

      return {
        messages: messages.map(data => new Message(data)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResult.total,
          totalPages: Math.ceil(totalResult.total / limit)
        }
      };
    } catch (error) {
      logger.error('Erro ao listar mensagens:', error);
      throw error;
    }
  }

  // Buscar mensagens do usuário (inbox)
  static async findInbox(userId, options = {}) {
    try {
      return await Message.findAll({
        ...options,
        recipient_id: userId
      });
    } catch (error) {
      logger.error('Erro ao buscar inbox:', error);
      throw error;
    }
  }

  // Buscar mensagens enviadas
  static async findSent(userId, options = {}) {
    try {
      return await Message.findAll({
        ...options,
        sender_id: userId
      });
    } catch (error) {
      logger.error('Erro ao buscar mensagens enviadas:', error);
      throw error;
    }
  }

  // Buscar mensagens não lidas
  static async findUnread(userId, options = {}) {
    try {
      return await Message.findAll({
        ...options,
        recipient_id: userId,
        is_read: false
      });
    } catch (error) {
      logger.error('Erro ao buscar mensagens não lidas:', error);
      throw error;
    }
  }

  // Buscar conversa entre dois usuários
  static async findConversation(user1Id, user2Id, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const messages = await query(
        `SELECT m.*, 
                s.name as sender_name, s.email as sender_email,
                r.name as recipient_name, r.email as recipient_email,
                e.title as essay_title
         FROM messages m
         JOIN users s ON m.sender_id = s.id
         JOIN users r ON m.recipient_id = r.id
         LEFT JOIN essays e ON m.essay_id = e.id
         WHERE (m.sender_id = ? AND m.recipient_id = ?) 
            OR (m.sender_id = ? AND m.recipient_id = ?)
         ORDER BY m.created_at ASC
         LIMIT ? OFFSET ?`,
        [user1Id, user2Id, user2Id, user1Id, limit, offset]
      );

      const totalResult = await queryOne(
        `SELECT COUNT(*) as total FROM messages m
         WHERE (m.sender_id = ? AND m.recipient_id = ?) 
            OR (m.sender_id = ? AND m.recipient_id = ?)`,
        [user1Id, user2Id, user2Id, user1Id]
      );

      return {
        messages: messages.map(data => new Message(data)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResult.total,
          totalPages: Math.ceil(totalResult.total / limit)
        }
      };
    } catch (error) {
      logger.error('Erro ao buscar conversa:', error);
      throw error;
    }
  }

  // Marcar como lida
  async markAsRead() {
    try {
      await run(
        'UPDATE messages SET is_read = 1, read_at = datetime(\'now\') WHERE id = ?',
        [this.id]
      );

      this.is_read = true;
      this.read_at = new Date().toISOString();

      logger.info(`Mensagem marcada como lida: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao marcar mensagem como lida:', error);
      throw error;
    }
  }

  // Marcar como não lida
  async markAsUnread() {
    try {
      await run(
        'UPDATE messages SET is_read = 0, read_at = NULL WHERE id = ?',
        [this.id]
      );

      this.is_read = false;
      this.read_at = null;

      logger.info(`Mensagem marcada como não lida: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao marcar mensagem como não lida:', error);
      throw error;
    }
  }

  // Deletar mensagem
  async delete() {
    try {
      await run('DELETE FROM messages WHERE id = ?', [this.id]);
      logger.info(`Mensagem deletada: ID ${this.id}`);
      return true;
    } catch (error) {
      logger.error('Erro ao deletar mensagem:', error);
      throw error;
    }
  }

  // Marcar múltiplas mensagens como lidas
  static async markMultipleAsRead(messageIds, userId) {
    try {
      const placeholders = messageIds.map(() => '?').join(',');
      const result = await run(
        `UPDATE messages 
         SET is_read = 1, read_at = datetime('now') 
         WHERE id IN (${placeholders}) AND recipient_id = ?`,
        [...messageIds, userId]
      );

      logger.info(`${result.changes} mensagens marcadas como lidas para usuário ${userId}`);
      return result.changes;
    } catch (error) {
      logger.error('Erro ao marcar múltiplas mensagens como lidas:', error);
      throw error;
    }
  }

  // Contar mensagens não lidas
  static async countUnread(userId) {
    try {
      const result = await queryOne(
        'SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND is_read = 0',
        [userId]
      );
      return result.count;
    } catch (error) {
      logger.error('Erro ao contar mensagens não lidas:', error);
      throw error;
    }
  }

  // Buscar mensagens sobre uma redação específica
  static async findByEssay(essayId, options = {}) {
    try {
      return await Message.findAll({
        ...options,
        essay_id: essayId
      });
    } catch (error) {
      logger.error('Erro ao buscar mensagens por redação:', error);
      throw error;
    }
  }

  // Enviar mensagem do sistema (admin para usuário)
  static async sendSystemMessage(recipientId, subject, content, essayId = null) {
    try {
      // Assumir que o primeiro admin é o remetente do sistema
      const systemSender = await queryOne(
        'SELECT id FROM users WHERE role = "admin" ORDER BY id LIMIT 1'
      );

      if (!systemSender) {
        throw new Error('Nenhum administrador encontrado para enviar mensagem do sistema');
      }

      return await Message.create({
        sender_id: systemSender.id,
        recipient_id: recipientId,
        subject: `[Sistema] ${subject}`,
        content,
        essay_id: essayId
      });
    } catch (error) {
      logger.error('Erro ao enviar mensagem do sistema:', error);
      throw error;
    }
  }

  // Obter estatísticas de mensagens
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
        whereClause += ' AND (sender_id = ? OR recipient_id = ?)';
        params.push(user_id, user_id);
      }

      const [total, read, unread] = await Promise.all([
        queryOne(`SELECT COUNT(*) as count FROM messages ${whereClause}`, params),
        queryOne(`SELECT COUNT(*) as count FROM messages ${whereClause} AND is_read = 1`, params),
        queryOne(`SELECT COUNT(*) as count FROM messages ${whereClause} AND is_read = 0`, params)
      ]);

      const byDay = await query(
        `SELECT date(created_at) as date, COUNT(*) as count
         FROM messages ${whereClause}
         GROUP BY date(created_at)
         ORDER BY date DESC
         LIMIT 30`,
        params
      );

      return {
        total: total.count,
        read: read.count,
        unread: unread.count,
        byDay
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas de mensagens:', error);
      throw error;
    }
  }

  // Verificar se usuário pode acessar a mensagem
  canUserAccess(userId) {
    return this.sender_id === userId || this.recipient_id === userId;
  }

  // Converter para JSON
  toJSON() {
    return {
      id: this.id,
      sender_id: this.sender_id,
      recipient_id: this.recipient_id,
      subject: this.subject,
      content: this.content,
      essay_id: this.essay_id,
      is_read: this.is_read,
      created_at: this.created_at,
      read_at: this.read_at,
      sender_name: this.sender_name,
      sender_email: this.sender_email,
      recipient_name: this.recipient_name,
      recipient_email: this.recipient_email,
      essay_title: this.essay_title
    };
  }
}

module.exports = Message;