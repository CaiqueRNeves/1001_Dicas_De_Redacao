const logger = require('../utils/logger');

// Middleware para padronizar respostas da API
const standardizeResponse = (req, res, next) => {
  // Método para resposta de sucesso
  res.success = (data = null, message = 'Operação realizada com sucesso', statusCode = 200) => {
    const response = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      requestId: req.id
    };
    
    // Adicionar informações de paginação se existir
    if (data && data.pagination) {
      response.pagination = data.pagination;
      response.data = data.data || data;
    }
    
    return res.status(statusCode).json(response);
  };
  
  // Método para resposta de erro
  res.error = (message = 'Erro interno do servidor', statusCode = 500, errors = null) => {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
      requestId: req.id
    };
    
    if (errors) {
      response.errors = errors;
    }
    
    // Log do erro
    logger.error('API Error Response', {
      message,
      statusCode,
      errors,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
      requestId: req.id
    });
    
    return res.status(statusCode).json(response);
  };
  
  // Método para resposta de validação
  res.validationError = (errors, message = 'Dados inválidos') => {
    return res.error(message, 400, errors);
  };
  
  // Método para resposta não autorizada
  res.unauthorized = (message = 'Não autorizado') => {
    return res.error(message, 401);
  };
  
  // Método para resposta proibida
  res.forbidden = (message = 'Acesso negado') => {
    return res.error(message, 403);
  };
  
  // Método para resposta não encontrado
  res.notFound = (message = 'Recurso não encontrado') => {
    return res.error(message, 404);
  };
  
  // Método para resposta de conflito
  res.conflict = (message = 'Conflito de dados') => {
    return res.error(message, 409);
  };
  
  // Método para rate limit
  res.rateLimited = (message = 'Muitas requisições', retryAfter = null) => {
    if (retryAfter) {
      res.setHeader('Retry-After', retryAfter);
    }
    return res.error(message, 429);
  };
  
  next();
};

// Middleware para compressão condicional
const conditionalCompression = (req, res, next) => {
  // Não comprimir para requests pequenos ou já comprimidos
  const originalWrite = res.write;
  const originalEnd = res.end;
  let chunks = [];
  let size = 0;
  
  res.write = function(chunk) {
    if (chunk) {
      chunks.push(chunk);
      size += chunk.length;
    }
    return true;
  };
  
  res.end = function(chunk) {
    if (chunk) {
      chunks.push(chunk);
      size += chunk.length;
    }
    
    // Se é pequeno demais para comprimir
    if (size < 1024) {
      res.write = originalWrite;
      res.end = originalEnd;
      chunks.forEach(c => originalWrite.call(res, c));
      return originalEnd.call(res);
    }
    
    // Restaurar métodos originais
    res.write = originalWrite;
    res.end = originalEnd;
    
    // Enviar dados
    chunks.forEach(c => originalWrite.call(res, c));
    return originalEnd.call(res);
  };
  
  next();
};

