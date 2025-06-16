const Message = require('../models/Message');
const logger = require('../utils/logger');

class MessageController {
  // Criar nova mensagem
  static async createMessage(req, res) {
    try {
      const { recipient_id, subject, content, essay_id } = req.body;

      const messageData = {
        sender_id: req.user.id,
        recipient_id: parseInt(recipient_id),
        subject: subject?.trim(),
        content: content.trim(),
        essay_id: essay_id ? parseInt(essay_id) : null
      };

      const message = await Message.create(messageData);

      logger.info(`Mensagem criada: ID ${message.id}, De: ${req.user.id} Para: ${recipient_id}`);

      res.status(201).json({
        success: true,
        message: 'Mensagem enviada com sucesso',
        data: message.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao criar mensagem:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter inbox
  static async getInbox(req, res) {
    try {
      const { page = 1, limit = 10, is_read } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      if (is_read !== undefined) {
        options.is_read = is_read === 'true';
      }

      const result = await Message.findInbox(req.user.id, options);

      res.json({
        success: true,
        data: result.messages.map(message => message.toJSON()),
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro ao obter inbox:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Marcar como lida
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const message = await Message.findById(id);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Mensagem não encontrada'
        });
      }

      if (!message.canUserAccess(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      await message.markAsRead();

      res.json({
        success: true,
        message: 'Mensagem marcada como lida',
        data: message.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao marcar mensagem como lida:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Outros métodos do MessageController...
}

module.exports = MessageController;
