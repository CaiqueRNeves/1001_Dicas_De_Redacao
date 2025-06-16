const logger = require('../utils/logger');
const { query, queryOne } = require('../config/database');

class MetricsService {
  constructor() {
    this.metrics = new Map();
    this.startTime = Date.now();
  }

  // Coletar métricas do sistema
  async getSystemMetrics() {
    try {
      const metrics = {
        system: await this.getSystemInfo(),
        database: await this.getDatabaseMetrics(),
        application: await this.getApplicationMetrics(),
        performance: await this.getPerformanceMetrics(),
        storage: await this.getStorageMetrics()
      };

      return metrics;
    } catch (error) {
      logger.error('Erro ao coletar métricas do sistema:', error);
      throw error;
    }
  }

  // Informações do sistema
  async getSystemInfo() {
    const os = require('os');
    const process = require('process');

    return {
      platform: process.platform,
      nodeVersion: process.version,
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        rss: process.memoryUsage().rss,
        external: process.memoryUsage().external,
        percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
      },
      cpu: {
        usage: process.cpuUsage(),
        cores: os.cpus().length,
        model: os.cpus()[0]?.model,
        loadAvg: os.loadavg()
      },
      os: {
        type: os.type(),
        release: os.release(),
        arch: os.arch(),
        freeMemory: os.freemem(),
        totalMemory: os.totalmem(),
        memoryUsagePercent: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
      }
    };
  }

  // Métricas do banco de dados
  async getDatabaseMetrics() {
    try {
      const fs = require('fs').promises;
      const { DATABASE_PATH } = require('../config/database');

      let dbSize = 0;
      let lastModified = null;

      try {
        const stats = await fs.stat(DATABASE_PATH);
        dbSize = stats.size;
        lastModified = stats.mtime;
      } catch (error) {
        logger.warn('Não foi possível obter estatísticas do banco:', error);
      }

      // Contar registros principais
      const [users, essays, subscriptions, payments] = await Promise.all([
        queryOne('SELECT COUNT(*) as count FROM users').catch(() => ({ count: 0 })),
        queryOne('SELECT COUNT(*) as count FROM essays').catch(() => ({ count: 0 })),
        queryOne('SELECT COUNT(*) as count FROM subscriptions').catch(() => ({ count: 0 })),
        queryOne('SELECT COUNT(*) as count FROM payments').catch(() => ({ count: 0 }))
      ]);

      return {
        size: dbSize,
        sizeFormatted: this.formatBytes(dbSize),
        lastModified,
        tables: {
          users: users.count,
          essays: essays.count,
          subscriptions: subscriptions.count,
          payments: payments.count
        },
        connections: 1, // SQLite é single connection
        status: 'connected'
      };
    } catch (error) {
      logger.error('Erro ao obter métricas do banco:', error);
      return {
        size: 0,
        status: 'error',
        error: error.message
      };
    }
  }

  // Métricas da aplicação
  async getApplicationMetrics() {
    const now = Date.now();
    const uptime = now - this.startTime;

    return {
      uptime,
      uptimeFormatted: this.formatUptime(uptime),
      startTime: new Date(this.startTime).toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      requestCount: this.getMetric('requestCount') || 0,
      errorCount: this.getMetric('errorCount') || 0,
      successRate: this.calculateSuccessRate(),
      averageResponseTime: this.getMetric('averageResponseTime') || 0
    };
  }

  // Métricas de performance
  async getPerformanceMetrics() {
    const responseTimes = this.getMetric('responseTimes') || [];
    const errorRates = this.getMetric('errorRates') || [];

    return {
      averageResponseTime: this.calculateAverage(responseTimes),
      p50ResponseTime: this.calculatePercentile(responseTimes, 50),
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99),
      maxResponseTime: Math.max(...responseTimes, 0),
      minResponseTime: Math.min(...responseTimes, 0),
      errorRate: this.calculateAverage(errorRates),
      throughput: this.calculateThroughput(),
      slowestEndpoints: this.getMetric('slowestEndpoints') || []
    };
  }

  // Métricas de armazenamento
  async getStorageMetrics() {
    try {
      const fileService = require('./fileService');
      const storageStats = await fileService.getStorageStats();

      return {
        totalFiles: storageStats.totalFiles,
        totalSize: storageStats.totalSize,
        totalSizeFormatted: storageStats.totalSizeFormatted,
        byType: storageStats.byType,
        diskUsage: await this.getDiskUsage()
      };
    } catch (error) {
      logger.error('Erro ao obter métricas de armazenamento:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        error: error.message
      };
    }
  }

  // Uso do disco
  async getDiskUsage() {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const os = require('os');

      // No Windows, usar statvfs não está disponível
      if (process.platform === 'win32') {
        return {
          available: 'N/A',
          used: 'N/A',
          total: 'N/A',
          percentage: 0
        };
      }

      // Para Unix-like systems
      const uploadsDir = path.join(__dirname, '../../uploads');
      
      try {
        const stats = await fs.stat(uploadsDir);
        return {
          available: 'Available',
          used: 'Used',
          total: 'Total',
          percentage: 0 // Placeholder
        };
      } catch {
        return {
          available: 0,
          used: 0,
          total: 0,
          percentage: 0
        };
      }
    } catch (error) {
      return {
        error: error.message
      };
    }
  }

  // Registrar métrica
  setMetric(key, value) {
    this.metrics.set(key, value);
  }

  // Obter métrica
  getMetric(key) {
    return this.metrics.get(key);
  }

  // Incrementar contador
  incrementCounter(key, value = 1) {
    const current = this.getMetric(key) || 0;
    this.setMetric(key, current + value);
  }

  // Adicionar valor a array de métricas
  addToMetricArray(key, value, maxSize = 1000) {
    let array = this.getMetric(key) || [];
    array.push(value);
    
    // Manter apenas os últimos valores
    if (array.length > maxSize) {
      array = array.slice(-maxSize);
    }
    
    this.setMetric(key, array);
  }

  // Registrar tempo de resposta
  recordResponseTime(time, endpoint = null) {
    this.addToMetricArray('responseTimes', time);
    
    if (endpoint) {
      const key = `responseTime_${endpoint}`;
      this.addToMetricArray(key, time, 100);
      
      // Atualizar endpoints mais lentos
      this.updateSlowestEndpoints(endpoint, time);
    }
  }

  // Registrar erro
  recordError(error, endpoint = null) {
    this.incrementCounter('errorCount');
    this.addToMetricArray('errors', {
      message: error.message,
      stack: error.stack,
      endpoint,
      timestamp: new Date().toISOString()
    }, 100);
  }

  // Registrar requisição
  recordRequest(method, endpoint, statusCode) {
    this.incrementCounter('requestCount');
    
    const key = `requests_${method}_${statusCode}`;
    this.incrementCounter(key);
    
    // Calcular taxa de erro
    if (statusCode >= 400) {
      this.incrementCounter('errorRequests');
    } else {
      this.incrementCounter('successRequests');
    }
  }

  // Calcular taxa de sucesso
  calculateSuccessRate() {
    const total = this.getMetric('requestCount') || 0;
    const errors = this.getMetric('errorRequests') || 0;
    
    if (total === 0) return 100;
    return ((total - errors) / total) * 100;
  }

  // Calcular média
  calculateAverage(array) {
    if (!array || array.length === 0) return 0;
    return array.reduce((sum, val) => sum + val, 0) / array.length;
  }

  // Calcular percentil
  calculatePercentile(array, percentile) {
    if (!array || array.length === 0) return 0;
    
    const sorted = [...array].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    
    return sorted[index] || 0;
  }

  // Calcular throughput (requests per second)
  calculateThroughput() {
    const requests = this.getMetric('requestCount') || 0;
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    
    return uptimeSeconds > 0 ? requests / uptimeSeconds : 0;
  }

  // Atualizar endpoints mais lentos
  updateSlowestEndpoints(endpoint, time) {
    let slowest = this.getMetric('slowestEndpoints') || [];
    
    const existing = slowest.find(e => e.endpoint === endpoint);
    if (existing) {
      existing.times.push(time);
      existing.avgTime = this.calculateAverage(existing.times);
      
      // Manter apenas os últimos 50 tempos
      if (existing.times.length > 50) {
        existing.times = existing.times.slice(-50);
      }
    } else {
      slowest.push({
        endpoint,
        times: [time],
        avgTime: time
      });
    }
    
    // Ordenar por tempo médio e manter apenas top 10
    slowest.sort((a, b) => b.avgTime - a.avgTime);
    slowest = slowest.slice(0, 10);
    
    this.setMetric('slowestEndpoints', slowest);
  }

  // Middleware para coleta automática de métricas
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Interceptar response
      const originalSend = res.send;
      res.send = function(data) {
        const duration = Date.now() - startTime;
        
        // Registrar métricas
        metricsService.recordRequest(req.method, req.path, res.statusCode);
        metricsService.recordResponseTime(duration, req.path);
        
        // Registrar erro se status >= 400
        if (res.statusCode >= 400) {
          metricsService.recordError(new Error(`HTTP ${res.statusCode}`), req.path);
        }
        
        return originalSend.call(this, data);
      };
      
      next();
    };
  }

  // Obter métricas em tempo real
  getRealTimeMetrics() {
    const now = Date.now();
    const last5Min = now - (5 * 60 * 1000);
    
    const responseTimes = this.getMetric('responseTimes') || [];
    const recent = responseTimes.filter((_, index) => {
      // Aproximação: assumir que cada entrada representa ~1 segundo
      return index >= responseTimes.length - 300; // últimos 5 minutos
    });
    
    return {
      timestamp: now,
      activeConnections: 1, // SQLite
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      recentResponseTime: this.calculateAverage(recent),
      errorRate: this.calculateSuccessRate(),
      requestsPerSecond: this.calculateThroughput()
    };
  }

  // Limpar métricas antigas
  cleanup() {
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    const cutoff = Date.now() - maxAge;
    
    // Limpar arrays de métricas muito grandes
    const arrayMetrics = ['responseTimes', 'errors'];
    
    arrayMetrics.forEach(key => {
      const array = this.getMetric(key);
      if (array && array.length > 10000) {
        this.setMetric(key, array.slice(-5000)); // Manter últimos 5000
      }
    });
    
    logger.info('Métricas antigas limpas');
  }

  // Agendar limpeza automática
  scheduleCleanup() {
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // A cada hora
  }

  // Formatar bytes
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Formatar uptime
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Exportar métricas para monitoramento externo
  exportMetrics(format = 'json') {
    const metrics = {
      timestamp: new Date().toISOString(),
      system: this.getSystemInfo(),
      application: this.getApplicationMetrics(),
      performance: this.getPerformanceMetrics()
    };
    
    switch (format) {
      case 'prometheus':
        return this.toPrometheusFormat(metrics);
      case 'json':
      default:
        return metrics;
    }
  }

  // Converter para formato Prometheus
  toPrometheusFormat(metrics) {
    const lines = [];
    
    // Métricas básicas
    lines.push(`# HELP app_uptime_seconds Application uptime in seconds`);
    lines.push(`# TYPE app_uptime_seconds counter`);
    lines.push(`app_uptime_seconds ${Math.floor(metrics.application.uptime / 1000)}`);
    
    lines.push(`# HELP app_requests_total Total number of requests`);
    lines.push(`# TYPE app_requests_total counter`);
    lines.push(`app_requests_total ${metrics.application.requestCount}`);
    
    lines.push(`# HELP app_errors_total Total number of errors`);
    lines.push(`# TYPE app_errors_total counter`);
    lines.push(`app_errors_total ${metrics.application.errorCount}`);
    
    lines.push(`# HELP app_response_time_avg Average response time in milliseconds`);
    lines.push(`# TYPE app_response_time_avg gauge`);
    lines.push(`app_response_time_avg ${metrics.performance.averageResponseTime}`);
    
    return lines.join('\n');
  }

  // Gerar relatório de saúde
  async generateHealthReport() {
    try {
      const metrics = await this.getSystemMetrics();
      const health = {
        status: 'healthy',
        checks: {},
        timestamp: new Date().toISOString()
      };
      
      // Verificação de memória
      if (metrics.system.memory.percentage > 90) {
        health.checks.memory = { status: 'critical', message: 'High memory usage' };
        health.status = 'critical';
      } else if (metrics.system.memory.percentage > 70) {
        health.checks.memory = { status: 'warning', message: 'Moderate memory usage' };
        if (health.status === 'healthy') health.status = 'warning';
      } else {
        health.checks.memory = { status: 'healthy', message: 'Memory usage normal' };
      }
      
      // Verificação de banco de dados
      if (metrics.database.status === 'connected') {
        health.checks.database = { status: 'healthy', message: 'Database connected' };
      } else {
        health.checks.database = { status: 'critical', message: 'Database connection failed' };
        health.status = 'critical';
      }
      
      // Verificação de taxa de erro
      const errorRate = 100 - metrics.application.successRate;
      if (errorRate > 20) {
        health.checks.errorRate = { status: 'critical', message: 'High error rate' };
        health.status = 'critical';
      } else if (errorRate > 10) {
        health.checks.errorRate = { status: 'warning', message: 'Moderate error rate' };
        if (health.status === 'healthy') health.status = 'warning';
      } else {
        health.checks.errorRate = { status: 'healthy', message: 'Error rate normal' };
      }
      
      return health;
    } catch (error) {
      logger.error('Erro ao gerar relatório de saúde:', error);
      return {
        status: 'critical',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Criar instância singleton
const metricsService = new MetricsService();

// Agendar limpeza automática
metricsService.scheduleCleanup();

module.exports = metricsService;