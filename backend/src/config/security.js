const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const logger = require('../utils/logger');

// Configuração do Helmet para headers de segurança
const helmetConfig = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com"
      ],
      scriptSrc: [
        "'self'", 
        "https://cdnjs.cloudflare.com",
        "https://www.youtube.com",
        "https://www.google.com",
        "https://js.stripe.com"
      ],
      imgSrc: [
        "'self'", 
        "data:", 
        "https:",
        "https://img.youtube.com",
        "https://i.ytimg.com"
      ],
      connectSrc: [
        "'self'", 
        "https://api.stripe.com",
        "https://api.mercadopago.com",
        "https://www.googleapis.com"
      ],
      fontSrc: [
        "'self'", 
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com"
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:"],
      frameSrc: [
        "'self'",
        "https://www.youtube.com",
        "https://js.stripe.com"
      ],
      childSrc: ["'none'"],
      workerSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },

  // Cross Origin Resource Policy
  crossOriginResourcePolicy: { 
    policy: "cross-origin" 
  },

  // Cross Origin Opener Policy
  crossOriginOpenerPolicy: { 
    policy: "unsafe-none" 
  },

  // Cross Origin Embedder Policy
  crossOriginEmbedderPolicy: false,

  // DNS Prefetch Control
  dnsPrefetchControl: { 
    allow: false 
  },

  // Expect Certificate Transparency
  expectCt: {
    maxAge: 86400,
    enforce: process.env.NODE_ENV === 'production'
  },

  // Frame Guard
  frameguard: { 
    action: 'deny' 
  },

  // Hide Powered By
  hidePoweredBy: true,

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true
  },

  // IE No Open
  ieNoOpen: true,

  // No Sniff
  noSniff: true,

  // Origin Agent Cluster
  originAgentCluster: true,

  // Permitted Cross Domain Policies
  permittedCrossDomainPolicies: false,

  // Referrer Policy
  referrerPolicy: { 
    policy: ["origin", "unsafe-url"] 
  },

  // X-XSS-Protection
  xssFilter: true
};

// Configuração de Rate Limiting Global
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: (req) => {
    // Diferentes limites baseados no tipo de usuário
    if (req.user?.role === 'admin') return 200;
    if (req.user?.id) return 100;
    return 50; // Usuários não autenticados
  },
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em alguns minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('Rate Limit Exceeded', 'warn', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      success: false,
      message: 'Limite de requisições excedido',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  },
  skip: (req) => {
    // Pular rate limiting para health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

// Rate Limiting para autenticação (mais restritivo)
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas por IP
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('Auth Rate Limit Exceeded', 'error', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: req.body?.email,
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      success: false,
      message: 'Muitas tentativas de autenticação. Conta temporariamente bloqueada.',
      retryAfter: 15 * 60,
      code: 'AUTH_RATE_LIMIT'
    });
  }
});

// Rate Limiting para upload de arquivos
const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 uploads por hora
  message: {
    success: false,
    message: 'Limite de uploads por hora excedido.',
    retryAfter: 60 * 60
  },
  handler: (req, res) => {
    logger.security('Upload Rate Limit Exceeded', 'warn', {
      ip: req.ip,
      userId: req.user?.id,
      fileType: req.body?.fileType,
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      success: false,
      message: 'Limite de uploads excedido. Aguarde uma hora.',
      retryAfter: 60 * 60
    });
  }
});

// Slow Down para reduzir velocidade de requisições suspeitas
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 50, // Começar a atrasar após 50 requests
  delayMs: 500, // Atraso inicial de 500ms
  maxDelayMs: 20000, // Máximo de 20 segundos de atraso
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
  onLimitReached: (req) => {
    logger.security('Speed Limit Triggered', 'warn', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }
});

// Headers de segurança customizados
const customSecurityHeaders = (req, res, next) => {
  // Headers customizados da aplicação
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Response-Time', Date.now() - req.startTime);
  res.setHeader('X-Request-ID', req.id || 'unknown');
  
  // Headers de cache para recursos estáticos
  if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 ano
  }
  
  // Headers para APIs
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};

