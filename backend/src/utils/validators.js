// Validador de email
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validador de senha
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);

  if (password.length < minLength) {
    return {
      valid: false,
      message: `Senha deve ter pelo menos ${minLength} caracteres`
    };
  }

  if (!hasUpperCase) {
    return {
      valid: false,
      message: 'Senha deve conter pelo menos uma letra maiúscula'
    };
  }

  if (!hasLowerCase) {
    return {
      valid: false,
      message: 'Senha deve conter pelo menos uma letra minúscula'
    };
  }

  if (!hasNumbers) {
    return {
      valid: false,
      message: 'Senha deve conter pelo menos um número'
    };
  }

  if (!hasSpecialChar) {
    return {
      valid: false,
      message: 'Senha deve conter pelo menos um caractere especial (@$!%*?&)'
    };
  }

  return {
    valid: true,
    message: 'Senha válida'
  };
};

// Validador de telefone (formato brasileiro e internacional)
const validatePhone = (phone) => {
  // Remove espaços e caracteres especiais
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // Telefone brasileiro: (11) 99999-9999 ou +55 11 99999-9999
  const brPhoneRegex = /^(\+55)?[1-9]{2}9?[0-9]{8}$/;
  
  // Telefone internacional genérico
  const intlPhoneRegex = /^\+[1-9]\d{1,14}$/;
  
  return brPhoneRegex.test(cleanPhone) || intlPhoneRegex.test(cleanPhone);
};

// Validador de CPF
const validateCPF = (cpf) => {
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 > 9) digit1 = 0;
  
  if (digit1 !== parseInt(cpf.charAt(9))) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 > 9) digit2 = 0;
  
  return digit2 === parseInt(cpf.charAt(10));
};

// Validador de CNPJ
const validateCNPJ = (cnpj) => {
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  let weight = 2;
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(cnpj.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  if (digit1 !== parseInt(cnpj.charAt(12))) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  weight = 2;
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(cnpj.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  return digit2 === parseInt(cnpj.charAt(13));
};

// Validador de data de nascimento
const validateBirthDate = (birthDate, minAge = 13) => {
  const birth = new Date(birthDate);
  const today = new Date();
  
  if (birth >= today) {
    return {
      valid: false,
      message: 'Data de nascimento deve ser no passado'
    };
  }
  
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  if (age < minAge) {
    return {
      valid: false,
      message: `Idade mínima: ${minAge} anos`
    };
  }
  
  return {
    valid: true,
    message: 'Data válida'
  };
};

// Validador de URL do YouTube
const validateYouTubeURL = (url) => {
  const youtubeRegex = /^https:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}$/;
  return youtubeRegex.test(url);
};

// Extrair ID do vídeo do YouTube
const extractYouTubeID = (url) => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// Validador de slug (URL amigável)
const validateSlug = (slug) => {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
};

// Gerar slug a partir de string
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[áàãâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòõôö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

// Validador de código de cores hexadecimais
const validateHexColor = (color) => {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
};

// Validador de nota (0-1000)
const validateGrade = (grade) => {
  const numGrade = parseFloat(grade);
  
  if (isNaN(numGrade)) {
    return {
      valid: false,
      message: 'Nota deve ser um número'
    };
  }
  
  if (numGrade < 0 || numGrade > 1000) {
    return {
      valid: false,
      message: 'Nota deve estar entre 0 e 1000'
    };
  }
  
  return {
    valid: true,
    message: 'Nota válida'
  };
};

// Validador de arquivo (tipo e tamanho)
const validateFile = (file, allowedTypes = [], maxSize = 10 * 1024 * 1024) => {
  if (!file) {
    return {
      valid: false,
      message: 'Arquivo é obrigatório'
    };
  }
  
  // Verificar tipo
  if (allowedTypes.length > 0) {
    const fileExtension = file.originalname.toLowerCase().split('.').pop();
    const isAllowedType = allowedTypes.some(type => 
      type.replace('.', '').toLowerCase() === fileExtension
    );
    
    if (!isAllowedType) {
      return {
        valid: false,
        message: `Tipo de arquivo não permitido. Tipos aceitos: ${allowedTypes.join(', ')}`
      };
    }
  }
  
  // Verificar tamanho
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      message: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`
    };
  }
  
  return {
    valid: true,
    message: 'Arquivo válido'
  };
};

// Validador de JSON
const validateJSON = (jsonString) => {
  try {
    JSON.parse(jsonString);
    return {
      valid: true,
      message: 'JSON válido'
    };
  } catch (error) {
    return {
      valid: false,
      message: 'JSON inválido'
    };
  }
};

// Sanitizar entrada HTML
const sanitizeHTML = (html) => {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

// Validador de IP
const validateIP = (ip) => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

// Validador de range de datas
const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      valid: false,
      message: 'Datas inválidas'
    };
  }
  
  if (start >= end) {
    return {
      valid: false,
      message: 'Data inicial deve ser anterior à data final'
    };
  }
  
  return {
    valid: true,
    message: 'Range de datas válido'
  };
};

// Validador de plano de assinatura
const validateSubscriptionPlan = (planType) => {
  const validPlans = ['master', 'vip'];
  return validPlans.includes(planType.toLowerCase());
};

// Validador de método de pagamento
const validatePaymentMethod = (method) => {
  const validMethods = ['credit_card', 'debit_card', 'pix', 'boleto'];
  return validMethods.includes(method.toLowerCase());
};

// Validador de status de redação
const validateEssayStatus = (status) => {
  const validStatuses = ['pending', 'correcting', 'corrected', 'returned'];
  return validStatuses.includes(status.toLowerCase());
};

// Validador de role de usuário
const validateUserRole = (role) => {
  const validRoles = ['user', 'admin'];
  return validRoles.includes(role.toLowerCase());
};

module.exports = {
  validateEmail,
  validatePassword,
  validatePhone,
  validateCPF,
  validateCNPJ,
  validateBirthDate,
  validateYouTubeURL,
  extractYouTubeID,
  validateSlug,
  generateSlug,
  validateHexColor,
  validateGrade,
  validateFile,
  validateJSON,
  sanitizeHTML,
  validateIP,
  validateDateRange,
  validateSubscriptionPlan,
  validatePaymentMethod,
  validateEssayStatus,
  validateUserRole
};