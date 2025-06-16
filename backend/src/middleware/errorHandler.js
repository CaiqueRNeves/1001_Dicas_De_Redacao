const logger = require('../utils/logger');

// Middleware principal de tratamento de erros
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log do erro
  logger.error('Error Handler:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Erro de validação do Joi
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = {
      statusCode: 400,
      message: message.join(', ')
    };
  }

  // Erro de duplicação (SQLite UNIQUE constraint)
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    const message = 'Dados duplicados encontrados';
    error = {
      statusCode: 409,
      message
    };
  }

  // Erro de constraint de foreign key
  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    const message = 'Erro de integridade referencial';
    error = {
      statusCode: 400,
      message
    };
  }

  // Erro de token JWT
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token inválido';
    error = {
      statusCode: 401,
      message
    };
  }

  // Token expirado
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expirado';
    error = {
      statusCode: 401,
      message
    };
  }

  // Erro do Multer (upload)
  if (err.code && err.code.startsWith('LIMIT_')) {
    let message = 'Erro no upload do arquivo';
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'Arquivo muito grande';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Muitos arquivos';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Tipo de arquivo não esperado';
        break;
    }
    
    error = {
      statusCode: 400,
      message
    };
  }

  // Erro de cast (conversão de tipos)
  if (err.name === 'CastError') {
    const message = 'Recurso não encontrado';
    error = {
      statusCode: 404,
      message
    };
  }

  // Erro de sintaxe JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const message = 'JSON malformado';
    error = {
      statusCode: 400,
      message
    };
  }

  // Erro de conexão com banco
  if (err.code === 'SQLITE_CANTOPEN') {
    const message = 'Erro de conexão com banco de dados';
    error = {
      statusCode: 500,
      message
    };
  }

  // Erro de permissão de arquivo
  if (err.code === 'EACCES') {
    const message = 'Erro de permissão de arquivo';
    error = {
      statusCode: 500,
      message
    };
  }

  // Erro de arquivo não encontrado
  if (err.code === 'ENOENT') {
    const message = 'Arquivo não encontrado';
    error = {
      statusCode: 404,
      message
    };
  }

  // Resposta padrão
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      error: error
    })
  });
};

// Handler para rotas não encontradas (404)
const notFoundHandler = (req, res, next) => {
  const message = `Rota ${req.originalUrl} não encontrada`;
  
  logger.warn('404 Not Found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  res.status(404).json({
    success: false,
    message
  });
};

// Handler para erros assíncronos
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Handler customizado para diferentes tipos de erro
const createError = (statusCode, message, isOperational = true) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = isOperational;
  return error;
};

// Handler para erros de validação customizados
const validationErrorHandler = (errors) => {
  const formattedErrors = errors.map(error => ({
    field: error.param,
    message: error.msg,
    value: error.value
  }));

  return createError(400, 'Dados de entrada inválidos', true, formattedErrors);
};

// Handler para erros de autorização
const authorizationErrorHandler = (message = 'Acesso negado') => {
  return createError(403, message);
};

// Handler para erros de autenticação
const authenticationErrorHandler = (message = 'Token de acesso requerido') => {
  return createError(401, message);
};

// Handler para erros de rate limiting
const rateLimitErrorHandler = (req, res) => {
  logger.warn('Rate Limit Exceeded:', {
    ip: req.ip,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(429).json({
    success: false,
    message: 'Muitas tentativas. Tente novamente mais tarde.',
    retryAfter: Math.round(req.rateLimit.resetTime / 1000)
  });
};

// Handler para erros de LGPD
const lgpdErrorHandler = (type, message) => {
  switch (type) {
    case 'consent_required':
      return createError(403, 'Consentimento LGPD necessário');
    case 'data_retention':
      return createError(400, 'Período de retenção de dados excedido');
    case 'access_denied':
      return createError(403, 'Acesso aos dados negado conforme LGPD');
    default:
      return createError(400, message || 'Erro relacionado à LGPD');
  }
};

// Handler para erros de pagamento
const paymentErrorHandler = (paymentError) => {
  let message = 'Erro no processamento do pagamento';
  let statusCode = 400;

  switch (paymentError.type) {
    case 'card_declined':
      message = 'Cartão recusado';
      break;
    case 'insufficient_funds':
      message = 'Fundos insuficientes';
      break;
    case 'expired_card':
      message = 'Cartão expirado';
      break;
    case 'invalid_cvc':
      message = 'Código de segurança inválido';
      break;
    case 'processing_error':
      message = 'Erro no processamento';
      statusCode = 500;
      break;
  }

  return createError(statusCode, message);
};

// Handler para logs de segurança
const securityErrorHandler = (req, error) => {
  logger.security('Security Issue', 'error', {
    error: error.message,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });
};

// Handler para erros de upload
const uploadErrorHandler = (uploadError) => {
  let message = 'Erro no upload do arquivo';
  
  switch (uploadError.code) {
    case 'INVALID_FILE_TYPE':
      message = `Tipo de arquivo não permitido: ${uploadError.allowedTypes?.join(', ')}`;
      break;
    case 'FILE_TOO_LARGE':
      message = `Arquivo muito grande. Tamanho máximo: ${uploadError.maxSize}MB`;
      break;
    case 'NO_FILE_UPLOADED':
      message = 'Nenhum arquivo foi enviado';
      break;
    case 'UPLOAD_FAILED':
      message = 'Falha no upload do arquivo';
      break;
  }

  return createError(400, message);
};

// Handler para erros de banco de dados
const databaseErrorHandler = (dbError) => {
  let message = 'Erro no banco de dados';
  let statusCode = 500;

  if (dbError.code === 'SQLITE_CONSTRAINT') {
    message = 'Violação de restrição do banco de dados';
    statusCode = 400;
  } else if (dbError.code === 'SQLITE_READONLY') {
    message = 'Banco de dados em modo somente leitura';
  } else if (dbError.code === 'SQLITE_BUSY') {
    message = 'Banco de dados ocupado. Tente novamente.';
    statusCode = 503;
  }

  return createError(statusCode, message);
};

// Handler para timeout de requisições
const timeoutErrorHandler = () => {
  return createError(408, 'Tempo limite da requisição excedido');
};

// Handler global para promises rejeitadas
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    error: err.message,
    stack: err.stack,
    promise: promise
  });
  
  // Fechar servidor
  process.exit(1);
});

// Handler global para exceções não capturadas
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', {
    error: err.message,
    stack: err.stack
  });
  
  // Fechar servidor
  process.exit(1);
});

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createError,
  validationErrorHandler,
  authorizationErrorHandler,
  authenticationErrorHandler,
  rateLimitErrorHandler,
  lgpdErrorHandler,
  paymentErrorHandler,
  securityErrorHandler,
  uploadErrorHandler,
  databaseErrorHandler,
  timeoutErrorHandler
};