const Essay = require('../models/Essay');
const User = require('../models/User');
const { essayUpload } = require('../config/multer');
const logger = require('../utils/logger');
const path = require('path');

class EssayController {
  // Criar nova redação
  static async createEssay(req, res) {
    try {
      const { title, content, theme } = req.body;
      const file = req.file;

      // Verificar se usuário pode enviar redação
      const canSubmit = await req.user.canSubmitEssay();
      if (!canSubmit.canSubmit) {
        return res.status(403).json({
          success: false,
          message: canSubmit.reason,
          current: canSubmit.current,
          max: canSubmit.max
        });
      }

      // Obter semana atual
      const currentWeek = getCurrentWeek();

      const essayData = {
        user_id: req.user.id,
        title: title.trim(),
        content: content?.trim(),
        theme: theme.trim(),
        file_path: file?.path,
        week_submission: currentWeek.week,
        year_submission: currentWeek.year
      };

      const essay = await Essay.create(essayData);

      // Log do upload se houver arquivo
      if (file) {
        logger.fileUpload(req.user.id, file.filename, file.size, 'essay');
      }

      logger.info(`Redação criada: ID ${essay.id}, Usuário: ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Redação enviada com sucesso',
        data: essay.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao criar redação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Listar redações
  static async getEssays(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        theme, 
        dateFrom, 
        dateTo,
        sortBy = 'submitted_at',
        sortOrder = 'DESC'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        theme,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder
      };

      // Se não for admin, mostrar apenas suas redações
      if (req.user.role !== 'admin') {
        options.user_id = req.user.id;
      }

      const result = await Essay.findAll(options);

      res.json({
        success: true,
        data: result.essays.map(essay => essay.toJSON()),
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro ao listar redações:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter redação por ID
  static async getEssayById(req, res) {
    try {
      const { id } = req.params;
      const essay = await Essay.findById(id);

      if (!essay) {
        return res.status(404).json({
          success: false,
          message: 'Redação não encontrada'
        });
      }

      // Verificar permissões
      if (req.user.role !== 'admin' && essay.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      res.json({
        success: true,
        data: essay.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao obter redação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar redação
  static async updateEssay(req, res) {
    try {
      const { id } = req.params;
      const { title, content, theme } = req.body;

      const essay = await Essay.findById(id);
      if (!essay) {
        return res.status(404).json({
          success: false,
          message: 'Redação não encontrada'
        });
      }

      // Verificar permissões
      if (req.user.role !== 'admin' && essay.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      // Usuários só podem editar redações pendentes
      if (req.user.role !== 'admin' && essay.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Redação não pode ser editada após iniciar correção'
        });
      }

      const updateData = {};
      if (title) updateData.title = title.trim();
      if (content) updateData.content = content.trim();
      if (theme) updateData.theme = theme.trim();

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum campo para atualizar'
        });
      }

      await essay.update(updateData);

      logger.info(`Redação atualizada: ID ${essay.id}`);

      res.json({
        success: true,
        message: 'Redação atualizada com sucesso',
        data: essay.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao atualizar redação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Deletar redação
  static async deleteEssay(req, res) {
    try {
      const { id } = req.params;

      const essay = await Essay.findById(id);
      if (!essay) {
        return res.status(404).json({
          success: false,
          message: 'Redação não encontrada'
        });
      }

      // Verificar permissões
      if (req.user.role !== 'admin' && essay.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      // Usuários só podem deletar redações pendentes
      if (req.user.role !== 'admin' && essay.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Redação não pode ser deletada após iniciar correção'
        });
      }

      await essay.delete();

      logger.info(`Redação deletada: ID ${essay.id}`);

      res.json({
        success: true,
        message: 'Redação deletada com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao deletar redação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Download do arquivo da redação
  static async downloadEssayFile(req, res) {
    try {
      const { id } = req.params;

      const essay = await Essay.findById(id);
      if (!essay) {
        return res.status(404).json({
          success: false,
          message: 'Redação não encontrada'
        });
      }

      // Verificar permissões
      if (req.user.role !== 'admin' && essay.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      if (!essay.file_path) {
        return res.status(404).json({
          success: false,
          message: 'Arquivo não encontrado'
        });
      }

      const fs = require('fs');
      if (!fs.existsSync(essay.file_path)) {
        return res.status(404).json({
          success: false,
          message: 'Arquivo não existe no servidor'
        });
      }

      const fileName = path.basename(essay.file_path);
      res.download(essay.file_path, `redacao_${essay.id}_${fileName}`);

    } catch (error) {
      logger.error('Erro ao fazer download da redação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Download da redação corrigida
  static async downloadCorrectedEssay(req, res) {
    try {
      const { id } = req.params;

      const essay = await Essay.findById(id);
      if (!essay) {
        return res.status(404).json({
          success: false,
          message: 'Redação não encontrada'
        });
      }

      // Verificar permissões
      if (req.user.role !== 'admin' && essay.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      if (!essay.corrected_file_path) {
        return res.status(404).json({
          success: false,
          message: 'Redação corrigida não encontrada'
        });
      }

      const fs = require('fs');
      if (!fs.existsSync(essay.corrected_file_path)) {
        return res.status(404).json({
          success: false,
          message: 'Arquivo corrigido não existe no servidor'
        });
      }

      const fileName = path.basename(essay.corrected_file_path);
      res.download(essay.corrected_file_path, `redacao_corrigida_${essay.id}_${fileName}`);

    } catch (error) {
      logger.error('Erro ao fazer download da redação corrigida:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Iniciar correção (apenas admin)
  static async startCorrection(req, res) {
    try {
      const { id } = req.params;

      const essay = await Essay.findById(id);
      if (!essay) {
        return res.status(404).json({
          success: false,
          message: 'Redação não encontrada'
        });
      }

      if (essay.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Redação não está pendente para correção'
        });
      }

      await essay.startCorrection();

      logger.info(`Correção iniciada: Redação ID ${essay.id} por ${req.user.email}`);

      res.json({
        success: true,
        message: 'Correção iniciada com sucesso',
        data: essay.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao iniciar correção:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Corrigir redação (apenas admin)
  static async correctEssay(req, res) {
    try {
      const { id } = req.params;
      const { grade, feedback } = req.body;
      const correctedFile = req.file;

      const essay = await Essay.findById(id);
      if (!essay) {
        return res.status(404).json({
          success: false,
          message: 'Redação não encontrada'
        });
      }

      const correctionData = {
        grade: grade ? parseFloat(grade) : null,
        feedback: feedback?.trim(),
        corrected_file_path: correctedFile?.path
      };

      await essay.correct(correctionData);

      // Log da correção
      logger.essayCorrection(essay.id, essay.user_id, req.user.id, grade);

      res.json({
        success: true,
        message: 'Redação corrigida com sucesso',
        data: essay.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao corrigir redação:', error);
      
      if (error.message.includes('Nota deve estar entre')) {
        return res.status(400).json({
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

  // Retornar redação para usuário (apenas admin)
  static async returnEssay(req, res) {
    try {
      const { id } = req.params;

      const essay = await Essay.findById(id);
      if (!essay) {
        return res.status(404).json({
          success: false,
          message: 'Redação não encontrada'
        });
      }

      if (essay.status !== 'corrected') {
        return res.status(400).json({
          success: false,
          message: 'Redação deve estar corrigida para ser retornada'
        });
      }

      await essay.returnToUser();

      logger.info(`Redação retornada: ID ${essay.id} por ${req.user.email}`);

      res.json({
        success: true,
        message: 'Redação retornada ao usuário',
        data: essay.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao retornar redação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Listar redações pendentes (apenas admin)
  static async getPendingEssays(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const result = await Essay.findPending({
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.essays.map(essay => essay.toJSON()),
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro ao listar redações pendentes:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter estatísticas de redações
  static async getEssayStatistics(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;
      
      const options = {};
      if (dateFrom) options.dateFrom = dateFrom;
      if (dateTo) options.dateTo = dateTo;

      // Se não for admin, filtrar por usuário
      if (req.user.role !== 'admin') {
        options.user_id = req.user.id;
      }

      const stats = await Essay.getStatistics(options);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Erro ao obter estatísticas de redações:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Buscar redações por usuário
  static async getEssaysByUser(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10, status } = req.query;

      // Verificar permissões
      if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        user_id: parseInt(userId)
      };

      if (status) options.status = status;

      const result = await Essay.findByUser(userId, options);

      res.json({
        success: true,
        data: result.essays.map(essay => essay.toJSON()),
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro ao buscar redações por usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter redações do usuário atual
  static async getMyEssays(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        user_id: req.user.id
      };

      if (status) options.status = status;

      const result = await Essay.findAll(options);

      res.json({
        success: true,
        data: result.essays.map(essay => essay.toJSON()),
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro ao obter minhas redações:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Buscar redações por período
  static async getEssaysByPeriod(req, res) {
    try {
      const { period = 'week' } = req.query;

      const options = {};
      if (req.user.role !== 'admin') {
        options.user_id = req.user.id;
      }

      const essays = await Essay.getByPeriod(period, options);

      res.json({
        success: true,
        data: essays.map(essay => essay.toJSON()),
        period
      });

    } catch (error) {
      logger.error('Erro ao buscar redações por período:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Upload de arquivo para redação existente
  static async uploadEssayFile(req, res) {
    try {
      const { id } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'Arquivo é obrigatório'
        });
      }

      const essay = await Essay.findById(id);
      if (!essay) {
        return res.status(404).json({
          success: false,
          message: 'Redação não encontrada'
        });
      }

      // Verificar permissões
      if (req.user.role !== 'admin' && essay.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      // Usuários só podem fazer upload em redações pendentes
      if (req.user.role !== 'admin' && essay.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Arquivo não pode ser alterado após iniciar correção'
        });
      }

      // Deletar arquivo anterior se existir
      if (essay.file_path) {
        const { deleteFile } = require('../config/multer');
        await deleteFile(essay.file_path);
      }

      await essay.update({ file_path: file.path });

      logger.fileUpload(req.user.id, file.filename, file.size, 'essay_update');

      res.json({
        success: true,
        message: 'Arquivo enviado com sucesso',
        data: essay.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao fazer upload do arquivo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Upload de redação corrigida (apenas admin)
  static async uploadCorrectedFile(req, res) {
    try {
      const { id } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'Arquivo é obrigatório'
        });
      }

      const essay = await Essay.findById(id);
      if (!essay) {
        return res.status(404).json({
          success: false,
          message: 'Redação não encontrada'
        });
      }

      // Deletar arquivo corrigido anterior se existir
      if (essay.corrected_file_path) {
        const { deleteFile } = require('../config/multer');
        await deleteFile(essay.corrected_file_path);
      }

      await essay.update({ corrected_file_path: file.path });

      logger.fileUpload(req.user.id, file.filename, file.size, 'corrected_essay');

      res.json({
        success: true,
        message: 'Arquivo corrigido enviado com sucesso',
        data: essay.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao fazer upload do arquivo corrigido:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Verificar limite de redações do usuário
  static async checkSubmissionLimit(req, res) {
    try {
      const canSubmit = await req.user.canSubmitEssay();

      res.json({
        success: true,
        data: canSubmit
      });

    } catch (error) {
      logger.error('Erro ao verificar limite de redações:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Buscar redações por tema
  static async getEssaysByTheme(req, res) {
    try {
      const { theme } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        theme
      };

      // Se não for admin, filtrar por usuário
      if (req.user.role !== 'admin') {
        options.user_id = req.user.id;
      }

      const result = await Essay.findAll(options);

      res.json({
        success: true,
        data: result.essays.map(essay => essay.toJSON()),
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro ao buscar redações por tema:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

// Função auxiliar para obter semana atual
function getCurrentWeek() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  
  return {
    week,
    year: now.getFullYear()
  };
}

module.exports = EssayController;