const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Middleware para adicionar ID único a cada requisição
const addRequestId = (req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};

// Middleware para adicionar timestamp de início
const addStartTime = (req, res, next) => {
  req.startTime = Date.now();
  next();
};

// Middleware para parsing de query parameters avançado
const parseQueryParams = (req, res, next) => {
  try {
    // Converter strings 'true'/'false' para boolean
    Object.keys(req.query).forEach(key => {
      if (req.query[key] === 'true') req.query[key] = true;
      if (req.query[key] === 'false') req.query[key] = false;
      
      // Converter números
      if (!isNaN(req.query[key]) && req.query[key] !== '') {
        const num = Number(req.query[key]);
        if (Number.isSafeInteger(num)) {
          req.query[key] = num;
        }
      }
    });
    
    next();
  } catch (error) {
    logger.error('Erro no parsing de query params:', error);
    res.status(400).json({
      success: false,
      message: 'Parâmetros de consulta inválidos'
    });
  }
};

// Middleware para normalizar paginação
const normalizePagination = (req, res, next) => {
  const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
  
  // Normalizar valores
  req.pagination = {
    page: Math.max(1, parseInt(page) || 1),
    limit: Math.min(Math.max(1, parseInt(limit) || 10), 100), // Máximo 100 por página
    sortBy: String(sortBy),
    sortOrder: ['ASC', 'DESC'].includes(String(sortOrder).toUpperCase()) 
      ? String(sortOrder).toUpperCase() 
      : 'DESC'
  };
  
  // Calcular offset
  req.pagination.offset = (req.pagination.page - 1) * req.pagination.limit;
  
  next();
};

// Middleware para validar campos de ordenação
const validateSortFields = (allowedFields) => {
  return (req, res, next) => {
    const { sortBy } = req.pagination || req.query;
    
    if (sortBy && !allowedFields.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        message: `Campo de ordenação inválido. Campos permitidos: ${allowedFields.join(', ')}`
      });
    }
    
    next();
  };
};

// Middleware para filtros de data
const parseDateFilters = (req, res, next) => {
  const { dateFrom, dateTo, period } = req.query;
  
  req.dateFilters = {};
  
  // Filtros de data específicos
  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    if (!isNaN(fromDate.getTime())) {
      req.dateFilters.dateFrom = fromDate.toISOString().split('T')[0];
    }
  }
  
  if (dateTo) {
    const toDate = new Date(dateTo);
    if (!isNaN(toDate.getTime())) {
      req.dateFilters.dateTo = toDate.toISOString().split('T')[0];
    }
  }
  
  // Períodos predefinidos
  if (period) {
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        req.dateFilters.dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterMonth, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    if (startDate) {
      req.dateFilters.dateFrom = startDate.toISOString().split('T')[0];
    }
  }
  
  next();
};

// Middleware para adicionar informações de device/browser
const addDeviceInfo = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  
  req.device = {
    userAgent,
    ip: req.ip || req.connection.remoteAddress,
    isMobile: /Mobile|Android|iPhone|iPad/.test(userAgent),
    isBot: /bot|crawler|spider|crawling/i.test(userAgent),
    browser: getBrowserInfo(userAgent),
    os: getOSInfo(userAgent)
  };
  
  next();
};

// Middleware para limitar campos retornados
const limitFields = (req, res, next) => {
  const { fields } = req.query;
  
  if (fields) {
    req.limitFields = fields.split(',').map(field => field.trim());
  }
  
  next();
};

// Middleware para incluir relacionamentos
const includeRelations = (allowedRelations = []) => {
  return (req, res, next) => {
    const { include } = req.query;
    
    req.includeRelations = [];
    
    if (include) {
      const requestedRelations = include.split(',').map(rel => rel.trim());
      req.includeRelations = requestedRelations.filter(rel => 
        allowedRelations.includes(rel)
      );
    }
    
    next();
  };
};

// Middleware para controle de cache
const cacheControl = (options = {}) => {
  const {
    maxAge = 3600, // 1 hora
    public: isPublic = false,
    mustRevalidate = false,
    noCache = false,
    noStore = false
  } = options;
  
  return (req, res, next) => {
    if (noStore) {
      res.setHeader('Cache-Control', 'no-store');
    } else if (noCache) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else {
      let cacheHeader = isPublic ? 'public' : 'private';
      cacheHeader += `, max-age=${maxAge}`;
      
      if (mustRevalidate) {
        cacheHeader += ', must-revalidate';
      }
      
      res.setHeader('Cache-Control', cacheHeader);
    }
    
    next();
  };
};

// Middleware para headers de resposta padrão
const standardHeaders = (req, res, next) => {
  // Headers de segurança básicos
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Headers da aplicação
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Response-Time', '0');
  
  // Interceptar res.end para calcular tempo de resposta
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - req.startTime;
    res.setHeader('X-Response-Time', responseTime + 'ms');
    originalEnd.apply(this, args);
  };
  
  next();
};

// Middleware para detectar requests suspeitos
const detectSuspiciousRequests = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const referer = req.get('Referer') || '';
  
  // Padrões suspeitos
  const suspiciousPatterns = [
    /sql.*injection/i,
    /union.*select/i,
    /<script/i,
    /javascript:/i,
    /\.\.\/\.\.\//,
    /cmd\.exe/i,
    /\/etc\/passwd/i
  ];
  
  // Verificar URL, headers e body
  const checkString = `${req.originalUrl} ${userAgent} ${referer} ${JSON.stringify(req.body || {})}`;
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(checkString)
  );
  
  if (isSuspicious) {
    logger.security('Suspicious Request Detected', 'warn', {
      ip: req.ip,
      userAgent,
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      timestamp: new Date().toISOString()
    });
    
    // Marcar requisição como suspeita
    req.suspicious = true;
  }
  
  next();
};

// Middleware para throttling por IP
const ipThrottle = (maxRequests = 100, windowMs = 60000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Limpar requests antigas
    if (requests.has(ip)) {
      const ipRequests = requests.get(ip);
      const validRequests = ipRequests.filter(time => time > windowStart);
      requests.set(ip, validRequests);
    } else {
      requests.set(ip, []);
    }
    
    const ipRequests = requests.get(ip);
    
    if (ipRequests.length >= maxRequests) {
      logger.security('IP Throttle Limit Exceeded', 'warn', {
        ip,
        requestCount: ipRequests.length,
        maxRequests,
        windowMs,
        timestamp: new Date().toISOString()
      });
      
      return res.status(429).json({
        success: false,
        message: 'Muitas requisições deste IP',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    ipRequests.push(now);
    next();
  };
};

// Funcões auxiliares
const getBrowserInfo = (userAgent) => {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  return 'Unknown';
};

const getOSInfo = (userAgent) => {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  return 'Unknown';
};

module.exports = {
  addRequestId,
  addStartTime,
  parseQueryParams,
  normalizePagination,
  validateSortFields,
  parseDateFilters,
  addDeviceInfo,
  limitFields,
  includeRelations,
  cacheControl,
  standardHeaders,
  detectSuspiciousRequests,
  ipThrottle
};