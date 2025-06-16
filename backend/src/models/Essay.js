const { query, queryOne, run } = require('../config/database');
const logger = require('../utils/logger');

class Essay {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.title = data.title;
    this.content = data.content;
    this.theme = data.theme;
    this.file_path = data.file_path;
    this.status = data.status || 'pending';
    this.grade = data.grade;
    this.feedback = data.feedback;
    this.corrected_file_path = data.corrected_file_path;
    this.submitted_at = data.submitted_at;
    this.corrected_at = data.corrected_at;
    this.week_submission = data.week_submission;
    this.year_submission = data.year_submission;
  }

  // Criar nova redação
  static async create(essayData) {
    try {
      const { 
        user_id, 
        title, 
        content, 
        theme, 
        file_path, 
        week_submission, 
        year_submission 
      } = essayData;

      const result = await run(
        `INSERT INTO essays (
          user_id, title, content, theme, file_path, 
          week_submission, year_submission, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [user_id, title, content, theme, file_path, week_submission, year_submission]
      );

      const newEssay = await Essay.findById(result.lastID);
      logger.info(`Redação criada: ID ${result.lastID}, Usuário ${user_id}`);
      
      return newEssay;
    } catch (error) {
      logger.error('Erro ao criar redação:', error);
      throw error;
    }
  }

  // Buscar redação por ID
  static async findById(id) {
    try {
      const essayData = await queryOne(
        `SELECT e.*, u.name as user_name, u.email as user_email 
         FROM essays e 
         JOIN users u ON e.user_id = u.id 
         WHERE e.id = ?`,
        [id]
      );
      return essayData ? new Essay(essayData) : null;
    } catch (error) {
      logger.error('Erro ao buscar redação por ID:', error);
      throw error;
    }
  }

  // Listar redações com filtros
  static async findAll(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        user_id, 
        status, 
        theme, 
        dateFrom, 
        dateTo,
        sortBy = 'submitted_at',
        sortOrder = 'DESC'
      } = options;
      
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      let params = [];

      if (user_id) {
        whereClause += ' AND e.user_id = ?';
        params.push(user_id);
      }

      if (status) {
        whereClause += ' AND e.status = ?';
        params.push(status);
      }

      if (theme) {
        whereClause += ' AND e.theme LIKE ?';
        params.push(`%${theme}%`);
      }

      if (dateFrom) {
        whereClause += ' AND date(e.submitted_at) >= ?';
        params.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ' AND date(e.submitted_at) <= ?';
        params.push(dateTo);
      }

      const essays = await query(
        `SELECT e.*, u.name as user_name, u.email as user_email,
                s.plan_type as user_plan
         FROM essays e 
         JOIN users u ON e.user_id = u.id
         LEFT JOIN subscriptions s ON u.subscription_id = s.id
         ${whereClause}
         ORDER BY e.${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const totalResult = await queryOne(
        `SELECT COUNT(*) as total FROM essays e ${whereClause}`,
        params
      );

      return {
        essays: essays.map(essayData => new Essay(essayData)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResult.total,
          totalPages: Math.ceil(totalResult.total / limit)
        }
      };
    } catch (error) {
      logger.error('Erro ao listar redações:', error);
      throw error;
    }
  }

  // Buscar redações por usuário
  static async findByUser(userId, options = {}) {
    try {
      return await Essay.findAll({ ...options, user_id: userId });
    } catch (error) {
      logger.error('Erro ao buscar redações por usuário:', error);
      throw error;
    }
  }

  // Buscar redações pendentes
  static async findPending(options = {}) {
    try {
      return await Essay.findAll({ ...options, status: 'pending' });
    } catch (error) {
      logger.error('Erro ao buscar redações pendentes:', error);
      throw error;
    }
  }

  // Atualizar redação
  async update(updateData) {
    try {
      const allowedFields = [
        'title', 'content', 'theme', 'status', 'grade', 
        'feedback', 'corrected_file_path'
      ];
      const updateFields = [];
      const params = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key} = ?`);
          params.push(value);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('Nenhum campo válido para atualizar');
      }

      // Se status mudou para corrected, adicionar timestamp
      if (updateData.status === 'corrected') {
        updateFields.push('corrected_at = datetime(\'now\')');
      }

      params.push(this.id);

      await run(
        `UPDATE essays SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      // Atualizar instância atual
      Object.assign(this, updateData);
      if (updateData.status === 'corrected') {
        this.corrected_at = new Date().toISOString();
      }

      logger.info(`Redação atualizada: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao atualizar redação:', error);
      throw error;
    }
  }

  // Corrigir redação
  async correct(correctionData) {
    try {
      const { grade, feedback, corrected_file_path } = correctionData;

      // Validar nota
      if (grade !== null && (grade < 0 || grade > 1000)) {
        throw new Error('Nota deve estar entre 0 e 1000');
      }

      const updateData = {
        status: 'corrected',
        grade: grade,
        feedback: feedback,
        corrected_file_path: corrected_file_path
      };

      await this.update(updateData);

      logger.info(`Redação corrigida: ID ${this.id}, Nota: ${grade}`);
      return this;
    } catch (error) {
      logger.error('Erro ao corrigir redação:', error);
      throw error;
    }
  }

  // Iniciar correção
  async startCorrection() {
    try {
      await this.update({ status: 'correcting' });
      logger.info(`Correção iniciada: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao iniciar correção:', error);
      throw error;
    }
  }

  // Retornar redação para usuário
  async returnToUser() {
    try {
      await this.update({ status: 'returned' });
      logger.info(`Redação retornada: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao retornar redação:', error);
      throw error;
    }
  }

  // Deletar redação
  async delete() {
    try {
      // Deletar arquivos associados se existirem
      if (this.file_path) {
        const { deleteFile } = require('../config/multer');
        await deleteFile(this.file_path);
      }
      
      if (this.corrected_file_path) {
        const { deleteFile } = require('../config/multer');
        await deleteFile(this.corrected_file_path);
      }

      await run('DELETE FROM essays WHERE id = ?', [this.id]);
      logger.info(`Redação deletada: ID ${this.id}`);
      return true;
    } catch (error) {
      logger.error('Erro ao deletar redação:', error);
      throw error;
    }
  }

  // Obter estatísticas de redações
  static async getStatistics(options = {}) {
    try {
      const { user_id, dateFrom, dateTo } = options;

      let whereClause = 'WHERE 1=1';
      let params = [];

      if (user_id) {
        whereClause += ' AND user_id = ?';
        params.push(user_id);
      }

      if (dateFrom) {
        whereClause += ' AND date(submitted_at) >= ?';
        params.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ' AND date(submitted_at) <= ?';
        params.push(dateTo);
      }

      const [total, pending, correcting, corrected, returned] = await Promise.all([
        queryOne(`SELECT COUNT(*) as count FROM essays ${whereClause}`, params),
        queryOne(`SELECT COUNT(*) as count FROM essays ${whereClause} AND status = 'pending'`, params),
        queryOne(`SELECT COUNT(*) as count FROM essays ${whereClause} AND status = 'correcting'`, params),
        queryOne(`SELECT COUNT(*) as count FROM essays ${whereClause} AND status = 'corrected'`, params),
        queryOne(`SELECT COUNT(*) as count FROM essays ${whereClause} AND status = 'returned'`, params)
      ]);

      const averageGrade = await queryOne(
        `SELECT AVG(grade) as average FROM essays ${whereClause} AND grade IS NOT NULL`,
        params
      );

      const gradeDistribution = await query(
        `SELECT 
          CASE 
            WHEN grade >= 800 THEN 'Excelente (800-1000)'
            WHEN grade >= 600 THEN 'Bom (600-799)'
            WHEN grade >= 400 THEN 'Regular (400-599)'
            WHEN grade >= 200 THEN 'Insuficiente (200-399)'
            ELSE 'Muito Insuficiente (0-199)'
          END as grade_range,
          COUNT(*) as count
         FROM essays ${whereClause} AND grade IS NOT NULL
         GROUP BY grade_range`,
        params
      );

      return {
        total: total.count,
        byStatus: {
          pending: pending.count,
          correcting: correcting.count,
          corrected: corrected.count,
          returned: returned.count
        },
        averageGrade: averageGrade.average ? parseFloat(averageGrade.average).toFixed(2) : null,
        gradeDistribution
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas de redações:', error);
      throw error;
    }
  }

  // Obter redações por período
  static async getByPeriod(period = 'week', options = {}) {
    try {
      const { user_id } = options;
      
      let dateClause;
      switch (period) {
        case 'day':
          dateClause = "date(submitted_at) = date('now')";
          break;
        case 'week':
          dateClause = "date(submitted_at) >= date('now', '-7 days')";
          break;
        case 'month':
          dateClause = "date(submitted_at) >= date('now', '-30 days')";
          break;
        case 'year':
          dateClause = "date(submitted_at) >= date('now', '-1 year')";
          break;
        default:
          dateClause = "1=1";
      }

      let whereClause = `WHERE ${dateClause}`;
      let params = [];

      if (user_id) {
        whereClause += ' AND user_id = ?';
        params.push(user_id);
      }

      const essays = await query(
        `SELECT e.*, u.name as user_name, u.email as user_email
         FROM essays e 
         JOIN users u ON e.user_id = u.id 
         ${whereClause}
         ORDER BY e.submitted_at DESC`,
        params
      );

      return essays.map(essayData => new Essay(essayData));
    } catch (error) {
      logger.error('Erro ao buscar redações por período:', error);
      throw error;
    }
  }

  // Verificar se arquivo existe
  async hasFile() {
    const fs = require('fs').promises;
    try {
      if (!this.file_path) return false;
      await fs.access(this.file_path);
      return true;
    } catch {
      return false;
    }
  }

  // Verificar se arquivo corrigido existe
  async hasCorrectedFile() {
    const fs = require('fs').promises;
    try {
      if (!this.corrected_file_path) return false;
      await fs.access(this.corrected_file_path);
      return true;
    } catch {
      return false;
    }
  }

  // Obter informações do arquivo
  async getFileInfo() {
    try {
      if (!this.file_path) return null;
      
      const { getFileInfo } = require('../config/multer');
      return await getFileInfo(this.file_path);
    } catch (error) {
      logger.error('Erro ao obter informações do arquivo:', error);
      return null;
    }
  }

  // Converter para JSON
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      title: this.title,
      content: this.content,
      theme: this.theme,
      file_path: this.file_path,
      status: this.status,
      grade: this.grade,
      feedback: this.feedback,
      corrected_file_path: this.corrected_file_path,
      submitted_at: this.submitted_at,
      corrected_at: this.corrected_at,
      week_submission: this.week_submission,
      year_submission: this.year_submission,
      user_name: this.user_name,
      user_email: this.user_email,
      user_plan: this.user_plan
    };
  }
}

module.exports = Essay;