// Constantes do sistema

// Roles de usuário
const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin'
};

// Status de redação
const ESSAY_STATUS = {
  PENDING: 'pending',
  CORRECTING: 'correcting',
  CORRECTED: 'corrected',
  RETURNED: 'returned'
};

// Status de assinatura
const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

// Tipos de plano
const PLAN_TYPES = {
  MASTER: 'master',
  VIP: 'vip'
};

// Preços dos planos
const PLAN_PRICES = {
  [PLAN_TYPES.MASTER]: 40.00,
  [PLAN_TYPES.VIP]: 50.00
};

// Limites de redações por plano
const PLAN_LIMITS = {
  [PLAN_TYPES.MASTER]: 2,
  [PLAN_TYPES.VIP]: 4
};

// Status de pagamento
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  EXPIRED: 'expired'
};

// Métodos de pagamento
const PAYMENT_METHODS = {
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  PIX: 'pix',
  BOLETO: 'boleto'
};

// Status de posts
const POST_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived'
};

// Tipos de configuração do site
const SETTING_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  JSON: 'json'
};

// Categorias de configuração
const SETTING_CATEGORIES = {
  GENERAL: 'general',
  APPEARANCE: 'appearance',
  PRICING: 'pricing',
  LIMITS: 'limits',
  CONTACT: 'contact',
  SYSTEM: 'system'
};

// Tipos de arquivo permitidos
const ALLOWED_FILE_TYPES = {
  ESSAYS: ['.pdf', '.doc', '.docx', '.txt'],
  MATERIALS: ['.pdf'],
  IMAGES: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  DOCUMENTS: ['.pdf', '.doc', '.docx', '.txt', '.rtf']
};

// Tamanhos máximos de arquivo (em bytes)
const MAX_FILE_SIZES = {
  ESSAY: 10 * 1024 * 1024, // 10MB
  MATERIAL: 50 * 1024 * 1024, // 50MB
  IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 20 * 1024 * 1024 // 20MB
};

// Códigos de erro personalizados
const ERROR_CODES = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  ESSAY_LIMIT_EXCEEDED: 'ESSAY_LIMIT_EXCEEDED',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
};

// Mensagens de erro
const ERROR_MESSAGES = {
  [ERROR_CODES.USER_NOT_FOUND]: 'Usuário não encontrado',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Credenciais inválidas',
  [ERROR_CODES.EMAIL_ALREADY_EXISTS]: 'Email já está em uso',
  [ERROR_CODES.SUBSCRIPTION_REQUIRED]: 'Assinatura ativa requerida',
  [ERROR_CODES.ESSAY_LIMIT_EXCEEDED]: 'Limite de redações por semana excedido',
  [ERROR_CODES.INVALID_FILE_TYPE]: 'Tipo de arquivo não permitido',
  [ERROR_CODES.FILE_TOO_LARGE]: 'Arquivo muito grande',
  [ERROR_CODES.PAYMENT_FAILED]: 'Falha no processamento do pagamento',
  [ERROR_CODES.UNAUTHORIZED]: 'Token de acesso requerido',
  [ERROR_CODES.FORBIDDEN]: 'Acesso negado',
  [ERROR_CODES.VALIDATION_ERROR]: 'Dados de entrada inválidos'
};

// Configurações de rate limiting
const RATE_LIMITS = {
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    MAX_REQUESTS: 5
  },
  API: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    MAX_REQUESTS: 100
  },
  ADMIN: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    MAX_REQUESTS: 50
  },
  UPLOAD: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hora
    MAX_REQUESTS: 10
  }
};

// Configurações de cache (TTL em segundos)
const CACHE_TTL = {
  USER_SESSION: 7 * 24 * 60 * 60, // 7 dias
  SITE_SETTINGS: 60 * 60, // 1 hora
  PUBLIC_CONTENT: 30 * 60, // 30 minutos
  STATISTICS: 10 * 60, // 10 minutos
  FILE_INFO: 24 * 60 * 60 // 24 horas
};

// Configurações de email
const EMAIL_TYPES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification',
  ESSAY_CORRECTED: 'essay_corrected',
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_EXPIRING: 'subscription_expiring',
  PAYMENT_CONFIRMED: 'payment_confirmed'
};

// Configurações de notificação
const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

// Configurações de log
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  VERBOSE: 'verbose'
};

