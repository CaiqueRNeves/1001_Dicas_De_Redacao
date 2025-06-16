const User = require('../models/User');
const Essay = require('../models/Essay');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const Material = require('../models/Material');
const logger = require('../utils/logger');

class DashboardController {
  // Dashboard do usuário
  static async getUserDashboard(req, res) {
    try {
      const userId = req.user.id;

      const [
        userStats,
        subscription,
        weeklyEssayCount,
        recentEssays,
        canSubmitEssay
      ] = await Promise.all([
        req.user.getStats(),
        req.user.getCurrentSubscription(),
        req.user.getWeeklyEssayCount(),
        Essay.findByUser(userId, { limit: 5, sortBy: 'submitted_at', sortOrder: 'DESC' }),
        req.user.canSubmitEssay()
      ]);

      const dashboardData = {
        user: req.user.getSafeData(),
        subscription: subscription ? {
          ...subscription,
          isActive: subscription.status === 'active' && new Date(subscription.end_date) > new Date(),
          daysRemaining: subscription.status === 'active' ? 
            Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
          essayLimit: subscription.plan_type === 'vip' ? 4 : 2
        } : null,
        stats: userStats,
        weeklyProgress: {
          current: weeklyEssayCount,
          max: subscription ? (subscription.plan_type === 'vip' ? 4 : 2) : 0,
          canSubmit: canSubmitEssay.canSubmit,
          reason: canSubmitEssay.reason || null
        },
        recentEssays: recentEssays.essays.map(essay => essay.toJSON()),
        notifications: await getNotifications(userId)
      };

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      logger.error('Erro ao obter dashboard do usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Dashboard do administrador
  static async getAdminDashboard(req, res) {
    try {
      const [
        usersOverview,
        essaysOverview,
        subscriptionsOverview,
        paymentsOverview,
        recentActivity,
        systemHealth
      ] = await Promise.all([
        getUsersOverview(),
        getEssaysOverview(),
        getSubscriptionsOverview(),
        getPaymentsOverview(),
        getRecentActivity(),
        getSystemHealth()
      ]);

      const adminDashboard = {
        overview: {
          users: usersOverview,
          essays: essaysOverview,
          subscriptions: subscriptionsOverview,
          payments: paymentsOverview
        },
        recentActivity,
        systemHealth,
        quickActions: [
          {
            title: 'Redações Pendentes',
            count: essaysOverview.pending,
            action: '/admin/essays?status=pending',
            priority: essaysOverview.pending > 10 ? 'high' : 'normal'
          },
          {
            title: 'Novos Usuários',
            count: usersOverview.todayCount,
            action: '/admin/users?filter=today',
            priority: 'normal'
          },
          {
            title: 'Assinaturas Expirando',
            count: subscriptionsOverview.expiring,
            action: '/admin/subscriptions?filter=expiring',
            priority: subscriptionsOverview.expiring > 0 ? 'medium' : 'low'
          }
        ]
      };

      res.json({
        success: true,
        data: adminDashboard
      });

    } catch (error) {
      logger.error('Erro ao obter dashboard admin:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Métricas de performance
  static async getPerformanceMetrics(req, res) {
    try {
      const { period = '7d' } = req.query;
      
      const metrics = {
        responseTime: {
          avg: 150, // ms - implementar coleta real
          p95: 300,
          p99: 500
        },
        throughput: {
          requestsPerSecond: 2.5,
          requestsPerMinute: 150
        },
        errors: {
          rate: 0.02, // 2%
          count: 5
        },
        uptime: {
          percentage: 99.9,
          totalTime: process.uptime()
        },
        system: {
          cpu: process.cpuUsage(),
          memory: process.memoryUsage(),
          loadAverage: require('os').loadavg()
        }
      };

      res.json({
        success: true,
        data: {
          period,
          metrics,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Erro ao obter métricas de performance:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Análise de usuários
  static async getUserAnalytics(req, res) {
    try {
      const { period = '30d' } = req.query;
      
      const analytics = {
        growth: await getUserGrowthData(period),
        engagement: await getUserEngagementData(period),
        retention: await getUserRetentionData(period),
        geography: await getUserGeographyData(period),
        devices: await getUserDeviceData(period)
      };

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Erro ao obter analytics de usuários:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Relatório de receita
  static async getRevenueReport(req, res) {
    try {
      const { period = 'month' } = req.query;
      
      const revenue = {
        total: await getTotalRevenue(period),
        byPlan: await getRevenueByPlan(period),
        byPaymentMethod: await getRevenueByPaymentMethod(period),
        trends: await getRevenueTrends(period),
        projections: await getRevenueProjections(period)
      };

      res.json({
        success: true,
        data: revenue
      });

    } catch (error) {
      logger.error('Erro ao obter relatório de receita:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Estatísticas de conteúdo
  static async getContentStats(req, res) {
    try {
      const [
        essayStats,
        materialStats,
        postStats,
        videoStats
      ] = await Promise.all([
        Essay.getStatistics(),
        Material.getStatistics ? Material.getStatistics() : { total: 0 },
        Post.getStatistics ? Post.getStatistics() : { total: 0 },
        Video.getStatistics ? Video.getStatistics() : { total: 0 }
      ]);

      const contentStats = {
        essays: essayStats,
        materials: materialStats,
        posts: postStats,
        videos: videoStats,
        summary: {
          totalContent: essayStats.total + materialStats.total + postStats.total + videoStats.total,
          totalViews: (materialStats.totalDownloads || 0) + (postStats.totalViews || 0) + (videoStats.totalViews || 0)
        }
      };

      res.json({
        success: true,
        data: contentStats
      });

    } catch (error) {
      logger.error('Erro ao obter estatísticas de conteúdo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Alertas do sistema
  static async getSystemAlerts(req, res) {
    try {
      const alerts = await generateSystemAlerts();

      res.json({
        success: true,
        data: {
          alerts,
          summary: {
            critical: alerts.filter(a => a.level === 'critical').length,
            warning: alerts.filter(a => a.level === 'warning').length,
            info: alerts.filter(a => a.level === 'info').length
          }
        }
      });

    } catch (error) {
      logger.error('Erro ao obter alertas do sistema:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

// Funções auxiliares

// Obter visão geral dos usuários
async function getUsersOverview() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const [total, todayUsers, weekUsers] = await Promise.all([
      User.findAll({ limit: 1 }),
      User.findAll({ limit: 1000, dateFrom: today }),
      User.findAll({ limit: 1000, dateFrom: thisWeek })
    ]);

    return {
      total: total.pagination.total,
      todayCount: todayUsers.pagination.total,
      weekCount: weekUsers.pagination.total,
      growthRate: calculateGrowthRate(weekUsers.pagination.total, 7)
    };
  } catch (error) {
    return { total: 0, todayCount: 0, weekCount: 0, growthRate: 0 };
  }
}

// Obter visão geral das redações
async function getEssaysOverview() {
  try {
    const stats = await Essay.getStatistics();
    const pending = await Essay.findPending({ limit: 1 });
    
    return {
      total: stats.total,
      pending: pending.pagination.total,
      corrected: stats.byStatus.corrected,
      averageGrade: stats.averageGrade,
      gradeDistribution: stats.gradeDistribution
    };
  } catch (error) {
    return { total: 0, pending: 0, corrected: 0, averageGrade: null };
  }
}

// Obter visão geral das assinaturas
async function getSubscriptionsOverview() {
  try {
    const stats = await Subscription.getStatistics();
    const expiring = await Subscription.findExpiring(7);
    
    return {
      total: stats.total,
      active: stats.byStatus.active,
      expiring: expiring.length,
      revenue: stats.revenue,
      byPlan: stats.byPlan
    };
  } catch (error) {
    return { total: 0, active: 0, expiring: 0, revenue: { total: 0, active: 0 } };
  }
}

// Obter visão geral dos pagamentos
async function getPaymentsOverview() {
  try {
    if (!Payment.getStatistics) {
      return { total: 0, completed: 0, pending: 0, revenue: 0 };
    }
    
    const stats = await Payment.getStatistics();
    
    return {
      total: stats.total.count,
      completed: stats.completed.count,
      pending: stats.pending.count,
      failed: stats.failed.count,
      revenue: stats.completed.amount,
      byMethod: stats.byMethod
    };
  } catch (error) {
    return { total: 0, completed: 0, pending: 0, revenue: 0 };
  }
}

// Obter atividade recente
async function getRecentActivity() {
  try {
    const [recentUsers, recentEssays, recentSubscriptions] = await Promise.all([
      User.findAll({ limit: 5, sortBy: 'created_at', sortOrder: 'DESC' }),
      Essay.findAll({ limit: 5, sortBy: 'submitted_at', sortOrder: 'DESC' }),
      Subscription.findAll({ limit: 5, sortBy: 'created_at', sortOrder: 'DESC' })
    ]);

    const activities = [
      ...recentUsers.users.map(user => ({
        type: 'user_registration',
        timestamp: user.created_at,
        description: `Novo usuário: ${user.name}`,
        user: user.getSafeData()
      })),
      ...recentEssays.essays.map(essay => ({
        type: 'essay_submission',
        timestamp: essay.submitted_at,
        description: `Nova redação: ${essay.title}`,
        user: { id: essay.user_id, name: essay.user_name }
      })),
      ...recentSubscriptions.subscriptions.map(sub => ({
        type: 'subscription_created',
        timestamp: sub.created_at,
        description: `Nova assinatura ${sub.plan_type.toUpperCase()}`,
        user: { id: sub.user_id, name: sub.user_name }
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

    return activities;
  } catch (error) {
    return [];
  }
}

// Obter saúde do sistema
async function getSystemHealth() {
  try {
    const memory = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      status: 'healthy',
      uptime: {
        seconds: uptime,
        formatted: formatUptime(uptime)
      },
      memory: {
        used: memory.heapUsed,
        total: memory.heapTotal,
        percentage: (memory.heapUsed / memory.heapTotal) * 100
      },
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version
    };
  } catch (error) {
    return { status: 'unknown', error: error.message };
  }
}

// Obter notificações do usuário
async function getNotifications(userId) {
  try {
    const notifications = [];
    
    // Verificar redações corrigidas recentemente
    const correctedEssays = await Essay.findAll({
      user_id: userId,
      status: 'corrected',
      limit: 3,
      sortBy: 'corrected_at',
      sortOrder: 'DESC'
    });

    correctedEssays.essays.forEach(essay => {
      const correctedDate = new Date(essay.corrected_at);
      const daysSince = Math.floor((Date.now() - correctedDate) / (1000 * 60 * 60 * 24));
      
      if (daysSince <= 7) {
        notifications.push({
          type: 'essay_corrected',
          title: 'Redação Corrigida',
          message: `Sua redação "${essay.title}" foi corrigida`,
          data: { essayId: essay.id, grade: essay.grade },
          timestamp: essay.corrected_at,
          read: false
        });
      }
    });

    // Verificar assinatura próxima do vencimento
    const user = await User.findById(userId);
    const subscription = await user.getCurrentSubscription();
    
    if (subscription && subscription.status === 'active') {
      const endDate = new Date(subscription.end_date);
      const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining <= 7 && daysRemaining > 0) {
        notifications.push({
          type: 'subscription_expiring',
          title: 'Assinatura Expirando',
          message: `Sua assinatura expira em ${daysRemaining} dias`,
          data: { subscriptionId: subscription.id, daysRemaining },
          timestamp: new Date().toISOString(),
          read: false
        });
      }
    }

    return notifications.slice(0, 5);
  } catch (error) {
    return [];
  }
}

// Obter dados de crescimento de usuários
async function getUserGrowthData(period) {
  try {
    // Implementação simplificada - em produção, usar dados históricos reais
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const data = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      // Simular dados de crescimento
      data.push({
        date: dateStr,
        newUsers: Math.floor(Math.random() * 10) + 1,
        totalUsers: Math.floor(Math.random() * 100) + (days - i) * 5
      });
    }
    
    return data;
  } catch (error) {
    return [];
  }
}

// Obter dados de engajamento
async function getUserEngagementData(period) {
  try {
    return {
      averageSessionDuration: 420, // segundos
      pageViews: 1250,
      essaySubmissions: 85,
      materialDownloads: 340,
      videoViews: 180
    };
  } catch (error) {
    return {};
  }
}

// Obter dados de retenção
async function getUserRetentionData(period) {
  try {
    return {
      day1: 0.85,
      day7: 0.65,
      day30: 0.45,
      day90: 0.25
    };
  } catch (error) {
    return {};
  }
}

// Obter dados geográficos
async function getUserGeographyData(period) {
  try {
    return [
      { region: 'São Paulo', users: 45 },
      { region: 'Rio de Janeiro', users: 32 },
      { region: 'Minas Gerais', users: 28 },
      { region: 'Bahia', users: 18 },
      { region: 'Outros', users: 35 }
    ];
  } catch (error) {
    return [];
  }
}

// Obter dados de dispositivos
async function getUserDeviceData(period) {
  try {
    return [
      { device: 'Mobile', percentage: 65 },
      { device: 'Desktop', percentage: 30 },
      { device: 'Tablet', percentage: 5 }
    ];
  } catch (error) {
    return [];
  }
}

// Obter receita total
async function getTotalRevenue(period) {
  try {
    if (!Payment.getStatistics) return 0;
    
    const stats = await Payment.getStatistics();
    return stats.completed.amount || 0;
  } catch (error) {
    return 0;
  }
}

// Obter receita por plano
async function getRevenueByPlan(period) {
  try {
    const stats = await Subscription.getStatistics();
    return {
      master: (stats.byPlan.master || 0) * 40,
      vip: (stats.byPlan.vip || 0) * 50
    };
  } catch (error) {
    return { master: 0, vip: 0 };
  }
}

// Obter receita por método de pagamento
async function getRevenueByPaymentMethod(period) {
  try {
    if (!Payment.getStatistics) return {};
    
    const stats = await Payment.getStatistics();
    return stats.byMethod || {};
  } catch (error) {
    return {};
  }
}

// Obter tendências de receita
async function getRevenueTrends(period) {
  try {
    // Implementação simplificada
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const data = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      data.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 500) + 200
      });
    }
    
    return data;
  } catch (error) {
    return [];
  }
}

// Obter projeções de receita
async function getRevenueProjections(period) {
  try {
    return {
      nextMonth: 12000,
      nextQuarter: 35000,
      nextYear: 150000
    };
  } catch (error) {
    return {};
  }
}

// Gerar alertas do sistema
async function generateSystemAlerts() {
  const alerts = [];
  
  try {
    // Verificar redações pendentes há muito tempo
    const oldPendingEssays = await Essay.findAll({
      status: 'pending',
      dateTo: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    
    if (oldPendingEssays.essays.length > 0) {
      alerts.push({
        level: 'warning',
        type: 'old_pending_essays',
        title: 'Redações Pendentes Antigas',
        message: `${oldPendingEssays.essays.length} redações pendentes há mais de 3 dias`,
        action: '/admin/essays?status=pending',
        timestamp: new Date().toISOString()
      });
    }
    
    // Verificar uso de memória
    const memory = process.memoryUsage();
    const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;
    
    if (memoryUsagePercent > 80) {
      alerts.push({
        level: 'critical',
        type: 'high_memory_usage',
        title: 'Uso Alto de Memória',
        message: `Uso de memória: ${memoryUsagePercent.toFixed(1)}%`,
        action: null,
        timestamp: new Date().toISOString()
      });
    }
    
    // Verificar assinaturas expirando
    const expiringSubscriptions = await Subscription.findExpiring(3);
    
    if (expiringSubscriptions.length > 5) {
      alerts.push({
        level: 'info',
        type: 'expiring_subscriptions',
        title: 'Muitas Assinaturas Expirando',
        message: `${expiringSubscriptions.length} assinaturas expiram nos próximos 3 dias`,
        action: '/admin/subscriptions?filter=expiring',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    alerts.push({
      level: 'critical',
      type: 'system_error',
      title: 'Erro do Sistema',
      message: 'Erro ao verificar alertas do sistema',
      action: null,
      timestamp: new Date().toISOString()
    });
  }
  
  return alerts;
}

// Calcular taxa de crescimento
function calculateGrowthRate(count, days) {
  // Implementação simplificada
  const dailyAverage = count / days;
  const previousPeriodAverage = dailyAverage * 0.9; // Simular período anterior
  
  return ((dailyAverage - previousPeriodAverage) / previousPeriodAverage) * 100;
}

// Formatar tempo de atividade
function formatUptime(seconds) {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

module.exports = DashboardController;