// Middleware para validar User-Agent
const validateUserAgent = (req, res, next) => {
  const userAgent = req.get('User-Agent');
  
  if (!userAgent) {
    logger.security('Missing User-Agent', 'warn', {
      ip: req.ip,
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    });
  }
  
  // Bloquear User-Agents suspeitos
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /masscan/i,
    /nmap/i,
    /bot.*bot/i,
    /crawler.*crawler/i
  ];
  
  if (userAgent && suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    logger.security('Suspicious User-Agent Blocked', 'error', {
      ip: req.ip,
      userAgent,
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({
      success: false,
      message: 'Acesso negado'
    });
  }
  
  next();
};

// Middleware para detectar ataques comuns
const attackDetection = (req, res, next) => {
  const url = req.originalUrl.toLowerCase();
  const body = JSON.stringify(req.body).toLowerCase();
  
  // Padrões de ataque SQL Injection
  const sqlPatterns = [
    /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/i,
    /(\bor\b.*=.*\bor\b)|(\band\b.*=.*\band\b)/i,
    /'.*(\bor\b|\band\b).*'/i,
    /\b(drop|delete|insert|update|create|alter)\b.*\b(table|database|schema)\b/i
  ];
  
  // Padrões de ataque XSS
  const xssPatterns = [
    /<script[^>]*>.*<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe[^>]*>.*<\/iframe>/i
  ];
  
  // Padrões de Path Traversal
  const pathTraversalPatterns = [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e%5c/i
  ];
  
  const allPatterns = [...sqlPatterns, ...xssPatterns, ...pathTraversalPatterns];
  
  const detectedAttack = allPatterns.find(pattern => 
    pattern.test(url) || pattern.test(body)
  );
  
  if (detectedAttack) {
    logger.security('Attack Pattern Detected', 'error', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      pattern: detectedAttack.toString(),
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({
      success: false,
      message: 'Requisição bloqueada por segurança',
      code: 'SECURITY_VIOLATION'
    });
  }
  
  next();
};

// Middleware para logging de segurança
const securityLogger = (req, res, next) => {
  // Adicionar timestamp de início
  req.startTime = Date.now();
  
  // Gerar ID único para a requisição
  req.id = require('crypto').randomUUID();
  
  // Log de requisições administrativas
  if (req.path.startsWith('/api/admin')) {
    logger.security('Admin Route Access', 'info', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
      requestId: req.id,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Middleware para proteção contra force browsing
const protectSensitiveRoutes = (req, res, next) => {
  const sensitiveRoutes = [
    '/api/admin',
    '/api/users',
    '/uploads',
    '/.env',
    '/config',
    '/logs'
  ];
  
  const isSensitive = sensitiveRoutes.some(route => 
    req.path.startsWith(route)
  );
  
  if (isSensitive && !req.user) {
    logger.security('Unauthorized Sensitive Route Access', 'warn', {
      ip: req.ip,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    return res.status(401).json({
      success: false,
      message: 'Autenticação requerida'
    });
  }
  
  next();
};

// Configuração de segurança para produção
const productionSecurity = () => {
  if (process.env.NODE_ENV === 'production') {
    // Configurações extras para produção
    return [
      // Forçar HTTPS
      (req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
          return res.redirect(`https://${req.header('host')}${req.url}`);
        }
        next();
      },
      
      // Verificar headers de proxy
      (req, res, next) => {
        const trustedProxies = process.env.TRUSTED_PROXIES?.split(',') || [];
        const forwarded = req.get('X-Forwarded-For');
        
        if (forwarded && trustedProxies.length > 0) {
          const proxyIp = forwarded.split(',')[0].trim();
          if (!trustedProxies.includes(proxyIp)) {
            logger.security('Untrusted Proxy Detected', 'error', {
              proxyIp,
              trustedProxies,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        next();
      }
    ];
  }
  
  return [];
};

// Função para verificar configuração de segurança
const validateSecurityConfig = () => {
  const checks = [];
  
  // Verificar variáveis de ambiente críticas
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback_secret_key_change_in_production') {
    checks.push('JWT_SECRET não configurado adequadamente');
  }
  
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.FRONTEND_URL || process.env.FRONTEND_URL.startsWith('http://')) {
      checks.push('FRONTEND_URL deve usar HTTPS em produção');
    }
  }
  
  if (checks.length > 0) {
    logger.error('Problemas de configuração de segurança:', { checks });
    return false;
  }
  
  logger.info('Configuração de segurança validada com sucesso');
  return true;
};

// Middleware para monitoramento de segurança
const securityMonitoring = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Monitorar respostas de erro de segurança
    if (res.statusCode >= 400) {
      logger.security('Security Response', res.statusCode >= 500 ? 'error' : 'warn', {
        statusCode: res.statusCode,
        ip: req.ip,
        url: req.originalUrl,
        method: req.method,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        responseTime: Date.now() - req.startTime,
        timestamp: new Date().toISOString()
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  helmetConfig,
  globalRateLimit,
  authRateLimit,
  uploadRateLimit,
  speedLimiter,
  customSecurityHeaders,
  validateUserAgent,
  attackDetection,
  securityLogger,
  protectSensitiveRoutes,
  productionSecurity,
  validateSecurityConfig,
  securityMonitoring
};