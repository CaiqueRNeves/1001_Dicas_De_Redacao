const { body, validationResult } = require('express-validator');
const { validateEmail, validatePassword } = require('../utils/validators');

// Middleware para processar resultados da validação
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errors.array()
    });
  }
  next();
};

// Validação de registro
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Nome deve conter apenas letras e espaços'),
  
  body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Senha deve ter pelo menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Confirmação de senha não confere');
      }
      return true;
    }),
  
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Telefone inválido'),
  
  body('birth_date')
    .optional()
    .isISO8601()
    .withMessage('Data de nascimento inválida')
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 13) {
        throw new Error('Usuário deve ter pelo menos 13 anos');
      }
      return true;
    }),
  
  body('lgpd_consent')
    .isBoolean()
    .withMessage('Consentimento LGPD deve ser boolean')
    .custom((value) => {
      if (!value) {
        throw new Error('Consentimento LGPD é obrigatório');
      }
      return true;
    }),
  
  handleValidationErrors
];

// Validação de login
const validateLogin = [
  body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória'),
  
  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('Remember me deve ser boolean'),
  
  handleValidationErrors
];

// Validação de redação
const validateEssay = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Título deve ter entre 5 e 200 caracteres'),
  
  body('content')
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Conteúdo não pode exceder 10000 caracteres'),
  
  body('theme')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Tema deve ter entre 3 e 200 caracteres'),
  
  handleValidationErrors
];

// Validação de material
const validateMaterial = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Título deve ter entre 3 e 200 caracteres'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Descrição não pode exceder 1000 caracteres'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Categoria não pode exceder 100 caracteres'),
  
  body('is_free')
    .optional()
    .isBoolean()
    .withMessage('is_free deve ser boolean'),
  
  handleValidationErrors
];

// Validação de post
const validatePost = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Título deve ter entre 5 e 200 caracteres'),
  
  body('content')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Conteúdo deve ter pelo menos 10 caracteres'),
  
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Resumo não pode exceder 500 caracteres'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Categoria não pode exceder 100 caracteres'),
  
  body('tags')
    .optional()
    .isString()
    .withMessage('Tags devem ser uma string'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status inválido'),
  
  handleValidationErrors
];

// Validação de vídeo
const validateVideo = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Título deve ter entre 3 e 200 caracteres'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Descrição não pode exceder 1000 caracteres'),
  
  body('youtube_url')
    .isURL()
    .withMessage('URL do YouTube inválida')
    .matches(/^https:\/\/(www\.)?(youtube\.com|youtu\.be)/)
    .withMessage('URL deve ser do YouTube'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Categoria não pode exceder 100 caracteres'),
  
  handleValidationErrors
];

// Validação de assinatura
const validateSubscription = [
  body('plan_type')
    .isIn(['master', 'vip'])
    .withMessage('Tipo de plano inválido'),
  
  body('payment_method')
    .isIn(['credit_card', 'debit_card', 'pix', 'boleto'])
    .withMessage('Método de pagamento inválido'),
  
  body('auto_renewal')
    .optional()
    .isBoolean()
    .withMessage('Auto renovação deve ser boolean'),
  
  handleValidationErrors
];

// Validação de correção de redação
const validateEssayCorrection = [
  body('grade')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Nota deve estar entre 0 e 1000'),
  
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Feedback não pode exceder 5000 caracteres'),
  
  handleValidationErrors
];

// Validação de mensagem
const validateMessage = [
  body('recipient_id')
    .isInt({ min: 1 })
    .withMessage('ID do destinatário inválido'),
  
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Assunto não pode exceder 200 caracteres'),
  
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Conteúdo deve ter entre 1 e 2000 caracteres'),
  
  body('essay_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID da redação inválido'),
  
  handleValidationErrors
];

// Validação de atualização de perfil
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Nome deve conter apenas letras e espaços'),
  
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Telefone inválido'),
  
  body('birth_date')
    .optional()
    .isISO8601()
    .withMessage('Data de nascimento inválida'),
  
  handleValidationErrors
];

// Validação de mudança de senha
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Senha atual é obrigatória'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Nova senha deve ter pelo menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Nova senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Confirmação de senha não confere');
      }
      return true;
    }),
  
  handleValidationErrors
];

// Validação de configurações do site
const validateSiteSettings = [
  body('setting_key')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Chave da configuração deve ter entre 2 e 100 caracteres')
    .matches(/^[a-z_]+$/)
    .withMessage('Chave deve conter apenas letras minúsculas e underscore'),
  
  body('setting_value')
    .notEmpty()
    .withMessage('Valor da configuração é obrigatório'),
  
  body('setting_type')
    .isIn(['string', 'number', 'boolean', 'json'])
    .withMessage('Tipo de configuração inválido'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Descrição não pode exceder 500 caracteres'),
  
  handleValidationErrors
];

// Validação de parâmetros de consulta
const validateQueryParams = [
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número positivo'),
  
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve estar entre 1 e 100'),
  
  body('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Busca não pode exceder 100 caracteres'),
  
  body('sortBy')
    .optional()
    .matches(/^[a-zA-Z_]+$/)
    .withMessage('Campo de ordenação inválido'),
  
  body('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('Ordem deve ser ASC ou DESC'),
  
  handleValidationErrors
];

// Validação de ID de parâmetro
const validateParamId = (paramName = 'id') => [
  (req, res, next) => {
    const id = parseInt(req.params[paramName]);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: `${paramName} deve ser um número positivo`
      });
    }
    req.params[paramName] = id;
    next();
  }
];

// Validação customizada para upload de arquivos
const validateFileUpload = (fileTypes = [], maxSize = 10 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return res.status(400).json({
        success: false,
        message: 'Arquivo é obrigatório'
      });
    }

    const file = req.file || (req.files && req.files[0]);
    
    if (file) {
      // Verificar tipo
      const fileExtension = file.originalname.toLowerCase().split('.').pop();
      if (fileTypes.length > 0 && !fileTypes.includes(`.${fileExtension}`)) {
        return res.status(400).json({
          success: false,
          message: `Tipo de arquivo não permitido. Tipos aceitos: ${fileTypes.join(', ')}`
        });
      }

      // Verificar tamanho
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `Arquivo muito grande. Tamanho máximo: ${Math.round(maxSize / (1024 * 1024))}MB`
        });
      }
    }

    next();
  };
};

// Sanitização de dados
const sanitizeInput = (req, res, next) => {
  // Função recursiva para sanitizar objetos
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    } else if (Array.isArray(obj)) {
      return obj.map(sanitize);
    } else if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }

  next();
};

// Validação de data
const validateDateRange = (startDateField = 'start_date', endDateField = 'end_date') => [
  body(startDateField)
    .optional()
    .isISO8601()
    .withMessage(`${startDateField} deve ser uma data válida`),
  
  body(endDateField)
    .optional()
    .isISO8601()
    .withMessage(`${endDateField} deve ser uma data válida`)
    .custom((value, { req }) => {
      if (value && req.body[startDateField]) {
        const startDate = new Date(req.body[startDateField]);
        const endDate = new Date(value);
        
        if (endDate <= startDate) {
          throw new Error(`${endDateField} deve ser posterior a ${startDateField}`);
        }
      }
      return true;
    }),
  
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateEssay,
  validateMaterial,
  validatePost,
  validateVideo,
  validateSubscription,
  validateEssayCorrection,
  validateMessage,
  validateProfileUpdate,
  validatePasswordChange,
  validateSiteSettings,
  validateQueryParams,
  validateParamId,
  validateFileUpload,
  sanitizeInput,
  validateDateRange,
  handleValidationErrors
};