// Eventos de auditoria LGPD
const LGPD_EVENTS = {
  DATA_ACCESS: 'data_access',
  DATA_MODIFICATION: 'data_modification',
  DATA_DELETION: 'data_deletion',
  DATA_EXPORT: 'data_export',
  CONSENT_GIVEN: 'consent_given',
  CONSENT_WITHDRAWN: 'consent_withdrawn'
};

// Configurações de backup
const BACKUP_CONFIG = {
  RETENTION_DAYS: 30,
  MAX_BACKUP_SIZE: 1 * 1024 * 1024 * 1024, // 1GB
  BACKUP_INTERVAL_HOURS: 24,
  CLEANUP_INTERVAL_HOURS: 168 // 1 semana
};

// Configurações de segurança
const SECURITY_CONFIG = {
  JWT_EXPIRES_IN: '7d',
  JWT_REFRESH_EXPIRES_IN: '30d',
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_SALT_ROUNDS: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_TIME_MINUTES: 15,
  SESSION_TIMEOUT_MINUTES: 120
};

// URLs e endpoints
const ENDPOINTS = {
  AUTH: '/api/auth',
  USERS: '/api/users',
  ESSAYS: '/api/essays',
  SUBSCRIPTIONS: '/api/subscriptions',
  PAYMENTS: '/api/payments',
  MATERIALS: '/api/materials',
  POSTS: '/api/posts',
  VIDEOS: '/api/videos',
  MESSAGES: '/api/messages',
  DASHBOARD: '/api/dashboard',
  ADMIN: '/api/admin',
  PUBLIC: '/api/public'
};

// Headers HTTP personalizados
const CUSTOM_HEADERS = {
  LGPD_COMPLIANT: 'X-LGPD-Compliant',
  DATA_PROTECTION: 'X-Data-Protection',
  API_VERSION: 'X-API-Version',
  REQUEST_ID: 'X-Request-ID',
  ADMIN_CONFIRMATION: 'X-Admin-Confirmation'
};

// Configurações de timezone
const TIMEZONE_CONFIG = {
  DEFAULT: 'America/Sao_Paulo',
  FORMAT: 'YYYY-MM-DD HH:mm:ss',
  DATE_FORMAT: 'YYYY-MM-DD',
  TIME_FORMAT: 'HH:mm:ss'
};

// Configurações de paginação
const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1
};

// Configurações de busca
const SEARCH_CONFIG = {
  MIN_SEARCH_LENGTH: 2,
  MAX_SEARCH_LENGTH: 100,
  SEARCH_DELAY_MS: 300
};

// Configurações de upload
const UPLOAD_CONFIG = {
  TEMP_DIR: './uploads/temp',
  ESSAYS_DIR: './uploads/essays',
  MATERIALS_DIR: './uploads/materials',
  IMAGES_DIR: './uploads/images',
  CORRECTED_DIR: './uploads/corrected',
  CLEANUP_INTERVAL_HOURS: 24,
  TEMP_FILE_EXPIRY_HOURS: 24
};

// Configurações de validação
const VALIDATION_CONFIG = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[\+]?[1-9][\d]{0,15}$/,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  CPF_REGEX: /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/,
  CNPJ_REGEX: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/,
  SLUG_REGEX: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  HEX_COLOR_REGEX: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
};

// Configurações de métricas
const METRICS_CONFIG = {
  RETENTION_DAYS: 365,
  AGGREGATION_INTERVALS: ['hour', 'day', 'week', 'month'],
  MAX_DATA_POINTS: 1000
};

// Configurações de monitoramento
const MONITORING_CONFIG = {
  HEALTH_CHECK_INTERVAL: 30000, // 30 segundos
  MEMORY_THRESHOLD: 0.8, // 80%
  CPU_THRESHOLD: 0.8, // 80%
  DISK_THRESHOLD: 0.9, // 90%
  RESPONSE_TIME_THRESHOLD: 5000 // 5 segundos
};

// Estados do sistema
const SYSTEM_STATES = {
  HEALTHY: 'healthy',
  WARNING: 'warning',
  CRITICAL: 'critical',
  MAINTENANCE: 'maintenance'
};

// Configurações de integração
const INTEGRATION_CONFIG = {
  YOUTUBE_API_BASE_URL: 'https://www.googleapis.com/youtube/v3',
  YOUTUBE_WATCH_URL: 'https://www.youtube.com/watch',
  YOUTUBE_EMBED_URL: 'https://www.youtube.com/embed',
  YOUTUBE_THUMBNAIL_URL: 'https://img.youtube.com/vi'
};

