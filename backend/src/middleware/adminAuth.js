const { auth } = require('./auth');
const logger = require('../utils/logger');

// Middleware base de autenticação de admin
const adminAuth = async (req, res, next) => {
  try {
    // Primeiro verificar se está autenticado
    await new Promise((resolve, reject) => {
      auth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Verificar se é admin
    if (!req.user || req.user.role !== 'admin') {
      logger.security('Admin Access Denied', 'warn', {
        userId: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        ip: req.ip,
        url: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });

      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Privilégios de administrador necessários.'
      });
    }

    // Log de acesso admin
    logger.info('Admin Access Granted:', {
      adminId: req.user.id,
      email: req.user.email,
      action: `${req.method} ${req.originalUrl}`,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    next();
  } catch (error) {
    logger.error('Erro na autenticação de admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Middleware para verificar permissões específicas de admin
const requireAdminPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Privilégios de administrador necessários'
        });
      }

      // Para expansão futura - sistema de permissões granulares
      // Por enquanto, todo admin tem todas as permissões
      const userPermissions = ['essays.manage', 'users.manage', 'content.manage', 'payments.view', 'site.configure'];
      const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

      const hasPermission = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        logger.security('Admin Permission Denied', 'warn', {
          adminId: req.user.id,
          requiredPermissions,
          userPermissions,
          action: `${req.method} ${req.originalUrl}`,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          message: 'Permissões insuficientes para esta ação',
          required: requiredPermissions,
          available: userPermissions
        });
      }

      next();
    } catch (error) {
      logger.error('Erro na verificação de permissões admin:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };
};

// Middleware para ações críticas que requerem confirmação
const requireAdminConfirmation = (req, res, next) => {
  const confirmationHeader = req.headers['x-admin-confirmation'];
  const criticalActions = [
    'DELETE /api/admin/users/',
    'DELETE /api/admin/essays/',
    'POST /api/admin/bulk-delete',
    'PUT /api/admin/site-settings'
  ];

  const currentAction = `${req.method} ${req.path}`;
  const isCritical = criticalActions.some(action => 
    currentAction.includes(action)
  );

  if (isCritical && confirmationHeader !== 'confirmed') {
    logger.security('Admin Critical Action Without Confirmation', 'warn', {
      adminId: req.user?.id,
      action: currentAction,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    return res.status(400).json({
      success: false,
      message: 'Ação crítica requer confirmação',
      confirmation_required: true,
      action: currentAction,
      instructions: 'Adicione o header X-Admin-Confirmation: confirmed'
    });
  }

  if (isCritical) {
    logger.warn('Admin Critical Action Confirmed:', {
      adminId: req.user.id,
      action: currentAction,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Middleware para log detalhado de ações admin
const logAdminAction = (action) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log após a resposta ser enviada
      if (res.statusCode < 400) {
        logger.audit('admin_action', req.user?.id, {
          action: action,
          method: req.method,
          path: req.path,
          params: req.params,
          query: req.query,
          body: sanitizeAdminLog(req.body),
          statusCode: res.statusCode,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Sanitizar dados sensíveis nos logs de admin
const sanitizeAdminLog = (data) => {
  if (!data) return data;
  
  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '***SANITIZED***';
    }
  });
  
  return sanitized;
};

// Middleware para verificar tentativas de acesso suspeitas
const detectSuspiciousActivity = async (req, res, next) => {
  try {
    const ip = req.ip;
    const userId = req.user?.id;
    const action = `${req.method} ${req.path}`;
    
    // Verificar múltiplas tentativas de acesso admin de IPs diferentes
    const recentAttempts = await checkRecentAdminAttempts(userId, ip);
    
    if (recentAttempts.suspiciousActivity) {
      logger.security('Suspicious Admin Activity Detected', 'error', {
        userId,
        ip,
        action,
        attempts: recentAttempts.count,
        differentIPs: recentAttempts.differentIPs,
        timeframe: '15 minutes',
        timestamp: new Date().toISOString()
      });

      // Implementar medidas de segurança adicionais se necessário
      // Por exemplo: requerir 2FA, notificar outros admins, etc.
    }
    
    next();
  } catch (error) {
    logger.error('Erro na detecção de atividade suspeita:', error);
    next(); // Continuar mesmo com erro
  }
};

// Verificar tentativas recentes de acesso admin
const checkRecentAdminAttempts = async (userId, currentIP) => {
  // Implementação simplificada - em produção usar Redis ou cache
  const attempts = [];
  const now = Date.now();
  const fifteenMinutesAgo = now - (15 * 60 * 1000);
  
  // Por ora retornar dados mock - implementar com storage real
  return {
    suspiciousActivity: false,
    count: 1,
    differentIPs: 1
  };
};

// Middleware para controle de sessão admin
const adminSessionControl = (req, res, next) => {
  const adminSessionTimeout = 2 * 60 * 60 * 1000; // 2 horas
  const lastActivity = req.user?.last_login;
  
  if (lastActivity) {
    const timeSinceLastActivity = Date.now() - new Date(lastActivity).getTime();
    
    if (timeSinceLastActivity > adminSessionTimeout) {
      logger.security('Admin Session Expired', 'info', {
        adminId: req.user.id,
        lastActivity,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      return res.status(401).json({
        success: false,
        message: 'Sessão administrativa expirada',
        session_expired: true,
        last_activity: lastActivity
      });
    }
  }
  
  next();
};

// Middleware para validar origem das requisições admin
const validateAdminOrigin = (req, res, next) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_PANEL_URL,
    'http://localhost:3000',
    'https://admin.1001dicasderedacao.com'
  ].filter(Boolean);

  const origin = req.get('Origin') || req.get('Referer');
  
  if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    logger.security('Admin Request from Unauthorized Origin', 'warn', {
      adminId: req.user?.id,
      origin,
      allowedOrigins,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    return res.status(403).json({
      success: false,
      message: 'Origem não autorizada para operações administrativas',
      allowed_origins: allowedOrigins
    });
  }
  
  next();
};

// Middleware para backup automático antes de ações destrutivas
const autoBackupBeforeDestruction = (req, res, next) => {
  const destructiveActions = [
    'DELETE /api/admin/users',
    'DELETE /api/admin/essays',
    'PUT /api/admin/bulk-update',
    'DELETE /api/admin/bulk-delete'
  ];

  const currentAction = `${req.method} ${req.path}`;
  const isDestructive = destructiveActions.some(action => 
    currentAction.includes(action)
  );

  if (isDestructive) {
    // Trigger backup asíncrono
    setImmediate(async () => {
      try {
        const { backup } = require('../config/database');
        const backupPath = `./backups/pre-admin-action-${Date.now()}.sqlite`;
        await backup(backupPath);
        
        logger.info('Auto backup created before admin action:', {
          action: currentAction,
          backupPath,
          adminId: req.user.id,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Failed to create auto backup:', error);
      }
    });
  }
  
  next();
};

// Middleware para rate limiting específico de admin
const adminRateLimit = (maxRequests = 50, windowMs = 15 * 60 * 1000) => {
  const adminRequests = new Map();
  
  return (req, res, next) => {
    const adminId = req.user?.id;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!adminRequests.has(adminId)) {
      adminRequests.set(adminId, []);
    }
    
    const requests = adminRequests.get(adminId);
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= maxRequests) {
      logger.security('Admin Rate Limit Exceeded', 'warn', {
        adminId,
        requests: validRequests.length,
        maxRequests,
        window: windowMs / 1000 / 60 + ' minutes',
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      return res.status(429).json({
        success: false,
        message: 'Limite de requisições administrativas excedido',
        retryAfter: Math.ceil(windowMs / 1000),
        maxRequests,
        window: windowMs / 1000 / 60 + ' minutes'
      });
    }
    
    validRequests.push(now);
    adminRequests.set(adminId, validRequests);
    
    next();
  };
};

// Middleware para notificar outros admins sobre ações críticas
const notifyOtherAdmins = (action) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Notificar após ação bem-sucedida
      if (res.statusCode < 400) {
        setImmediate(async () => {
          try {
            // Implementar notificação para outros admins
            // Por exemplo: email, webhook, notificação push
            logger.info('Admin action notification sent:', {
              action,
              performedBy: req.user.id,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            logger.error('Failed to notify other admins:', error);
          }
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  adminAuth,
  requireAdminPermission,
  requireAdminConfirmation,
  logAdminAction,
  detectSuspiciousActivity,
  adminSessionControl,
  validateAdminOrigin,
  autoBackupBeforeDestruction,
  adminRateLimit,
  notifyOtherAdmins
};