// Formatadores específicos para a aplicação 1001 Dicas de Redação

// Formatadores de moeda
const formatCurrency = (value, currency = 'BRL', locale = 'pt-BR') => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

// Formatador de porcentagem
const formatPercent = (value, decimals = 1, locale = 'pt-BR') => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
};

// Formatador de números
const formatNumber = (value, decimals = 0, locale = 'pt-BR') => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

// Formatadores de data específicos
const formatDateBR = (date, includeTime = false) => {
  if (!date) return '-';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return d.toLocaleDateString('pt-BR', options);
};

// Formatador de data relativa (há X tempo)
const formatRelativeDate = (date) => {
  if (!date) return '-';
  
  const now = new Date();
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  
  const diffMs = now - d;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSecs < 60) return 'agora mesmo';
  if (diffMins < 60) return `há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
  if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 30) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  if (diffMonths < 12) return `há ${diffMonths} mês${diffMonths > 1 ? 'es' : ''}`;
  return `há ${diffYears} ano${diffYears > 1 ? 's' : ''}`;
};

// Formatador de tempo de duração
const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// Formatador de tamanho de arquivo
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Formatador de nota de redação
const formatGrade = (grade) => {
  if (grade === null || grade === undefined) {
    return 'Não avaliada';
  }
  
  const numGrade = parseFloat(grade);
  if (isNaN(numGrade)) return 'Inválida';
  
  return `${numGrade.toFixed(0)}/1000`;
};

// Formatador de nível de nota
const formatGradeLevel = (grade) => {
  if (grade === null || grade === undefined || isNaN(grade)) {
    return { level: 'N/A', color: '#6c757d', description: 'Não avaliada' };
  }
  
  const numGrade = parseFloat(grade);
  
  if (numGrade >= 900) {
    return { level: 'Excelente', color: '#28a745', description: 'Nota excepcional' };
  } else if (numGrade >= 800) {
    return { level: 'Muito Bom', color: '#20c997', description: 'Ótima redação' };
  } else if (numGrade >= 700) {
    return { level: 'Bom', color: '#ffc107', description: 'Boa redação' };
  } else if (numGrade >= 600) {
    return { level: 'Regular', color: '#fd7e14', description: 'Precisa melhorar' };
  } else if (numGrade >= 400) {
    return { level: 'Insuficiente', color: '#dc3545', description: 'Necessita estudo' };
  } else {
    return { level: 'Muito Insuficiente', color: '#6f42c1', description: 'Requer atenção especial' };
  }
};

// Formatador de status de redação
const formatEssayStatus = (status) => {
  const statusMap = {
    pending: { text: 'Pendente', color: '#ffc107', icon: '⏳' },
    correcting: { text: 'Em Correção', color: '#17a2b8', icon: '✏️' },
    corrected: { text: 'Corrigida', color: '#28a745', icon: '✅' },
    returned: { text: 'Entregue', color: '#6f42c1', icon: '📝' },
    cancelled: { text: 'Cancelada', color: '#dc3545', icon: '❌' }
  };
  
  return statusMap[status] || { text: status, color: '#6c757d', icon: '❓' };
};

// Formatador de status de assinatura
const formatSubscriptionStatus = (status, endDate = null) => {
  const now = new Date();
  const end = endDate ? new Date(endDate) : null;
  
  const statusMap = {
    active: { 
      text: end && end < now ? 'Expirada' : 'Ativa', 
      color: end && end < now ? '#dc3545' : '#28a745', 
      icon: end && end < now ? '⚠️' : '✅' 
    },
    cancelled: { text: 'Cancelada', color: '#dc3545', icon: '❌' },
    expired: { text: 'Expirada', color: '#6c757d', icon: '⏰' },
    inactive: { text: 'Suspensa', color: '#ffc107', icon: '⏸️' }
  };
  
  return statusMap[status] || { text: status, color: '#6c757d', icon: '❓' };
};

// Formatador de tipo de plano
const formatPlanType = (planType) => {
  const planMap = {
    master: { text: 'Plano Master', color: '#17a2b8', description: 'Até 2 redações/semana' },
    vip: { text: 'Plano VIP', color: '#ffc107', description: 'Até 4 redações/semana' }
  };
  
  return planMap[planType] || { text: planType, color: '#6c757d', description: '' };
};

// Formatador de método de pagamento
const formatPaymentMethod = (method) => {
  const methodMap = {
    credit_card: { text: 'Cartão de Crédito', icon: '💳' },
    debit_card: { text: 'Cartão de Débito', icon: '💳' },
    pix: { text: 'PIX', icon: '📱' },
    boleto: { text: 'Boleto', icon: '🧾' },
    online: { text: 'Online', icon: '💻' }
  };
  
  return methodMap[method] || { text: method, icon: '❓' };
};

// Formatador de status de pagamento
const formatPaymentStatus = (status) => {
  const statusMap = {
    pending: { text: 'Pendente', color: '#ffc107', icon: '⏳' },
    processing: { text: 'Processando', color: '#17a2b8', icon: '🔄' },
    completed: { text: 'Concluído', color: '#28a745', icon: '✅' },
    failed: { text: 'Falhou', color: '#dc3545', icon: '❌' },
    cancelled: { text: 'Cancelado', color: '#6c757d', icon: '⏹️' },
    expired: { text: 'Expirado', color: '#fd7e14', icon: '⏰' },
    refunded: { text: 'Reembolsado', color: '#6f42c1', icon: '↩️' }
  };
  
  return statusMap[status] || { text: status, color: '#6c757d', icon: '❓' };
};

// Formatador de telefone brasileiro
const formatPhone = (phone) => {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    // Celular: (11) 99999-9999
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    // Fixo: (11) 9999-9999
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.startsWith('55') && cleaned.length === 13) {
    // Com código do país: +55 (11) 99999-9999
    return `+55 (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  }
  
  return phone;
};

