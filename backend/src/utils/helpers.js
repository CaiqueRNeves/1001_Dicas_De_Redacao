const crypto = require('crypto');
const path = require('path');
const { TIMEZONE_CONFIG, PAGINATION_CONFIG } = require('./constants');

// Funções de data e hora
const dateHelpers = {
  // Obter data atual no timezone brasileiro
  now: () => {
    return new Date().toLocaleString('pt-BR', { 
      timeZone: TIMEZONE_CONFIG.DEFAULT 
    });
  },

  // Formatar data para exibição
  formatDate: (date, format = 'DD/MM/YYYY') => {
    if (!date) return '';
    
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    switch (format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'DD/MM/YYYY HH:mm':
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      case 'DD/MM/YYYY HH:mm:ss':
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'HH:mm':
        return `${hours}:${minutes}`;
      default:
        return d.toLocaleDateString('pt-BR');
    }
  },

  // Calcular diferença entre datas
  dateDiff: (date1, date2, unit = 'days') => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    
    switch (unit) {
      case 'seconds':
        return Math.floor(diffTime / 1000);
      case 'minutes':
        return Math.floor(diffTime / (1000 * 60));
      case 'hours':
        return Math.floor(diffTime / (1000 * 60 * 60));
      case 'days':
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
      case 'weeks':
        return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
      case 'months':
        return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
      case 'years':
        return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
      default:
        return diffTime;
    }
  },

  // Adicionar tempo a uma data
  addTime: (date, amount, unit = 'days') => {
    const d = new Date(date);
    
    switch (unit) {
      case 'seconds':
        d.setSeconds(d.getSeconds() + amount);
        break;
      case 'minutes':
        d.setMinutes(d.getMinutes() + amount);
        break;
      case 'hours':
        d.setHours(d.getHours() + amount);
        break;
      case 'days':
        d.setDate(d.getDate() + amount);
        break;
      case 'weeks':
        d.setDate(d.getDate() + (amount * 7));
        break;
      case 'months':
        d.setMonth(d.getMonth() + amount);
        break;
      case 'years':
        d.setFullYear(d.getFullYear() + amount);
        break;
    }
    
    return d;
  },

  // Verificar se é fim de semana
  isWeekend: (date) => {
    const d = new Date(date);
    const day = d.getDay();
    return day === 0 || day === 6; // Domingo ou Sábado
  },

  // Obter primeiro e último dia do mês
  getMonthRange: (date) => {
    const d = new Date(date);
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    
    return { firstDay, lastDay };
  }
};

// Funções de string
const stringHelpers = {
  // Capitalizar primeira letra
  capitalize: (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  // Capitalizar todas as palavras
  titleCase: (str) => {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  },

  // Gerar slug para URLs
  generateSlug: (str) => {
    if (!str) return '';
    
    return str
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
  },

  // Truncar string
  truncate: (str, length = 100, suffix = '...') => {
    if (!str) return '';
    if (str.length <= length) return str;
    
    return str.substring(0, length).trim() + suffix;
  },

  // Remover acentos
  removeAccents: (str) => {
    if (!str) return '';
    
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  },

  // Mascarar email
  maskEmail: (email) => {
    if (!email) return '';
    
    const [username, domain] = email.split('@');
    if (username.length <= 2) return email;
    
    const maskedUsername = username[0] + '*'.repeat(username.length - 2) + username.slice(-1);
    return `${maskedUsername}@${domain}`;
  },

  // Gerar string aleatória
  randomString: (length = 8, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') => {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  },

  // Contar palavras
  wordCount: (str) => {
    if (!str) return 0;
    return str.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
};

// Funções de array
const arrayHelpers = {
  // Remover duplicatas
  unique: (arr) => {
    return [...new Set(arr)];
  },

  // Agrupar por propriedade
  groupBy: (arr, key) => {
    return arr.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  },

  // Dividir array em chunks
  chunk: (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  },

  // Embaralhar array
  shuffle: (arr) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  // Ordenar por múltiplos campos
  sortBy: (arr, ...fields) => {
    return arr.sort((a, b) => {
      for (const field of fields) {
        const aVal = a[field];
        const bVal = b[field];
        
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
      }
      return 0;
    });
  }
};

// Funções de objeto
const objectHelpers = {
  // Verificar se objeto está vazio
  isEmpty: (obj) => {
    return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
  },

  // Selecionar propriedades
  pick: (obj, keys) => {
    const result = {};
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  },

  // Omitir propriedades
  omit: (obj, keys) => {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
  },

  // Deep clone
  deepClone: (obj) => {
    return JSON.parse(JSON.stringify(obj));
  },

  // Merge profundo
  deepMerge: (target, source) => {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = objectHelpers.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  },

  // Obter valor aninhado
  get: (obj, path, defaultValue = undefined) => {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result == null || typeof result !== 'object') {
        return defaultValue;
      }
      result = result[key];
    }
    
    return result !== undefined ? result : defaultValue;
  }
};

// Funções de número
const numberHelpers = {
  // Formatar moeda brasileira
  formatCurrency: (value, currency = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency
    }).format(value);
  },

  // Formatar número
  formatNumber: (value, decimals = 0) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  },

  // Formatar porcentagem
  formatPercent: (value, decimals = 1) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value / 100);
  },

  // Gerar número aleatório
  random: (min = 0, max = 1) => {
    return Math.random() * (max - min) + min;
  },

  // Gerar inteiro aleatório
  randomInt: (min = 0, max = 100) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Arredondar para decimais específicas
  round: (value, decimals = 2) => {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
};

