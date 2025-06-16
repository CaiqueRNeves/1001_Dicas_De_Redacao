const { TIMEZONE_CONFIG } = require('./constants');

// Obter data atual no timezone brasileiro
const now = () => {
  return new Date().toLocaleString('pt-BR', { 
    timeZone: TIMEZONE_CONFIG.DEFAULT 
  });
};

// Obter timestamp atual
const timestamp = () => {
  return Date.now();
};

// Formatar data para diferentes formatos
const formatDate = (date, format = 'DD/MM/YYYY') => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
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
    case 'YYYY-MM-DD HH:mm:ss':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    case 'HH:mm':
      return `${hours}:${minutes}`;
    case 'HH:mm:ss':
      return `${hours}:${minutes}:${seconds}`;
    case 'ISO':
      return d.toISOString();
    case 'timestamp':
      return d.getTime();
    default:
      return d.toLocaleDateString('pt-BR');
  }
};

// Formatar data relativa (há X tempo)
const formatRelativeDate = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
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

// Calcular diferença entre datas
const dateDiff = (date1, date2, unit = 'days') => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  
  const diffTime = Math.abs(d2 - d1);
  
  switch (unit) {
    case 'milliseconds':
      return diffTime;
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
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
};

// Adicionar tempo a uma data
const addTime = (date, amount, unit = 'days') => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  switch (unit) {
    case 'milliseconds':
      d.setMilliseconds(d.getMilliseconds() + amount);
      break;
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
};

// Subtrair tempo de uma data
const subtractTime = (date, amount, unit = 'days') => {
  return addTime(date, -amount, unit);
};

// Verificar se é fim de semana
const isWeekend = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  
  const day = d.getDay();
  return day === 0 || day === 6; // Domingo ou Sábado
};

// Verificar se é dia útil
const isWorkday = (date) => {
  return !isWeekend(date);
};

// Obter primeiro e último dia do mês
const getMonthRange = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  
  return { firstDay, lastDay };
};

// Obter primeiro e último dia da semana
const getWeekRange = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  const day = d.getDay();
  const firstDay = new Date(d);
  firstDay.setDate(d.getDate() - day); // Domingo
  
  const lastDay = new Date(firstDay);
  lastDay.setDate(firstDay.getDate() + 6); // Sábado
  
  return { firstDay, lastDay };
};

// Obter número da semana do ano
const getWeekNumber = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 0;
  
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d - startOfYear) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  
  return week;
};

// Obter idade a partir da data de nascimento
const getAge = (birthDate) => {
  const birth = new Date(birthDate);
  const today = new Date();
  
  if (isNaN(birth.getTime())) return 0;
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

// Verificar se uma data está no passado
const isPast = (date) => {
  const d = new Date(date);
  const now = new Date();
  return d < now;
};

// Verificar se uma data está no futuro
const isFuture = (date) => {
  const d = new Date(date);
  const now = new Date();
  return d > now;
};

// Verificar se uma data é hoje
const isToday = (date) => {
  const d = new Date(date);
  const today = new Date();
  
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
};

// Verificar se uma data é ontem
const isYesterday = (date) => {
  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return d.getDate() === yesterday.getDate() &&
         d.getMonth() === yesterday.getMonth() &&
         d.getFullYear() === yesterday.getFullYear();
};

// Verificar se uma data é amanhã
const isTomorrow = (date) => {
  const d = new Date(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return d.getDate() === tomorrow.getDate() &&
         d.getMonth() === tomorrow.getMonth() &&
         d.getFullYear() === tomorrow.getFullYear();
};

// Obter início do dia (00:00:00)
const startOfDay = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  d.setHours(0, 0, 0, 0);
  return d;
};

// Obter fim do dia (23:59:59)
const endOfDay = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  d.setHours(23, 59, 59, 999);
  return d;
};

// Obter início da semana (domingo)
const startOfWeek = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  const day = d.getDay();
  const diff = d.getDate() - day;
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
};

// Obter fim da semana (sábado)
const endOfWeek = (date) => {
  const start = startOfWeek(date);
  if (!start) return null;
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

// Obter início do mês
const startOfMonth = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
};

// Obter fim do mês
const endOfMonth = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return end;
};

// Obter início do ano
const startOfYear = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  const start = new Date(d.getFullYear(), 0, 1);
  start.setHours(0, 0, 0, 0);
  return start;
};

// Obter fim do ano
const endOfYear = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  const end = new Date(d.getFullYear(), 11, 31);
  end.setHours(23, 59, 59, 999);
  return end;
};