// Middleware para adicionar links de paginação
const addPaginationLinks = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Se tem paginação, adicionar links
    if (data && data.pagination) {
      const { page, totalPages } = data.pagination;
      const baseUrl = `${req.protocol}://${req.get('host')}${req.path}`;
      const query = { ...req.query };
      
      data.links = {};
      
      // Link para primeira página
      if (page > 1) {
        query.page = 1;
        data.links.first = `${baseUrl}?${new URLSearchParams(query)}`;
      }
      
      // Link para página anterior
      if (page > 1) {
        query.page = page - 1;
        data.links.prev = `${baseUrl}?${new URLSearchParams(query)}`;
      }
      
      // Link para próxima página
      if (page < totalPages) {
        query.page = page + 1;
        data.links.next = `${baseUrl}?${new URLSearchParams(query)}`;
      }
      
      // Link para última página
      if (page < totalPages) {
        query.page = totalPages;
        data.links.last = `${baseUrl}?${new URLSearchParams(query)}`;
      }
      
      // Link atual
      query.page = page;
      data.links.self = `${baseUrl}?${new URLSearchParams(query)}`;
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Middleware para transformar dados de saída
const transformResponse = (transformer) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      if (typeof transformer === 'function') {
        try {
          data = transformer(data, req);
        } catch (error) {
          logger.error('Erro na transformação de resposta:', error);
        }
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Middleware para filtrar campos sensíveis
const filterSensitiveFields = (sensitiveFields = ['password', 'token', 'secret']) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      if (data && typeof data === 'object') {
        data = deepFilterSensitive(data, sensitiveFields);
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Middleware para limitar campos de resposta
const limitResponseFields = (req, res, next) => {
  if (!req.limitFields || req.limitFields.length === 0) {
    return next();
  }
  
  const originalJson = res.json;
  
  res.json = function(data) {
    if (data && data.data && Array.isArray(data.data)) {
      data.data = data.data.map(item => pickFields(item, req.limitFields));
    } else if (data && data.data && typeof data.data === 'object') {
      data.data = pickFields(data.data, req.limitFields);
    } else if (data && typeof data === 'object' && !data.success) {
      // Se não é uma resposta padronizada, filtrar diretamente
      data = pickFields(data, req.limitFields);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Middleware para adicionar ETag
const addETag = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Gerar ETag baseado no conteúdo
    const crypto = require('crypto');
    const content = JSON.stringify(data);
    const etag = crypto.createHash('md5').update(content).digest('hex');
    
    res.setHeader('ETag', `"${etag}"`);
    
    // Verificar If-None-Match
    const ifNoneMatch = req.get('If-None-Match');
    if (ifNoneMatch === `"${etag}"`) {
      return res.status(304).end();
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Middleware para adicionar Last-Modified
const addLastModified = (getLastModified) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      try {
        let lastModified;
        
        if (typeof getLastModified === 'function') {
          lastModified = getLastModified(data, req);
        } else if (data && data.data && data.data.updated_at) {
          lastModified = new Date(data.data.updated_at);
        } else if (data && data.updated_at) {
          lastModified = new Date(data.updated_at);
        }
        
        if (lastModified && lastModified instanceof Date) {
          res.setHeader('Last-Modified', lastModified.toUTCString());
          
          // Verificar If-Modified-Since
          const ifModifiedSince = req.get('If-Modified-Since');
          if (ifModifiedSince) {
            const clientDate = new Date(ifModifiedSince);
            if (lastModified <= clientDate) {
              return res.status(304).end();
            }
          }
        }
      } catch (error) {
        logger.error('Erro ao processar Last-Modified:', error);
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Middleware para JSONP
const jsonp = (req, res, next) => {
  const callback = req.query.callback;
  
  if (callback && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(callback)) {
    const originalJson = res.json;
    
    res.json = function(data) {
      const jsonString = JSON.stringify(data);
      const jsonpResponse = `${callback}(${jsonString});`;
      
      res.setHeader('Content-Type', 'application/javascript');
      return res.send(jsonpResponse);
    };
  }
  
  next();
};

// Middleware para adicionar metadados de performance
const addPerformanceMetrics = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (req.startTime && data && typeof data === 'object') {
      const responseTime = Date.now() - req.startTime;
      
      // Adicionar métricas apenas em desenvolvimento ou se solicitado
      if (process.env.NODE_ENV === 'development' || req.query.debug === 'true') {
        data._metrics = {
          responseTime: responseTime + 'ms',
          timestamp: new Date().toISOString(),
          requestId: req.id
        };
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Middleware para resposta vazia apropriada
const handleEmptyResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Se os dados estão vazios mas a operação foi bem-sucedida
    if (req.method === 'DELETE' && res.statusCode === 200 && !data) {
      return res.status(204).end();
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Funções auxiliares
const deepFilterSensitive = (obj, sensitiveFields) => {
  if (Array.isArray(obj)) {
    return obj.map(item => deepFilterSensitive(item, sensitiveFields));
  } else if (obj && typeof obj === 'object') {
    const filtered = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.includes(key)) {
        filtered[key] = '[FILTERED]';
      } else if (value && typeof value === 'object') {
        filtered[key] = deepFilterSensitive(value, sensitiveFields);
      } else {
        filtered[key] = value;
      }
    }
    
    return filtered;
  }
  
  return obj;
};

const pickFields = (obj, fields) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  
  const picked = {};
  fields.forEach(field => {
    if (field.includes('.')) {
      // Suporte para campos aninhados (ex: 'user.name')
      const [parent, child] = field.split('.', 2);
      if (obj[parent] && typeof obj[parent] === 'object') {
        picked[parent] = picked[parent] || {};
        picked[parent][child] = obj[parent][child];
      }
    } else if (obj.hasOwnProperty(field)) {
      picked[field] = obj[field];
    }
  });
  
  return picked;
};

module.exports = {
  standardizeResponse,
  conditionalCompression,
  addPaginationLinks,
  transformResponse,
  filterSensitiveFields,
  limitResponseFields,
  addETag,
  addLastModified,
  jsonp,
  addPerformanceMetrics,
  handleEmptyResponse
};