// Configurações de tema/aparência
const THEME_CONFIG = {
  PRIMARY_COLORS: {
    WHITE: '#ffffff',
    GREEN_LIGHT: '#a8e6a3',
    GREEN_PASTEL: '#c8f5c3',
    GREEN_DARK: '#7fd97a',
    ORANGE_HOVER: '#ffb84d',
    ORANGE_LIGHT: '#ffd699'
  },
  NEUTRAL_COLORS: {
    GRAY_LIGHT: '#f8f9fa',
    GRAY_MEDIUM: '#e9ecef',
    GRAY_DARK: '#6c757d',
    BLACK_SOFT: '#343a40'
  },
  STATUS_COLORS: {
    SUCCESS: '#28a745',
    WARNING: '#ffc107',
    ERROR: '#dc3545',
    INFO: '#17a2b8'
  }
};

// Configurações de responsive design
const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1200,
  LARGE: 1400
};

// Configurações de análise de conteúdo
const CONTENT_ANALYSIS = {
  MIN_ESSAY_LENGTH: 30, // caracteres
  MAX_ESSAY_LENGTH: 5000, // caracteres
  WORDS_PER_MINUTE_READING: 200,
  RECOMMENDED_PARAGRAPHS: 5,
  MAX_GRADE: 1000,
  MIN_GRADE: 0
};

// Configurações de notificação push
const PUSH_NOTIFICATION_CONFIG = {
  ENABLED: false,
  BATCH_SIZE: 100,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 5000
};

// Configurações de webhook
const WEBHOOK_CONFIG = {
  TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
  MAX_PAYLOAD_SIZE: 1024 * 1024 // 1MB
};

// Configurações de relatórios
const REPORTS_CONFIG = {
  MAX_EXPORT_ROWS: 10000,
  EXPORT_FORMATS: ['csv', 'xlsx', 'pdf'],
  CACHE_DURATION_MINUTES: 15
};

// Configurações de desenvolvimento
const DEV_CONFIG = {
  MOCK_PAYMENTS: true,
  MOCK_EMAILS: process.env.NODE_ENV === 'development',
  ENABLE_DEBUG_LOGS: process.env.NODE_ENV === 'development',
  HOT_RELOAD: process.env.NODE_ENV === 'development'
};

// Configurações de produção
const PROD_CONFIG = {
  FORCE_HTTPS: true,
  ENABLE_COMPRESSION: true,
  ENABLE_CACHING: true,
  LOG_REQUESTS: true,
  SECURITY_HEADERS: true
};

// Configurações de teste
const TEST_CONFIG = {
  TEST_USER_EMAIL: 'test@example.com',
  TEST_ADMIN_EMAIL: 'admin@example.com',
  TEST_PASSWORD: 'Test123!',
  MOCK_ALL_SERVICES: true
};

// Exportar todas as constantes
module.exports = {
  // Enums
  USER_ROLES,
  ESSAY_STATUS,
  SUBSCRIPTION_STATUS,
  PLAN_TYPES,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  POST_STATUS,
  SETTING_TYPES,
  SETTING_CATEGORIES,
  EMAIL_TYPES,
  NOTIFICATION_TYPES,
  LOG_LEVELS,
  LGPD_EVENTS,
  SYSTEM_STATES,
  
  // Valores
  PLAN_PRICES,
  PLAN_LIMITS,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZES,
  ERROR_CODES,
  ERROR_MESSAGES,
  RATE_LIMITS,
  CACHE_TTL,
  ENDPOINTS,
  CUSTOM_HEADERS,
  
  // Configurações
  TIMEZONE_CONFIG,
  PAGINATION_CONFIG,
  SEARCH_CONFIG,
  UPLOAD_CONFIG,
  VALIDATION_CONFIG,
  METRICS_CONFIG,
  MONITORING_CONFIG,
  INTEGRATION_CONFIG,
  THEME_CONFIG,
  BREAKPOINTS,
  CONTENT_ANALYSIS,
  BACKUP_CONFIG,
  SECURITY_CONFIG,
  PUSH_NOTIFICATION_CONFIG,
  WEBHOOK_CONFIG,
  REPORTS_CONFIG,
  DEV_CONFIG,
  PROD_CONFIG,
  TEST_CONFIG
};