// Verificar se uma data está entre duas outras datas
const isBetween = (date, startDate, endDate) => {
  const d = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(d.getTime()) || isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }
  
  return d >= start && d <= end;
};

// Obter próximo dia útil
const getNextWorkday = (date) => {
  let d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  do {
    d.setDate(d.getDate() + 1);
  } while (isWeekend(d));
  
  return d;
};

// Obter dia útil anterior
const getPreviousWorkday = (date) => {
  let d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  do {
    d.setDate(d.getDate() - 1);
  } while (isWeekend(d));
  
  return d;
};

// Contar dias úteis entre duas datas
const countWorkdays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  
  let count = 0;
  const current = new Date(start);
  
  while (current <= end) {
    if (isWorkday(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

// Formatar duração em segundos para string legível
const formatDuration = (seconds, format = 'long') => {
  if (!seconds || seconds < 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (format === 'short') {
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else if (minutes > 0) {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${secs}s`;
    }
  }
  
  // Formato longo
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
};

// Converter string de data brasileira (DD/MM/YYYY) para Date
const parseFromBRFormat = (dateString) => {
  if (!dateString) return null;
  
  const parts = dateString.split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Mês é zero-indexado
  const year = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  
  // Verificar se a data é válida
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null;
  }
  
  return date;
};

// Obter dias do mês em formato de array
const getDaysInMonth = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return [];
  
  const year = d.getFullYear();
  const month = d.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }
  
  return days;
};

// Obter feriados brasileiros para um ano específico
const getBrazilianHolidays = (year) => {
  const holidays = [
    new Date(year, 0, 1),   // Ano Novo
    new Date(year, 3, 21),  // Tiradentes
    new Date(year, 4, 1),   // Dia do Trabalho
    new Date(year, 8, 7),   // Independência
    new Date(year, 9, 12),  // Nossa Senhora Aparecida
    new Date(year, 10, 2),  // Finados
    new Date(year, 10, 15), // Proclamação da República
    new Date(year, 11, 25)  // Natal
  ];
  
  // Calcular Páscoa e feriados móveis
  const easter = calculateEaster(year);
  holidays.push(
    subtractTime(easter, 47, 'days'), // Carnaval
    subtractTime(easter, 46, 'days'), // Carnaval
    subtractTime(easter, 2, 'days'),  // Sexta-feira Santa
    addTime(easter, 60, 'days')       // Corpus Christi
  );
  
  return holidays.sort((a, b) => a - b);
};

// Calcular data da Páscoa para um ano específico
const calculateEaster = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
};

// Verificar se uma data é feriado
const isHoliday = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  
  const holidays = getBrazilianHolidays(d.getFullYear());
  
  return holidays.some(holiday => 
    holiday.getDate() === d.getDate() &&
    holiday.getMonth() === d.getMonth() &&
    holiday.getFullYear() === d.getFullYear()
  );
};

// Obter timezone offset em minutos
const getTimezoneOffset = (date = new Date()) => {
  return date.getTimezoneOffset();
};

// Converter data para UTC
const toUTC = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  return new Date(d.getTime() + (d.getTimezoneOffset() * 60000));
};

// Converter data UTC para timezone local
const fromUTC = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
};

// Obter nome do mês em português
const getMonthName = (monthIndex, short = false) => {
  const months = short 
    ? ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    : ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  return months[monthIndex] || '';
};

// Obter nome do dia da semana em português
const getDayName = (dayIndex, short = false) => {
  const days = short
    ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
    : ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
       'Quinta-feira', 'Sexta-feira', 'Sábado'];
  
  return days[dayIndex] || '';
};

module.exports = {
  // Básicas
  now,
  timestamp,
  formatDate,
  formatRelativeDate,
  formatDuration,
  
  // Cálculos
  dateDiff,
  addTime,
  subtractTime,
  getAge,
  
  // Verificações
  isPast,
  isFuture,
  isToday,
  isYesterday,
  isTomorrow,
  isWeekend,
  isWorkday,
  isHoliday,
  isBetween,
  
  // Ranges
  getMonthRange,
  getWeekRange,
  getWeekNumber,
  getDaysInMonth,
  
  // Início e fim de períodos
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  
  // Dias úteis
  getNextWorkday,
  getPreviousWorkday,
  countWorkdays,
  
  // Feriados
  getBrazilianHolidays,
  calculateEaster,
  
  // Utilitários
  parseFromBRFormat,
  getTimezoneOffset,
  toUTC,
  fromUTC,
  getMonthName,
  getDayName
};