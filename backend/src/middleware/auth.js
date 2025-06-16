const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// Middleware de autenticação base
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso requerido'
      });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso requerido'
      });
    }

    // Verificar e decodificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuário no banco
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido - usuário não encontrado'
      });
    }

    // Adicionar dados do usuário à requisição
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    } else {
      logger.error('Erro na autenticação:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
};

// Middleware de autenticação opcional
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      req.user = null;
      return next();
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    // Em caso de erro, continua sem usuário autenticado
    req.user = null;
    next();
  }
};

// Middleware para verificar role específica
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    const hasPermission = requiredRoles.some(role => userRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Permissão insuficiente'
      });
    }

    next();
  };
};

// Middleware para verificar se é admin
const requireAdmin = requireRole(['admin']);

// Middleware para verificar se é usuário comum ou admin
const requireUser = requireRole(['user', 'admin']);

// Middleware para verificar se o usuário pode acessar o recurso
const requireOwnershipOrAdmin = (userIdField = 'user_id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      // Admin tem acesso a tudo
      if (req.user.role === 'admin') {
        return next();
      }

      // Verificar se o usuário é o proprietário do recurso
      const resourceUserId = req.params.userId || req.body[userIdField] || req.params.id;
      
      if (parseInt(resourceUserId) !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado - você só pode acessar seus próprios recursos'
        });
      }

      next();
    } catch (error) {
      logger.error('Erro na verificação de propriedade:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };
};

// Middleware para verificar assinatura ativa
const requireActiveSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Admin não precisa de assinatura
    if (req.user.role === 'admin') {
      return next();
    }

    const hasActiveSubscription = await req.user.hasActiveSubscription();
    
    if (!hasActiveSubscription) {
      return res.status(403).json({
        success: false,
        message: 'Assinatura ativa requerida'
      });
    }

    next();
  } catch (error) {
    logger.error('Erro na verificação de assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Middleware para verificar limite de redações
const checkEssayLimit = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Admin não tem limite
    if (req.user.role === 'admin') {
      return next();
    }

    const canSubmit = await req.user.canSubmitEssay();
    
    if (!canSubmit.canSubmit) {
      return res.status(403).json({
        success: false,
        message: canSubmit.reason,
        data: {
          current: canSubmit.current,
          max: canSubmit.max
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Erro na verificação de limite de redações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Middleware para verificar se email foi verificado
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    });
  }

  if (!req.user.email_verified && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Verificação de email requerida'
    });
  }

  next();
};

// Middleware para atualizar último acesso
const updateLastAccess = async (req, res, next) => {
  try {
    if (req.user) {
      await req.user.updateLastLogin();
    }
    next();
  } catch (error) {
    logger.error('Erro ao atualizar último acesso:', error);
    next(); // Continuar mesmo com erro
  }
};

// Middleware para rate limiting por usuário
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Limpar registros antigos
    if (userRequests.has(userId)) {
      const requests = userRequests.get(userId);
      const validRequests = requests.filter(time => time > windowStart);
      userRequests.set(userId, validRequests);
    } else {
      userRequests.set(userId, []);
    }

    const userRequestList = userRequests.get(userId);

    if (userRequestList.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Muitas requisições. Tente novamente mais tarde.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    userRequestList.push(now);
    next();
  };
};

// Middleware para log de ações do usuário
const logUserAction = (action) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      if (req.user && res.statusCode < 400) {
        logger.info('Ação do usuário:', {
          userId: req.user.id,
          email: req.user.email,
          action: action,
          method: req.method,
          path: req.path,
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

// Middleware para validar token de refresh
const validateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token requerido'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Verificar se é um refresh token
    if (decoded.aud !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    req.user = user;
    req.refreshToken = refreshToken;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expirado'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token inválido'
      });
    } else {
      logger.error('Erro na validação do refresh token:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
};

module.exports = {
  auth,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireUser,
  requireOwnershipOrAdmin,
  requireActiveSubscription,
  checkEssayLimit,
  requireEmailVerification,
  updateLastAccess,
  userRateLimit,
  logUserAction,
  validateRefreshToken
};