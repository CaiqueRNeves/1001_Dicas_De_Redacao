const User = require('../models/User');
const Essay = require('../models/Essay');
const Material = require('../models/Material');
const Post = require('../models/Post');
const Video = require('../models/Video');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const Message = require('../models/Message');
const SiteSettings = require('../models/SiteSettings');
const logger = require('../utils/logger');

class AdminController {
  // Dashboard principal do admin
  static async getDashboard(req, res) {
    try {
      const [
        userStats,
        essayStats,
        subscriptionStats,
        paymentStats,
        recentEssays,
        recentUsers
      ] = await Promise.all([
        User.findAll({ limit: 1 }).then(result => ({
          total: result.pagination.total,
          thisMonth: 0 // Implementar contagem do mês
        })),
        Essay.getStatistics(),
        Subscription.getStatistics(),
        Payment.getStatistics ? Payment.getStatistics() : { total: { count: 0, amount: 0 } },
        Essay.findPending({ limit: 5 }),
        User.findAll({ limit: 5, sortBy: 'created_at', sortOrder: 'DESC' })
      ]);

      const dashboardData = {
        overview: {
          totalUsers: userStats.total,
          totalEssays: essayStats.total,
          totalSubscriptions: subscriptionStats.total,
          totalRevenue: paymentStats.total.amount || 0,
          pendingEssays: essayStats.byStatus.pending
        },
        charts: {
          userGrowth: [], // Implementar dados históricos
          essaySubmissions: [],
          revenue: []
        },
        recent: {
          essays: recentEssays.essays.map(essay => essay.toJSON()),
          users: recentUsers.users.map(user => user.getSafeData())
        },
        statistics: {
          users: userStats,
          essays: essayStats,
          subscriptions: subscriptionStats,
          payments: paymentStats
        }
      };

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      logger.error('Erro ao obter dashboard admin:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Métricas gerais do sistema
  static async getSystemMetrics(req, res) {
    try {
      const { period = 'week' } = req.query;
      
      // Coletar métricas do sistema
      const metrics = {
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          platform: process.platform,
          nodeVersion: process.version
        },
        database: {
          connections: 1, // SQLite não tem pool de conexões
          size: await getDatabaseSize(),
          lastBackup: await getLastBackupDate()
        },
        application: {
          totalRequests: 0, // Implementar contador
          avgResponseTime: 0,
          errorRate: 0
        }
      };

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logger.error('Erro ao obter métricas do sistema:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Relatório de atividades
  static async getActivityReport(req, res) {
    try {
      const { dateFrom, dateTo, type } = req.query;
      
      const options = {};
      if (dateFrom) options.dateFrom = dateFrom;
      if (dateTo) options.dateTo = dateTo;

      let activities = [];

      switch (type) {
        case 'users':
          const users = await User.findAll({ ...options, limit: 100 });
          activities = users.users.map(user => ({
            type: 'user_registration',
            date: user.created_at,
            user: user.getSafeData(),
            description: `Usuário ${user.name} se registrou`
          }));
          break;

        case 'essays':
          const essays = await Essay.findAll({ ...options, limit: 100 });
          activities = essays.essays.map(essay => ({
            type: 'essay_submission',
            date: essay.submitted_at,
            user: { id: essay.user_id, name: essay.user_name },
            description: `Redação "${essay.title}" enviada`
          }));
          break;

        case 'payments':
          if (Payment.findAll) {
            const payments = await Payment.findAll({ ...options, limit: 100 });
            activities = payments.payments.map(payment => ({
              type: 'payment',
              date: payment.created_at,
              user: { id: payment.user_id, name: payment.user_name },
              description: `Pagamento de R$ ${payment.amount} - ${payment.status}`
            }));
          }
          break;

        default:
          // Atividades mistas
          const [userActivities, essayActivities] = await Promise.all([
            User.findAll({ ...options, limit: 50 }),
            Essay.findAll({ ...options, limit: 50 })
          ]);
          
          activities = [
            ...userActivities.users.map(user => ({
              type: 'user_registration',
              date: user.created_at,
              user: user.getSafeData(),
              description: `Usuário ${user.name} se registrou`
            })),
            ...essayActivities.essays.map(essay => ({
              type: 'essay_submission',
              date: essay.submitted_at,
              user: { id: essay.user_id, name: essay.user_name },
              description: `Redação "${essay.title}" enviada`
            }))
          ].sort((a, b) => new Date(b.date) - new Date(a.date));
      }

      res.json({
        success: true,
        data: {
          activities: activities.slice(0, 100),
          total: activities.length,
          period: { dateFrom, dateTo },
          type
        }
      });

    } catch (error) {
      logger.error('Erro ao obter relatório de atividades:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Configurações do site
  static async getSiteSettings(req, res) {
    try {
      const { category } = req.query;
      
      const options = {};
      if (category) options.category = category;

      const settings = await SiteSettings.findAll(options);
      const categories = await SiteSettings.getCategories();

      res.json({
        success: true,
        data: {
          settings: settings.map(setting => setting.toJSON()),
          categories
        }
      });

    } catch (error) {
      logger.error('Erro ao obter configurações:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar configuração do site
  static async updateSiteSetting(req, res) {
    try {
      const { key, value, type = 'string', description, category = 'general', is_public = false } = req.body;

      if (!key || value === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Chave e valor são obrigatórios'
        });
      }

      // Validar valor baseado no tipo
      if (!SiteSettings.validateValue(value, type)) {
        return res.status(400).json({
          success: false,
          message: 'Valor inválido para o tipo especificado'
        });
      }

      const setting = await SiteSettings.set(key, value, {
        type,
        description,
        category,
        is_public,
        updated_by: req.user.id
      });

      logger.info(`Configuração atualizada: ${key} = ${value} por ${req.user.email}`);

      res.json({
        success: true,
        message: 'Configuração atualizada com sucesso',
        data: setting.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao atualizar configuração:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Backup das configurações
  static async backupSettings(req, res) {
    try {
      const backup = await SiteSettings.backup();
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="settings-backup-${Date.now()}.json"`);
      
      res.json(backup);

    } catch (error) {
      logger.error('Erro ao criar backup:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Restaurar configurações
  static async restoreSettings(req, res) {
    try {
      const { backupData } = req.body;

      if (!backupData || !backupData.settings) {
        return res.status(400).json({
          success: false,
          message: 'Dados de backup inválidos'
        });
      }

      await SiteSettings.restore(backupData, req.user.id);

      logger.info(`Configurações restauradas por ${req.user.email}`);

      res.json({
        success: true,
        message: 'Configurações restauradas com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao restaurar configurações:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Reset configurações para padrão
  static async resetSettings(req, res) {
    try {
      await SiteSettings.resetToDefaults(req.user.id);

      logger.info(`Configurações resetadas por ${req.user.email}`);

      res.json({
        success: true,
        message: 'Configurações resetadas para os valores padrão'
      });

    } catch (error) {
      logger.error('Erro ao resetar configurações:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Logs do sistema
  static async getSystemLogs(req, res) {
    try {
      const { type = 'app', limit = 100, search } = req.query;
      
      const fs = require('fs').promises;
      const path = require('path');
      
      let logFile;
      switch (type) {
        case 'error':
          logFile = path.join(__dirname, '../../logs/error.log');
          break;
        case 'audit':
          logFile = path.join(__dirname, '../../logs/audit.log');
          break;
        case 'security':
          logFile = path.join(__dirname, '../../logs/security.log');
          break;
        default:
          logFile = path.join(__dirname, '../../logs/app.log');
      }

      try {
        const logContent = await fs.readFile(logFile, 'utf8');
        let logs = logContent.split('\n')
          .filter(line => line.trim())
          .slice(-parseInt(limit))
          .reverse();

        if (search) {
          logs = logs.filter(log => log.toLowerCase().includes(search.toLowerCase()));
        }

        res.json({
          success: true,
          data: {
            logs,
            type,
            total: logs.length
          }
        });

      } catch (fileError) {
        res.json({
          success: true,
          data: {
            logs: [],
            type,
            total: 0,
            message: `Arquivo de log ${type} não encontrado`
          }
        });
      }

    } catch (error) {
      logger.error('Erro ao obter logs:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Limpeza de dados
  static async cleanupData(req, res) {
    try {
      const { type } = req.body;
      let cleaned = 0;

      switch (type) {
        case 'expired_payments':
          if (Payment.markExpiredPayments) {
            cleaned = await Payment.markExpiredPayments();
          }
          break;
        
        case 'expired_subscriptions':
          cleaned = await Subscription.markExpired();
          break;
        
        case 'old_uploads':
          const { cleanupOldUploads } = require('../config/multer');
          await cleanupOldUploads();
          cleaned = 1; // Apenas indicativo
          break;
        
        default:
          return res.status(400).json({
            success: false,
            message: 'Tipo de limpeza inválido'
          });
      }

      logger.info(`Limpeza de dados executada: ${type}, ${cleaned} itens processados por ${req.user.email}`);

      res.json({
        success: true,
        message: `Limpeza concluída: ${cleaned} itens processados`,
        data: { type, cleaned }
      });

    } catch (error) {
      logger.error('Erro na limpeza de dados:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Envio de email em massa
  static async sendBulkEmail(req, res) {
    try {
      const { subject, content, recipients = 'all' } = req.body;

      if (!subject || !content) {
        return res.status(400).json({
          success: false,
          message: 'Assunto e conteúdo são obrigatórios'
        });
      }

      // Obter lista de emails
      let emailList = [];
      
      if (recipients === 'all') {
        const users = await User.findAll({ limit: 1000 });
        emailList = users.users.map(user => user.email);
      } else if (recipients === 'subscribers') {
        const subscribers = await User.query(`
          SELECT u.email FROM users u 
          JOIN subscriptions s ON u.subscription_id = s.id 
          WHERE s.status = 'active'
        `);
        emailList = subscribers.map(sub => sub.email);
      } else if (Array.isArray(recipients)) {
        emailList = recipients;
      }

      // Enviar emails
      const emailService = require('../services/emailService');
      const result = await emailService.sendBulkEmail(emailList, subject, content);

      logger.info(`Email em massa enviado por ${req.user.email}: ${result.successful} sucessos, ${result.failed} falhas`);

      res.json({
        success: true,
        message: `Emails enviados: ${result.successful} sucessos, ${result.failed} falhas`,
        data: result
      });

    } catch (error) {
      logger.error('Erro no envio de email em massa:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Estatísticas detalhadas
  static async getDetailedStats(req, res) {
    try {
      const { period = 'month' } = req.query;
      
      const [
        userStats,
        essayStats,
        subscriptionStats,
        paymentStats
      ] = await Promise.all([
        User.findAll({ limit: 1 }).then(result => ({ total: result.pagination.total })),
        Essay.getStatistics(),
        Subscription.getStatistics(),
        Payment.getStatistics ? Payment.getStatistics() : { total: { count: 0, amount: 0 } }
      ]);

      const detailedStats = {
        summary: {
          users: userStats.total,
          essays: essayStats.total,
          subscriptions: subscriptionStats.total,
          revenue: paymentStats.total.amount || 0
        },
        breakdown: {
          essays: essayStats,
          subscriptions: subscriptionStats,
          payments: paymentStats
        },
        trends: {
          // Implementar dados históricos baseados no período
          period,
          data: []
        }
      };

      res.json({
        success: true,
        data: detailedStats
      });

    } catch (error) {
      logger.error('Erro ao obter estatísticas detalhadas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Exportar dados
  static async exportData(req, res) {
    try {
      const { type, format = 'json', dateFrom, dateTo } = req.query;
      
      const options = {};
      if (dateFrom) options.dateFrom = dateFrom;
      if (dateTo) options.dateTo = dateTo;

      let data = {};

      switch (type) {
        case 'users':
          const users = await User.findAll({ ...options, limit: 5000 });
          data = users.users.map(user => user.getSafeData());
          break;
        
        case 'essays':
          const essays = await Essay.findAll({ ...options, limit: 5000 });
          data = essays.essays.map(essay => essay.toJSON());
          break;
        
        case 'subscriptions':
          const subscriptions = await Subscription.findAll({ ...options, limit: 5000 });
          data = subscriptions.subscriptions.map(sub => sub.toJSON());
          break;
        
        default:
          return res.status(400).json({
            success: false,
            message: 'Tipo de exportação inválido'
          });
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${type}-export-${timestamp}`;

      if (format === 'csv') {
        // Converter para CSV (implementação simples)
        const csvData = convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(csvData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        res.json({
          exportInfo: {
            type,
            format,
            exportedAt: new Date().toISOString(),
            recordCount: data.length,
            exportedBy: req.user.email
          },
          data
        });
      }

      logger.info(`Dados exportados: ${type} (${data.length} registros) por ${req.user.email}`);

    } catch (error) {
      logger.error('Erro ao exportar dados:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

// Funções auxiliares

// Obter tamanho do banco de dados
async function getDatabaseSize() {
  try {
    const fs = require('fs').promises;
    const { DATABASE_PATH } = require('../config/database');
    const stats = await fs.stat(DATABASE_PATH);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

// Obter data do último backup
async function getLastBackupDate() {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const backupDir = path.join(__dirname, '../../backups');
    
    try {
      const files = await fs.readdir(backupDir);
      const backupFiles = files.filter(file => file.endsWith('.sqlite'));
      
      if (backupFiles.length === 0) return null;
      
      const latest = backupFiles.sort().pop();
      const stats = await fs.stat(path.join(backupDir, latest));
      return stats.mtime;
    } catch {
      return null;
    }
  } catch (error) {
    return null;
  }
}

// Converter array para CSV
function convertToCSV(data) {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escapar vírgulas e aspas
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
}

module.exports = AdminController;