// Formatador de CPF
const formatCPF = (cpf) => {
  if (!cpf) return '';
  
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }
  
  return cpf;
};

// Formatador de texto limitado
const formatTextLimit = (text, limit = 100, suffix = '...') => {
  if (!text) return '';
  
  if (text.length <= limit) return text;
  
  return text.substring(0, limit).trim() + suffix;
};

// Formatador de nome (primeira e última palavra)
const formatDisplayName = (fullName) => {
  if (!fullName) return '';
  
  const parts = fullName.trim().split(' ').filter(part => part.length > 0);
  
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

// Formatador de iniciais
const formatInitials = (fullName, maxLength = 2) => {
  if (!fullName) return '';
  
  const parts = fullName.trim().split(' ').filter(part => part.length > 0);
  
  return parts
    .slice(0, maxLength)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
};

// Formatador de estatísticas (simplificado para leitura)
const formatStatNumber = (number) => {
  if (!number || number === 0) return '0';
  
  const num = parseInt(number);
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  
  return num.toString();
};

// Formatador de tags/categorias
const formatTags = (tags, separator = ', ') => {
  if (!tags) return '';
  
  if (Array.isArray(tags)) {
    return tags.join(separator);
  }
  
  if (typeof tags === 'string') {
    return tags.split(',').map(tag => tag.trim()).join(separator);
  }
  
  return '';
};

// Formatador de endereço de email (mascarado)
const formatMaskedEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  
  const [username, domain] = email.split('@');
  
  if (username.length <= 2) return email;
  
  const maskedUsername = username[0] + '*'.repeat(Math.max(username.length - 2, 1)) + username.slice(-1);
  return `${maskedUsername}@${domain}`;
};

// Formatador de tempo de leitura estimado
const formatReadingTime = (text, wordsPerMinute = 200) => {
  if (!text) return '0 min';
  
  const wordCount = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  
  return `${minutes} min de leitura`;
};

// Formatador de contagem de palavras
const formatWordCount = (text) => {
  if (!text) return '0 palavras';
  
  const count = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  
  return `${count} palavra${count !== 1 ? 's' : ''}`;
};

// Formatador de score/pontuação
const formatScore = (score, maxScore = 100, showPercentage = false) => {
  if (score === null || score === undefined) return 'N/A';
  
  const percentage = (score / maxScore) * 100;
  
  if (showPercentage) {
    return `${percentage.toFixed(1)}% (${score}/${maxScore})`;
  }
  
  return `${score}/${maxScore}`;
};

module.exports = {
  // Formatadores básicos
  formatCurrency,
  formatPercent,
  formatNumber,
  formatDateBR,
  formatRelativeDate,
  formatDuration,
  formatFileSize,
  
  // Formatadores específicos da aplicação
  formatGrade,
  formatGradeLevel,
  formatEssayStatus,
  formatSubscriptionStatus,
  formatPlanType,
  formatPaymentMethod,
  formatPaymentStatus,
  
  // Formatadores de dados pessoais
  formatPhone,
  formatCPF,
  formatDisplayName,
  formatInitials,
  formatMaskedEmail,
  
  // Formatadores de conteúdo
  formatTextLimit,
  formatTags,
  formatReadingTime,
  formatWordCount,
  formatScore,
  
  // Formatadores utilitários
  formatStatNumber
};