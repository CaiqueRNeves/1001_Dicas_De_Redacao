const logger = require('../utils/logger');

// Origens permitidas baseadas no ambiente
const getAllowedOrigins = () => {
  const origins = [];
  
  // URLs do frontend
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  // URLs adicionais baseadas no ambiente
  if (process.env.NODE_ENV === 'development') {
    origins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    );
  }
  
  if (process.env.NODE_ENV === 'production') {
    origins.push(
      'https://1001dicasderedacao.com',
      'https://www.1001dicasderedacao.com',
      'https://admin.1001dicasderedacao.com'
    );
  }
  
  // URLs customizadas do .env
  if (process.env.ALLOWED_ORIGINS) {
    const customOrigins = process.env.ALLOWED_ORIGINS.split(',');
    origins.push(...customOrigins);
  }
  
  return origins;
};

// Verificar se a origem é permitida
const isOriginAllowed = (origin, allowedOrigins) => {
  // Permitir requisições sem origem (apps móveis, Postman, etc.)
  if (!origin) return true;
  
  // Verificar se a origem está na lista permitida
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // Verificar padrões wildcard
  const wildcardPatterns = allowedOrigins.filter(o => o.includes('*'));
  for (const pattern of wildcardPatterns) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    if (regex.test(origin)) {
      return true;
    }
  }
  
  return false;
};

// Configuração CORS principal
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    if (isOriginAllowed(origin, allowedOrigins)) {
      callback(null, true);
    } else {
      logger.security('CORS Origin Blocked', 'warn', {
        origin,
        allowedOrigins,
        timestamp: new Date().toISOString()
      });
      
      callback(new Error('Não permitido pelo CORS'), false);
    }
  },
  
  // Métodos HTTP permitidos
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Headers permitidos
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-CSRF-Token',
    'X-Admin-Confirmation',
    'X-Request-ID'
  ],
  
  // Headers expostos para o frontend
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Per-Page',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Limit',
    'X-LGPD-Compliant'
  ],
  
  // Permitir cookies
  credentials: true,
  
  // Cache do preflight em segundos (24 horas)
  maxAge: 24 * 60 * 60,
  
  // Status para OPTIONS bem-sucedido
  optionsSuccessStatus: 200,
  
  // Não usar status 204 para IE/Edge antigos
  preflightContinue: false
};

// Configuração CORS para desenvolvimento
const corsOptionsDev = {
  origin: true, // Permitir qualquer origem em desenvolvimento
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: '*',
  exposedHeaders: '*',
  maxAge: 3600
};

// Configuração CORS para produção (mais restritiva)
const corsOptionsProd = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Em produção, ser mais rigoroso
    if (!origin) {
      // Bloquear requisições sem origem em produção
      callback(new Error('Origem requerida'), false);
      return;
    }
    
    if (isOriginAllowed(origin, allowedOrigins)) {
      callback(null, true);
    } else {
      logger.security('CORS Production Block', 'error', {
        origin,
        allowedOrigins,
        userAgent: null, // Será preenchido pelo middleware
        timestamp: new Date().toISOString()
      });
      
      callback(new Error('Acesso negado'), false);
    }
  },
  
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Admin-Confirmation'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Rate-Limit-Remaining',
    'X-LGPD-Compliant'
  ],
  maxAge: 86400, // 24 horas
  optionsSuccessStatus: 200
};

// Middleware customizado para log de CORS
const corsLogger = (req, res, next) => {
  const origin = req.get('Origin');
  const method = req.method;
  
  if (origin && method === 'OPTIONS') {
    logger.debug('CORS Preflight Request', {
      origin,
      method,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Middleware para adicionar headers CORS customizados
const customCorsHeaders = (req, res, next) => {
  // Headers de segurança adicionais
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.header('Cross-Origin-Opener-Policy', 'unsafe-none');
  
  // Headers específicos da aplicação
  res.header('X-API-Version', '1.0.0');
  res.header('X-Powered-By', '1001-Dicas-Redacao');
  
  next();
};

// Middleware para validar origem em rotas específicas
const validateOriginForRoute = (allowedOrigins = []) => {
  return (req, res, next) => {
    const origin = req.get('Origin') || req.get('Referer');
    
    if (!origin) {
      return res.status(400).json({
        success: false,
        message: 'Origem da requisição requerida'
      });
    }
    
    if (!isOriginAllowed(origin, allowedOrigins)) {
      logger.security('Route Origin Validation Failed', 'warn', {
        route: req.path,
        origin,
        allowedOrigins,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        message: 'Origem não autorizada para esta rota'
      });
    }
    
    next();
  };
};

// Configuração dinâmica baseada no ambiente
const getCorsConfig = () => {
  switch (process.env.NODE_ENV) {
    case 'development':
      logger.info('CORS configurado para desenvolvimento (permissivo)');
      return corsOptionsDev;
      
    case 'production':
      logger.info('CORS configurado para produção (restritivo)');
      return corsOptionsProd;
      
    case 'test':
      return { origin: true, credentials: true };
      
    default:
      logger.warn('CORS configurado com padrões básicos');
      return corsOptions;
  }
};

// Middleware para tratar erros CORS
const corsErrorHandler = (err, req, res, next) => {
  if (err.message.includes('CORS') || err.message.includes('origem')) {
    logger.security('CORS Error', 'warn', {
      error: err.message,
      origin: req.get('Origin'),
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(403).json({
      success: false,
      message: 'Acesso bloqueado por política CORS',
      code: 'CORS_ERROR'
    });
  }
  
  next(err);
};

// Função para atualizar origens permitidas em runtime
const updateAllowedOrigins = (newOrigins) => {
  process.env.ALLOWED_ORIGINS = newOrigins.join(',');
  logger.info('CORS origins atualizadas:', { origins: newOrigins });
};

// Função para verificar configuração CORS
const validateCorsConfig = () => {
  const allowedOrigins = getAllowedOrigins();
  
  if (allowedOrigins.length === 0) {
    logger.warn('Nenhuma origem CORS configurada');
    return false;
  }
  
  logger.info('CORS configurado com origens:', { origins: allowedOrigins });
  return true;
};

// Middleware de diagnóstico CORS
const corsDebug = (req, res, next) => {
  if (process.env.NODE_ENV === 'development' && process.env.CORS_DEBUG === 'true') {
    console.log('=== CORS Debug ===');
    console.log('Origin:', req.get('Origin'));
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);
    console.log('Allowed Origins:', getAllowedOrigins());
    console.log('==================');
  }
  
  next();
};

module.exports = {
  corsOptions,
  corsOptionsDev,
  corsOptionsProd,
  getCorsConfig,
  corsLogger,
  customCorsHeaders,
  validateOriginForRoute,
  corsErrorHandler,
  updateAllowedOrigins,
  validateCorsConfig,
  corsDebug,
  getAllowedOrigins,
  isOriginAllowed
};