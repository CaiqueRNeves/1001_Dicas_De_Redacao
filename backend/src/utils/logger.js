const winston = require('winston');
const path = require('path');

// Configuração do formato de log
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Configuração do formato para console
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      msg += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return msg;
  })
);

// Criar diretório de logs se não existir
const logDir = path.join(__dirname, '../../logs');
require('fs').mkdirSync(logDir, { recursive: true });

// Configuração dos transportes
const transports = [
  // Log de aplicação geral
  new winston.transports.File({
    filename: path.join(logDir, 'app.log'),
    level: 'info',
    format: logFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    tailable: true
  }),
  
  // Log de erros
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    tailable: true
  }),
  
  // Log de auditoria (para LGPD)
  new winston.transports.File({
    filename: path.join(logDir, 'audit.log'),
    level: 'info',
    format: logFormat,
    maxsize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
    tailable: true
  })
];

// Adicionar console em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: consoleFormat
    })
  );
}

// Criar logger principal
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false
});

// Logger específico para auditoria LGPD
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      maxsize: 50 * 1024 * 1024,
      maxFiles: 10,
      tailable: true
    })
  ]
});

// Logger específico para segurança
const securityLogger = winston.createLogger({
  level: 'warn',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'security.log'),
      maxsize: 20 * 1024 * 1024,
      maxFiles: 5,
      tailable: true
    })
  ]
});

// Logger específico para performance
const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'performance.log'),
      maxsize: 20 * 1024 * 1024,
      maxFiles: 3,
      tailable: true
    })
  ]
});

// Funcões utilitárias

// Log de auditoria para LGPD
const logAudit = (action, userId, details = {}) => {
  auditLogger.info('LGPD Audit', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    details,
    ip: details.ip,
    userAgent: details.userAgent
  });
};

// Log de segurança
const logSecurity = (event, level = 'warn', details = {}) => {
  securityLogger.log(level, 'Security Event', {
    event,
    timestamp: new Date().toISOString(),
    details
  });
};

// Log de performance
const logPerformance = (operation, duration, details = {}) => {
  performanceLogger.info('Performance', {
    operation,
    duration,
    timestamp: new Date().toISOString(),
    details
  });
};

// Log de erro com contexto
const logError = (error, context = {}) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

// Log de acesso de usuário
const logUserAccess = (userId, action, resource = null, ip = null) => {
  logger.info('User Access', {
    userId,
    action,
    resource,
    ip,
    timestamp: new Date().toISOString()
  });
};

// Log de transação de pagamento
const logPayment = (userId, amount, method, status, transactionId = null) => {
  logger.info('Payment Transaction', {
    userId,
    amount,
    method,
    status,
    transactionId,
    timestamp: new Date().toISOString()
  });
};

// Log de upload de arquivo
const logFileUpload = (userId, filename, filesize, type) => {
  logger.info('File Upload', {
    userId,
    filename,
    filesize,
    type,
    timestamp: new Date().toISOString()
  });
};

// Log de correção de redação
const logEssayCorrection = (essayId, userId, correctorId, grade) => {
  logger.info('Essay Correction', {
    essayId,
    userId,
    correctorId,
    grade,
    timestamp: new Date().toISOString()
  });
};

// Middleware para logging de requests
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log da requisição
  logger.info('HTTP Request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });
  
  // Interceptar response para logar
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    
    logger.info('HTTP Response', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
    
    // Log de performance se demorou muito
    if (duration > 1000) {
      logPerformance('HTTP Request', duration, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Função para rotação manual de logs
const rotateLogs = () => {
  logger.info('Manual log rotation initiated');
  
  // Winston handles rotation automatically, but we can trigger cleanup
  const fs = require('fs');
  const logFiles = fs.readdirSync(logDir);
  
  logFiles.forEach(file => {
    const filePath = path.join(logDir, file);
    const stats = fs.statSync(filePath);
    const fileAge = Date.now() - stats.mtime.getTime();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias
    
    if (fileAge > maxAge) {
      fs.unlinkSync(filePath);
      logger.info(`Old log file deleted: ${file}`);
    }
  });
};

// Configurar rotação automática diária
setInterval(rotateLogs, 24 * 60 * 60 * 1000);

// Exportar logger principal e funções específicas
module.exports = {
  // Logger principal
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  debug: logger.debug.bind(logger),
  verbose: logger.verbose.bind(logger),
  
  // Loggers específicos
  audit: logAudit,
  security: logSecurity,
  performance: logPerformance,
  userAccess: logUserAccess,
  payment: logPayment,
  fileUpload: logFileUpload,
  essayCorrection: logEssayCorrection,
  
  // Middleware
  requestLogger,
  
  // Utilitários
  logError,
  rotateLogs,
  
  // Instâncias dos loggers
  logger,
  auditLogger,
  securityLogger,
  performanceLogger
};