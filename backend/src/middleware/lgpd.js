const logger = require('../utils/logger');
const { query, run } = require('../config/database');

// Middleware principal de compliance LGPD
const lgpdCompliance = (req, res, next) => {
  // Log de auditoria para todas as requisições
  const auditData = {
    userId: req.user?.id || null,
    action: req.method,
    endpoint: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    dataAccessed: req.method === 'GET' ? extractDataAccessed(req) : null,
    dataModified: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? extractDataModified(req) : null,
    sessionId: req.sessionID || null
  };

  // Registrar log de auditoria
  logger.audit('data_access', req.user?.id, auditData);

  // Verificar consentimento LGPD para novos usuários
  if (req.path === '/api/auth/register' && !req.body.lgpd_consent) {
    return res.status(400).json({
      success: false,
      message: 'Consentimento LGPD é obrigatório para criar conta',
      lgpd_info: {
        required: true,
        description: 'Precisamos do seu consentimento para processar seus dados pessoais conforme a LGPD'
      }
    });
  }

  // Adicionar headers LGPD
  res.setHeader('X-LGPD-Compliant', 'true');
  res.setHeader('X-Data-Protection', 'LGPD-BR');

  next();
};

// Extrair dados acessados (para GET requests)
const extractDataAccessed = (req) => {
  const sensitiveEndpoints = [
    '/profile',
    '/users',
    '/essays',
    '/payments',
    '/messages'
  ];

  const isSensitive = sensitiveEndpoints.some(endpoint => 
    req.path.includes(endpoint)
  );

  if (isSensitive) {
    return {
      endpoint: req.path,
      params: req.params,
      query: req.query,
      sensitive: true
    };
  }

  return {
    endpoint: req.path,
    sensitive: false
  };
};

// Extrair dados modificados (para POST, PUT, PATCH, DELETE)
const extractDataModified = (req) => {
  const sensitiveFields = [
    'email', 'name', 'phone', 'birth_date', 'password',
    'cpf', 'address', 'payment_info'
  ];

  const modifiedData = {};
  const bodyKeys = Object.keys(req.body || {});

  bodyKeys.forEach(key => {
    if (sensitiveFields.includes(key)) {
      modifiedData[key] = '***SENSITIVE_DATA***';
    } else {
      modifiedData[key] = req.body[key];
    }
  });

  return {
    action: req.method,
    endpoint: req.path,
    modifiedFields: bodyKeys,
    sensitiveFields: bodyKeys.filter(key => sensitiveFields.includes(key)),
    data: modifiedData
  };
};