// Funções de arquivo
const fileHelpers = {
  // Obter extensão do arquivo
  getExtension: (filename) => {
    return path.extname(filename).toLowerCase();
  },

  // Obter nome sem extensão
  getBasename: (filename) => {
    return path.basename(filename, path.extname(filename));
  },

  // Formatar tamanho de arquivo
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Gerar nome único de arquivo
  generateUniqueFilename: (originalName) => {
    const timestamp = Date.now();
    const randomString = stringHelpers.randomString(8);
    const extension = fileHelpers.getExtension(originalName);
    const baseName = fileHelpers.getBasename(originalName)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    
    return `${timestamp}_${randomString}_${baseName}${extension}`;
  }
};

// Funções de validação
const validationHelpers = {
  // Validar email
  isValidEmail: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  // Validar CPF
  isValidCPF: (cpf) => {
    cpf = cpf.replace(/[^\d]/g, '');
    
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;
    
    if (digit1 !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;
    
    return digit2 === parseInt(cpf.charAt(10));
  },

  // Validar telefone brasileiro
  isValidPhone: (phone) => {
    const cleaned = phone.replace(/[^\d]/g, '');
    return /^[1-9]{2}9?[0-9]{8}$/.test(cleaned);
  },

  // Validar força da senha
  getPasswordStrength: (password) => {
    let score = 0;
    const checks = [
      { regex: /.{8,}/, points: 1 }, // Pelo menos 8 caracteres
      { regex: /[a-z]/, points: 1 }, // Letra minúscula
      { regex: /[A-Z]/, points: 1 }, // Letra maiúscula
      { regex: /[0-9]/, points: 1 }, // Número
      { regex: /[^a-zA-Z0-9]/, points: 1 }, // Caractere especial
      { regex: /.{12,}/, points: 1 } // Pelo menos 12 caracteres (bônus)
    ];
    
    checks.forEach(check => {
      if (check.regex.test(password)) {
        score += check.points;
      }
    });
    
    if (score < 3) return 'fraca';
    if (score < 5) return 'média';
    return 'forte';
  }
};

// Funções de paginação
const paginationHelpers = {
  // Calcular offset
  calculateOffset: (page, limit) => {
    const p = parseInt(page) || PAGINATION_CONFIG.DEFAULT_PAGE;
    const l = parseInt(limit) || PAGINATION_CONFIG.DEFAULT_LIMIT;
    return (p - 1) * l;
  },

  // Criar objeto de paginação
  createPagination: (page, limit, total) => {
    const p = parseInt(page) || PAGINATION_CONFIG.DEFAULT_PAGE;
    const l = Math.min(parseInt(limit) || PAGINATION_CONFIG.DEFAULT_LIMIT, PAGINATION_CONFIG.MAX_LIMIT);
    const totalPages = Math.ceil(total / l);
    
    return {
      page: p,
      limit: l,
      total: total,
      totalPages: totalPages,
      hasNext: p < totalPages,
      hasPrev: p > 1,
      nextPage: p < totalPages ? p + 1 : null,
      prevPage: p > 1 ? p - 1 : null
    };
  }
};

// Funções de criptografia simples
const cryptoHelpers = {
  // Gerar hash MD5
  md5: (str) => {
    return crypto.createHash('md5').update(str).digest('hex');
  },

  // Gerar hash SHA256
  sha256: (str) => {
    return crypto.createHash('sha256').update(str).digest('hex');
  },

  // Gerar UUID v4
  generateUUID: () => {
    return crypto.randomUUID();
  },

  // Criptografia simples (apenas para dados não sensíveis)
  encrypt: (text, key) => {
    const cipher = crypto.createCipher('aes192', key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  },

  // Descriptografia simples
  decrypt: (encryptedText, key) => {
    const decipher = crypto.createDecipher('aes192', key);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
};

// Funções utilitárias gerais
const generalHelpers = {
  // Sleep/delay
  sleep: (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Retry com backoff
  retry: async (fn, maxAttempts = 3, delay = 1000) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxAttempts - 1) throw error;
        await generalHelpers.sleep(delay * Math.pow(2, i));
      }
    }
  },

  // Debounce
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle
  throttle: (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

module.exports = {
  dateHelpers,
  stringHelpers,
  arrayHelpers,
  objectHelpers,
  numberHelpers,
  fileHelpers,
  validationHelpers,
  paginationHelpers,
  cryptoHelpers,
  generalHelpers
};