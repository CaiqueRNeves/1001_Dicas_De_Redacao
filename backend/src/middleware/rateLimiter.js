const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const logger = require('./logger');

// Rate limiter personalizado que considera o usuário logado
const createSmartRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutos
    maxAnonymous = 20,
    maxAuthenticated = 100,
    maxAdmin = 200,
    message = 'Muitas tentativas. Tente novamente mais tarde.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return rateLimit({
    windowMs,
    max: (req) => {
      if (req.user?.role === 'admin') return maxAdmin;
      if (req.user?.id) return maxAuthenticated;
      return maxAnonymous;
    },
    message: {
      success: false,
      message,
      retryAfter: Math.round(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    handler: (req, res) => {
      logger.security('Rate Limit Exceeded', 'warn', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
        userId: req.user?.id,
        role: req.user?.role,
        timestamp: new Date().toISOString()
      });

      res.status(429).json({
        success: false,
        message,
        retryAfter: Math.round(req.rateLimit.resetTime / 1000),
        code: 'RATE_LIMIT_EXCEEDED'
      });
    },
    keyGenerator: (req) => {
      // Usar ID do usuário se autenticado, senão usar IP
      return req.user?.id ? `user_${req.user.id}` : `ip_${req.ip}`;
    }
  });
};

// Rate limiter específico para autenticação
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  handler: (req, res) => {
    logger.security('Auth Rate Limit Exceeded', 'error', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: req.body?.email,
      timestamp: new Date().toISOString()
    });

    res.status(429).json({
      success: false,
      message: 'Muitas tentativas de autenticação. Aguarde 15 minutos.',
      retryAfter: 15 * 60,
      code: 'AUTH_RATE_LIMIT'
    });
  }
});

// Rate limiter para recuperação de senha
const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 tentativas por hora
  message: {
    success: false,
    message: 'Muitas tentativas de recuperação. Tente novamente em 1 hora.',
    retryAfter: 60 * 60
  },
  keyGenerator: (req) => {
    return req.body?.email || req.ip;
  },
  handler: (req, res) => {
    logger.security('Password Reset Rate Limit Exceeded', 'warn', {
      ip: req.ip,
      email: req.body?.email,
      timestamp: new Date().toISOString()
    });

    res.status(429).json({
      success: false,
      message: 'Limite de recuperação de senha excedido',
      retryAfter: 60 * 60
    });
  }
});

// Rate limiter para upload de arquivos
const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: (req) => {
    if (req.user?.role === 'admin') return 50;
    if (req.user?.subscription?.plan_type === 'vip') return 20;
    return 10;
  },
  message: {
    success: false,
    message: 'Limite de uploads excedido. Aguarde uma hora.',
    retryAfter: 60 * 60
  },
  keyGenerator: (req) => {
    return req.user?.id ? `upload_${req.user.id}` : `upload_ip_${req.ip}`;
  },
  handler: (req, res) => {
    logger.security('Upload Rate Limit Exceeded', 'warn', {
      ip: req.ip,
      userId: req.user?.id,
      fileType: req.headers['content-type'],
      timestamp: new Date().toISOString()
    });

    res.status(429).json({
      success: false,
      message: 'Limite de uploads excedido',
      retryAfter: 60 * 60
    });
  }
});

// Speed limiter para reduzir velocidade após muitas requisições
const createSpeedLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutos
    delayAfter = 30, // Começar a atrasar após 30 requests
    delayMs = 100, // Atraso inicial de 100ms
    maxDelayMs = 5000, // Máximo de 5 segundos
    skipFailedRequests = false,
    skipSuccessfulRequests = false
  } = options;

  return slowDown({
    windowMs,
    delayAfter,
    delayMs,
    maxDelayMs,
    skipFailedRequests,
    skipSuccessfulRequests,
    keyGenerator: (req) => {
      return req.user?.id ? `speed_${req.user.id}` : `speed_ip_${req.ip}`;
    },
    onLimitReached: (req) => {
      logger.security('Speed Limit Triggered', 'info', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Rate limiter para API específica por endpoint
const apiRateLimit = createSmartRateLimit({
  windowMs: 15 * 60 * 1000,
  maxAnonymous: 50,
  maxAuthenticated: 200,
  maxAdmin: 500,
  message: 'Muitas requisições à API. Aguarde alguns minutos.'
});

// Rate limiter específico para busca
const searchRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: (req) => {
    if (req.user?.role === 'admin') return 100;
    if (req.user?.id) return 30;
    return 10;
  },
  message: {
    success: false,
    message: 'Muitas buscas. Aguarde um minuto.',
    retryAfter: 60
  },
  keyGenerator: (req) => {
    return req.user?.id ? `search_${req.user.id}` : `search_ip_${req.ip}`;
  }
});

// Rate limiter para criação de contas
const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 registros por IP por hora
  message: {
    success: false,
    message: 'Muitos registros. Tente novamente em 1 hora.',
    retryAfter: 60 * 60
  },
  handler: (req, res) => {
    logger.security('Registration Rate Limit Exceeded', 'warn', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: req.body?.email,
      timestamp: new Date().toISOString()
    });

    res.status(429).json({
      success: false,
      message: 'Limite de registros excedido',
      retryAfter: 60 * 60
    });
  }
});

