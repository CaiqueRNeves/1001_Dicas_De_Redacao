const User = require('../models/User');
const logger = require('../utils/logger');

class UserController {
  // Listar usuários (apenas admin)
  static async getUsers(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        role, 
        search,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        role,
        search,
        sortBy,
        sortOrder
      };

      const result = await User.findAll(options);

      res.json({
        success: true,
        data: result.users.map(user => user.getSafeData()),
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro ao listar usuários:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter usuário por ID
  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Verificar permissões (usuário só pode ver próprios dados, admin vê todos)
      if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      // Obter dados adicionais
      const [subscription, stats] = await Promise.all([
        user.getCurrentSubscription(),
        user.getStats()
      ]);

      res.json({
        success: true,
        data: {
          user: user.getSafeData(),
          subscription,
          stats
        }
      });

    } catch (error) {
      logger.error('Erro ao obter usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar usuário
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, email, phone, birth_date } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Verificar permissões
      if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      const updateData = {};
      if (name) updateData.name = name.trim();
      if (email) updateData.email = email.toLowerCase().trim();
      if (phone) updateData.phone = phone.trim();
      if (birth_date) updateData.birth_date = birth_date;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum campo para atualizar'
        });
      }

      await user.update(updateData);

      logger.info(`Usuário atualizado: ${user.email} por ${req.user.email}`);

      res.json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: {
          user: user.getSafeData()
        }
      });

    } catch (error) {
      logger.error('Erro ao atualizar usuário:', error);
      
      if (error.message === 'Email já está em uso') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Deletar usuário (apenas admin)
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      if (req.user.id === parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: 'Você não pode deletar sua própria conta'
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Verificar se tem assinatura ativa
      const hasActiveSubscription = await user.hasActiveSubscription();
      if (hasActiveSubscription) {
        return res.status(400).json({
          success: false,
          message: 'Não é possível deletar usuário com assinatura ativa'
        });
      }

      await user.delete();

      logger.info(`Usuário deletado: ${user.email} por ${req.user.email}`);

      res.json({
        success: true,
        message: 'Usuário deletado com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao deletar usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter estatísticas do usuário atual
  static async getUserStats(req, res) {
    try {
      const stats = await req.user.getStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Erro ao obter estatísticas do usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Verificar se pode enviar redação
  static async checkEssayPermission(req, res) {
    try {
      const canSubmit = await req.user.canSubmitEssay();

      res.json({
        success: true,
        data: canSubmit
      });

    } catch (error) {
      logger.error('Erro ao verificar permissão de redação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter assinatura atual do usuário
  static async getCurrentSubscription(req, res) {
    try {
      const subscription = await req.user.getCurrentSubscription();

      if (!subscription) {
        return res.json({
          success: true,
          data: null,
          message: 'Nenhuma assinatura ativa encontrada'
        });
      }

      res.json({
        success: true,
        data: subscription
      });

    } catch (error) {
      logger.error('Erro ao obter assinatura atual:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar role do usuário (apenas admin)
  static async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Role inválida'
        });
      }

      if (req.user.id === parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: 'Você não pode alterar sua própria role'
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      await user.update({ role });

      logger.info(`Role do usuário alterada: ${user.email} -> ${role} por ${req.user.email}`);

      res.json({
        success: true,
        message: 'Role do usuário atualizada com sucesso',
        data: {
          user: user.getSafeData()
        }
      });

    } catch (error) {
      logger.error('Erro ao atualizar role do usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Verificar email do usuário
  static async verifyUserEmail(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      await user.update({ email_verified: true });

      logger.info(`Email verificado: ${user.email} por ${req.user.email}`);

      res.json({
        success: true,
        message: 'Email verificado com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao verificar email:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Suspender usuário (apenas admin)
  static async suspendUser(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (req.user.id === parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: 'Você não pode suspender sua própria conta'
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Por simplicidade, vamos usar um campo na tabela users para indicar suspensão
      // Em uma implementação mais robusta, seria uma tabela separada
      await user.update({ 
        email_verified: false // Usado como flag de suspensão temporária
      });

      logger.warn(`Usuário suspenso: ${user.email} por ${req.user.email}, Motivo: ${reason}`);

      res.json({
        success: true,
        message: 'Usuário suspenso com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao suspender usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Buscar usuários por termo
  static async searchUsers(req, res) {
    try {
      const { term } = req.query;

      if (!term || term.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Termo de busca deve ter pelo menos 2 caracteres'
        });
      }

      const result = await User.findAll({
        search: term,
        limit: 20
      });

      res.json({
        success: true,
        data: result.users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        }))
      });

    } catch (error) {
      logger.error('Erro ao buscar usuários:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter dashboard do usuário
  static async getUserDashboard(req, res) {
    try {
      const [stats, subscription, weeklyCount] = await Promise.all([
        req.user.getStats(),
        req.user.getCurrentSubscription(),
        req.user.getWeeklyEssayCount()
      ]);

      const canSubmit = await req.user.canSubmitEssay();

      res.json({
        success: true,
        data: {
          user: req.user.getSafeData(),
          stats,
          subscription,
          weekly_essay_count: weeklyCount,
          can_submit_essay: canSubmit
        }
      });

    } catch (error) {
      logger.error('Erro ao obter dashboard do usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Exportar dados do usuário (LGPD)
  static async exportUserData(req, res) {
    try {
      // Esta funcionalidade é implementada no middleware LGPD
      // Aqui apenas redirecionamos
      res.redirect('/api/users/export-data');
    } catch (error) {
      logger.error('Erro ao exportar dados:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter todos os dados do usuário (LGPD)
  static async getMyData(req, res) {
    try {
      // Esta funcionalidade é implementada no middleware LGPD
      // Aqui apenas redirecionamos
      res.redirect('/api/users/my-data');
    } catch (error) {
      logger.error('Erro ao obter dados:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Deletar próprios dados (LGPD)
  static async deleteMyData(req, res) {
    try {
      // Esta funcionalidade é implementada no middleware LGPD
      // Aqui apenas redirecionamos
      res.redirect('/api/users/delete-my-data');
    } catch (error) {
      logger.error('Erro ao deletar dados:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = UserController;