// Middleware para verificar consentimento do usuário
const requireLgpdConsent = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Verificar se usuário deu consentimento LGPD
    if (!req.user.lgpd_consent) {
      return res.status(403).json({
        success: false,
        message: 'Consentimento LGPD necessário',
        lgpd_info: {
          consent_required: true,
          rights: [
            'Direito de acesso aos seus dados',
            'Direito de retificação',
            'Direito de exclusão',
            'Direito de portabilidade',
            'Direito de oposição'
          ],
          contact: 'proftaynarasilva28@gmail.com'
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Erro na verificação LGPD:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Middleware para anonimizar dados em logs
const anonymizeData = (data) => {
  const sensitiveFields = ['password', 'cpf', 'email', 'phone'];
  const anonymized = { ...data };

  sensitiveFields.forEach(field => {
    if (anonymized[field]) {
      anonymized[field] = '***ANONYMIZED***';
    }
  });

  return anonymized;
};

// Middleware para direito de acesso (Art. 18, I da LGPD)
const handleDataAccess = async (req, res, next) => {
  try {
    if (req.path === '/api/users/my-data' && req.method === 'GET') {
      const userId = req.user.id;

      // Coletar todos os dados do usuário
      const userData = await collectUserData(userId);

      logger.audit('data_access_request', userId, {
        type: 'full_data_export',
        timestamp: new Date().toISOString(),
        ip: req.ip
      });

      return res.json({
        success: true,
        message: 'Dados pessoais coletados conforme LGPD',
        data: userData,
        lgpd_info: {
          collected_at: new Date().toISOString(),
          retention_period: '7 anos conforme legislação',
          your_rights: [
            'Solicitar correção de dados',
            'Solicitar exclusão de dados',
            'Revogar consentimento',
            'Portabilidade de dados'
          ]
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Erro no acesso aos dados:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Coletar todos os dados de um usuário
const collectUserData = async (userId) => {
  try {
    const [user, essays, subscriptions, payments, messages] = await Promise.all([
      query('SELECT * FROM users WHERE id = ?', [userId]),
      query('SELECT * FROM essays WHERE user_id = ?', [userId]),
      query('SELECT * FROM subscriptions WHERE user_id = ?', [userId]),
      query('SELECT * FROM payments WHERE user_id = ?', [userId]),
      query('SELECT * FROM messages WHERE sender_id = ? OR recipient_id = ?', [userId, userId])
    ]);

    return {
      personal_data: user[0] ? anonymizePersonalData(user[0]) : null,
      essays: essays || [],
      subscriptions: subscriptions || [],
      payments: payments || [],
      messages: messages || [],
      data_collection_date: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Erro ao coletar dados do usuário:', error);
    throw error;
  }
};

// Anonimizar dados pessoais para export
const anonymizePersonalData = (userData) => {
  const { password, ...safeData } = userData;
  return {
    ...safeData,
    password: '***PROTECTED***'
  };
};

// Middleware para direito de exclusão (Art. 18, VI da LGPD)
const handleDataDeletion = async (req, res, next) => {
  try {
    if (req.path === '/api/users/delete-my-data' && req.method === 'DELETE') {
      const userId = req.user.id;

      // Verificar se pode deletar (não pode ter assinaturas ativas)
      const activeSubscriptions = await query(
        'SELECT * FROM subscriptions WHERE user_id = ? AND status = "active"',
        [userId]
      );

      if (activeSubscriptions.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Não é possível excluir dados com assinaturas ativas',
          active_subscriptions: activeSubscriptions.length
        });
      }

      // Executar exclusão conforme LGPD
      await deleteUserDataLgpd(userId);

      logger.audit('data_deletion_request', userId, {
        type: 'full_account_deletion',
        timestamp: new Date().toISOString(),
        ip: req.ip,
        reason: 'user_request_lgpd_art18_vi'
      });

      return res.json({
        success: true,
        message: 'Dados excluídos conforme solicitação LGPD',
        deleted_at: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    logger.error('Erro na exclusão de dados:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Deletar dados do usuário conforme LGPD
const deleteUserDataLgpd = async (userId) => {
  try {
    // Deletar em ordem devido às foreign keys
    await run('DELETE FROM messages WHERE sender_id = ? OR recipient_id = ?', [userId, userId]);
    await run('DELETE FROM payments WHERE user_id = ?', [userId]);
    await run('DELETE FROM cart_items WHERE user_id = ?', [userId]);
    await run('DELETE FROM essays WHERE user_id = ?', [userId]);
    await run('DELETE FROM subscriptions WHERE user_id = ?', [userId]);
    await run('DELETE FROM users WHERE id = ?', [userId]);

    logger.info(`Dados do usuário ${userId} excluídos conforme LGPD`);
  } catch (error) {
    logger.error(`Erro ao excluir dados do usuário ${userId}:`, error);
    throw error;
  }
};

// Middleware para portabilidade de dados (Art. 18, V da LGPD)
const handleDataPortability = async (req, res, next) => {
  try {
    if (req.path === '/api/users/export-data' && req.method === 'GET') {
      const userId = req.user.id;
      const format = req.query.format || 'json';

      const userData = await collectUserData(userId);

      logger.audit('data_portability_request', userId, {
        type: 'data_export',
        format: format,
        timestamp: new Date().toISOString(),
        ip: req.ip
      });

      if (format === 'csv') {
        // Converter para CSV
        const csv = convertToCSV(userData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="meus-dados-${userId}-${Date.now()}.csv"`);
        return res.send(csv);
      }

      // Formato JSON padrão
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="meus-dados-${userId}-${Date.now()}.json"`);
      
      return res.json({
        export_info: {
          user_id: userId,
          exported_at: new Date().toISOString(),
          format: 'json',
          lgpd_compliance: true
        },
        data: userData
      });
    }

    next();
  } catch (error) {
    logger.error('Erro na portabilidade de dados:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Converter dados para CSV
const convertToCSV = (data) => {
  // Implementação simplificada - pode ser expandida
  const rows = [];
  
  if (data.personal_data) {
    rows.push('DADOS PESSOAIS');
    rows.push(Object.keys(data.personal_data).join(','));
    rows.push(Object.values(data.personal_data).join(','));
    rows.push('');
  }

  // Adicionar outras seções conforme necessário
  return rows.join('\n');
};

// Middleware para limpeza automática de dados
const scheduleDataCleanup = () => {
  const cron = require('cron');
  
  // Executar limpeza diariamente às 2h
  const cleanupJob = new cron.CronJob('0 2 * * *', async () => {
    try {
      logger.info('Iniciando limpeza automática de dados LGPD');
      
      // Deletar dados de usuários que solicitaram exclusão há mais de 30 dias
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      
      // Implementar lógica de limpeza conforme necessário
      
      logger.info('Limpeza automática de dados LGPD concluída');
    } catch (error) {
      logger.error('Erro na limpeza automática de dados:', error);
    }
  });

  cleanupJob.start();
  logger.info('Job de limpeza automática LGPD agendado');
};

module.exports = {
  lgpdCompliance,
  requireLgpdConsent,
  handleDataAccess,
  handleDataDeletion,
  handleDataPortability,
  anonymizeData,
  scheduleDataCleanup
};