// Rate limiter para comentários/mensagens
const messageRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: (req) => {
    if (req.user?.role === 'admin') return 100;
    if (req.user?.subscription?.plan_type === 'vip') return 20;
    return 10;
  },
  message: {
    success: false,
    message: 'Muitas mensagens. Aguarde alguns minutos.',
    retryAfter: 10 * 60
  },
  keyGenerator: (req) => {
    return `message_${req.user.id}`;
  }
});

// Rate limiter para admin
const adminRateLimit = createSmartRateLimit({
  windowMs: 15 * 60 * 1000,
  maxAnonymous: 0, // Não permitir requisições anônimas
  maxAuthenticated: 0, // Não permitir usuários comuns
  maxAdmin: 100, // Apenas admins
  message: 'Acesso administrativo limitado'
});

// Middleware para detectar comportamento suspeito
const suspiciousBehaviorDetector = (req, res, next) => {
  const suspiciousPatterns = [
    // URLs suspeitas
    /\.\.(\/|\\)/g, // Path traversal
    /(union|select|insert|delete|update|drop|create|alter|exec|script)/i, // SQL injection
    /<script|javascript:|onload=|onerror=/i, // XSS
    /\.(php|asp|jsp|cgi)$/i, // Tentativas de acesso a arquivos de script
  ];

  const userAgent = req.get('User-Agent') || '';
  const url = req.originalUrl;
  const body = JSON.stringify(req.body || {});

  // Verificar padrões suspeitos
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(url) || pattern.test(body) || pattern.test(userAgent)
  );

  if (isSuspicious) {
    logger.security('Suspicious Request Detected', 'error', {
      ip: req.ip,
      userAgent,
      url,
      method: req.method,
      body: req.body,
      timestamp: new Date().toISOString()
    });

    // Aplicar rate limit mais agressivo para IPs suspeitos
    req.suspiciousActivity = true;
  }

  next();
};

// Store para manter contadores personalizados
const customLimitStore = new Map();

// Rate limiter customizado que pode ser configurado dinamicamente
const createCustomRateLimit = (key, maxRequests, windowMs) => {
  return (req, res, next) => {
    const identifier = `${key}_${req.user?.id || req.ip}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Limpar registros antigos
    if (customLimitStore.has(identifier)) {
      const requests = customLimitStore.get(identifier);
      const validRequests = requests.filter(time => time > windowStart);
      customLimitStore.set(identifier, validRequests);
    } else {
      customLimitStore.set(identifier, []);
    }

    const requests = customLimitStore.get(identifier);

    if (requests.length >= maxRequests) {
      logger.security('Custom Rate Limit Exceeded', 'warn', {
        key,
        ip: req.ip,
        userId: req.user?.id,
        requestCount: requests.length,
        maxRequests,
        windowMs,
        timestamp: new Date().toISOString()
      });

      return res.status(429).json({
        success: false,
        message: 'Limite personalizado excedido',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    requests.push(now);
    next();
  };
};

// Limpeza periódica do store customizado
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [key, requests] of customLimitStore.entries()) {
    const validRequests = requests.filter(time => (now - time) < oneHour);
    if (validRequests.length === 0) {
      customLimitStore.delete(key);
    } else {
      customLimitStore.set(key, validRequests);
    }
  }
}, 10 * 60 * 1000); // Limpeza a cada 10 minutos

module.exports = {
  // Rate limiters principais
  apiRateLimit,
  authRateLimit,
  passwordResetRateLimit,
  uploadRateLimit,
  searchRateLimit,
  registrationRateLimit,
  messageRateLimit,
  adminRateLimit,
  
  // Criadores de rate limiters
  createSmartRateLimit,
  createSpeedLimiter,
  createCustomRateLimit,
  
  // Middlewares de detecção
  suspiciousBehaviorDetector,
  
  // Speed limiter padrão
  speedLimiter: createSpeedLimiter()
};