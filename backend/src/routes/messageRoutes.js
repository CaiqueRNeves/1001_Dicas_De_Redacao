const express = require('express');
const MessageController = require('../controllers/messageController');
const { 
  auth, 
  requireAdmin,
  requireOwnershipOrAdmin,
  logUserAction 
} = require('../middleware/auth');
const { 
  validateMessage,
  validateParamId,
  sanitizeInput 
} = require('../middleware/validation');

const router = express.Router();

// Aplicar autenticação para todas as rotas
router.use(auth);

// Rotas da caixa de entrada
router.get('/inbox', 
  logUserAction('view_inbox'),
  MessageController.getInbox
);

router.get('/sent', 
  logUserAction('view_sent_messages'),
  MessageController.getSentMessages
);

router.get('/unread', 
  logUserAction('view_unread_messages'),
  MessageController.getUnreadMessages
);

router.get('/unread/count', 
  MessageController.getUnreadCount
);

// Rotas de conversa
router.get('/conversation/:userId', 
  validateParamId('userId'),
  logUserAction('view_conversation'),
  MessageController.getConversation
);

// Rotas gerais
router.get('/', 
  MessageController.getMessages
);

router.get('/statistics', 
  MessageController.getMessageStatistics
);

// Rotas específicas por ID
router.get('/:id', 
  validateParamId('id'),
  requireOwnershipOrAdmin,
  MessageController.getMessageById
);

router.put('/:id/read', 
  validateParamId('id'),
  requireOwnershipOrAdmin,
  logUserAction('mark_message_read'),
  MessageController.markAsRead
);

router.put('/:id/unread', 
  validateParamId('id'),
  requireOwnershipOrAdmin,
  logUserAction('mark_message_unread'),
  MessageController.markAsUnread
);

router.delete('/:id', 
  validateParamId('id'),
  requireOwnershipOrAdmin,
  logUserAction('delete_message'),
  MessageController.deleteMessage
);

// Rotas de redação específica
router.get('/essay/:essayId', 
  validateParamId('essayId'),
  MessageController.getEssayMessages
);

// Operações em lote
router.put('/bulk/read', 
  sanitizeInput,
  logUserAction('bulk_mark_read'),
  MessageController.markMultipleAsRead
);

// Criar nova mensagem
router.post('/', 
  sanitizeInput,
  validateMessage,
  logUserAction('send_message'),
  MessageController.createMessage
);

// Responder mensagem
router.post('/:id/reply', 
  validateParamId('id'),
  sanitizeInput,
  validateMessage,
  logUserAction('reply_message'),
  MessageController.replyMessage
);

// Rotas administrativas
router.post('/system', 
  requireAdmin,
  sanitizeInput,
  validateMessage,
  logUserAction('send_system_message'),
  MessageController.sendSystemMessage
);

router.get('/admin/all', 
  requireAdmin,
  logUserAction('view_all_messages'),
  MessageController.getAllMessages
);

module.exports = router;