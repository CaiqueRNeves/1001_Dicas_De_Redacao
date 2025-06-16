const bcrypt = require('bcryptjs');
const { query, queryOne, run } = require('../config/database');
const logger = require('../utils/logger');

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.role = data.role || 'user';
    this.phone = data.phone;
    this.birth_date = data.birth_date;
    this.subscription_id = data.subscription_id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.lgpd_consent = data.lgpd_consent;
    this.email_verified = data.email_verified;
    this.last_login = data.last_login;
  }

  // Criar novo usuário
  static async create(userData) {
    try {
      const { name, email, password, phone, birth_date, role = 'user', lgpd_consent = false } = userData;

      // Verificar se email já existe
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new Error('Email já está em uso');
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 12);

      const result = await run(
        `INSERT INTO users (name, email, password, phone, birth_date, role, lgpd_consent, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [name, email, hashedPassword, phone, birth_date, role, lgpd_consent]
      );

      const newUser = await User.findById(result.lastID);
      logger.info(`Usuário criado: ${email}`);
      
      return newUser;
    } catch (error) {
      logger.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  // Buscar usuário por ID
  static async findById(id) {
    try {
      const userData = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
      return userData ? new User(userData) : null;
    } catch (error) {
      logger.error('Erro ao buscar usuário por ID:', error);
      throw error;
    }
  }

  // Buscar usuário por email
  static async findByEmail(email) {
    try {
      const userData = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
      return userData ? new User(userData) : null;
    } catch (error) {
      logger.error('Erro ao buscar usuário por email:', error);
      throw error;
    }
  }

  // Listar todos os usuários (com paginação)
  static async findAll(options = {}) {
    try {
      const { page = 1, limit = 10, role, search } = options;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      let params = [];

      if (role) {
        whereClause += ' AND role = ?';
        params.push(role);
      }

      if (search) {
        whereClause += ' AND (name LIKE ? OR email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      const users = await query(
        `SELECT id, name, email, role, phone, birth_date, subscription_id, 
                created_at, updated_at, lgpd_consent, email_verified, last_login
         FROM users ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const totalResult = await queryOne(
        `SELECT COUNT(*) as total FROM users ${whereClause}`,
        params
      );

      return {
        users: users.map(userData => new User(userData)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResult.total,
          totalPages: Math.ceil(totalResult.total / limit)
        }
      };
    } catch (error) {
      logger.error('Erro ao listar usuários:', error);
      throw error;
    }
  }

  // Atualizar usuário
  async update(updateData) {
    try {
      const allowedFields = ['name', 'email', 'phone', 'birth_date', 'lgpd_consent', 'email_verified'];
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

      // Verificar se novo email já existe
      if (updateData.email && updateData.email !== this.email) {
        const existingUser = await User.findByEmail(updateData.email);
        if (existingUser) {
          throw new Error('Email já está em uso');
        }
      }

      updateFields.push('updated_at = datetime(\'now\')');
      params.push(this.id);

      await run(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      // Atualizar instância atual
      Object.assign(this, updateData);
      this.updated_at = new Date().toISOString();

      logger.info(`Usuário atualizado: ${this.email}`);
      return this;
    } catch (error) {
      logger.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  }

  // Atualizar senha
  async updatePassword(currentPassword, newPassword) {
    try {
      // Verificar senha atual
      const isValid = await bcrypt.compare(currentPassword, this.password);
      if (!isValid) {
        throw new Error('Senha atual incorreta');
      }

      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await run(
        'UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?',
        [hashedPassword, this.id]
      );

      this.password = hashedPassword;
      this.updated_at = new Date().toISOString();

      logger.info(`Senha atualizada para usuário: ${this.email}`);
      return true;
    } catch (error) {
      logger.error('Erro ao atualizar senha:', error);
      throw error;
    }
  }

  // Verificar senha
  async comparePassword(password) {
    try {
      return await bcrypt.compare(password, this.password);
    } catch (error) {
      logger.error('Erro ao verificar senha:', error);
      return false;
    }
  }

  // Deletar usuário
  async delete() {
    try {
      await run('DELETE FROM users WHERE id = ?', [this.id]);
      logger.info(`Usuário deletado: ${this.email}`);
      return true;
    } catch (error) {
      logger.error('Erro ao deletar usuário:', error);
      throw error;
    }
  }

  // Atualizar último login
  async updateLastLogin() {
    try {
      await run(
        'UPDATE users SET last_login = datetime(\'now\') WHERE id = ?',
        [this.id]
      );
      this.last_login = new Date().toISOString();
    } catch (error) {
      logger.error('Erro ao atualizar último login:', error);
    }
  }

  // Verificar se usuário tem assinatura ativa
  async hasActiveSubscription() {
    try {
      const subscription = await queryOne(
        `SELECT s.* FROM subscriptions s 
         WHERE s.user_id = ? AND s.status = 'active' 
         AND s.end_date > date('now')`,
        [this.id]
      );
      return !!subscription;
    } catch (error) {
      logger.error('Erro ao verificar assinatura:', error);
      return false;
    }
  }

  // Obter assinatura atual
  async getCurrentSubscription() {
    try {
      const subscription = await queryOne(
        `SELECT s.* FROM subscriptions s 
         WHERE s.user_id = ? AND s.status = 'active' 
         ORDER BY s.created_at DESC LIMIT 1`,
        [this.id]
      );
      return subscription;
    } catch (error) {
      logger.error('Erro ao obter assinatura atual:', error);
      return null;
    }
  }

  // Contar redações enviadas na semana atual
  async getWeeklyEssayCount() {
    try {
      const currentWeek = this.getCurrentWeek();
      const result = await queryOne(
        `SELECT COUNT(*) as count FROM essays 
         WHERE user_id = ? AND week_submission = ? AND year_submission = ?`,
        [this.id, currentWeek.week, currentWeek.year]
      );
      return result.count;
    } catch (error) {
      logger.error('Erro ao contar redações da semana:', error);
      return 0;
    }
  }

  // Verificar se pode enviar mais redações na semana
  async canSubmitEssay() {
    try {
      const subscription = await this.getCurrentSubscription();
      if (!subscription) {
        return { canSubmit: false, reason: 'Sem assinatura ativa' };
      }

      const weeklyCount = await this.getWeeklyEssayCount();
      const maxEssays = subscription.plan_type === 'vip' ? 4 : 2;

      if (weeklyCount >= maxEssays) {
        return { 
          canSubmit: false, 
          reason: `Limite de ${maxEssays} redações por semana atingido`,
          current: weeklyCount,
          max: maxEssays
        };
      }

      return { 
        canSubmit: true, 
        current: weeklyCount, 
        max: maxEssays 
      };
    } catch (error) {
      logger.error('Erro ao verificar permissão de envio:', error);
      return { canSubmit: false, reason: 'Erro interno' };
    }
  }

  // Obter estatísticas do usuário
  async getStats() {
    try {
      const totalEssays = await queryOne(
        'SELECT COUNT(*) as count FROM essays WHERE user_id = ?',
        [this.id]
      );

      const correctedEssays = await queryOne(
        'SELECT COUNT(*) as count FROM essays WHERE user_id = ? AND status = "corrected"',
        [this.id]
      );

      const averageGrade = await queryOne(
        'SELECT AVG(grade) as average FROM essays WHERE user_id = ? AND grade IS NOT NULL',
        [this.id]
      );

      const lastEssay = await queryOne(
        'SELECT submitted_at FROM essays WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1',
        [this.id]
      );

      return {
        totalEssays: totalEssays.count,
        correctedEssays: correctedEssays.count,
        pendingEssays: totalEssays.count - correctedEssays.count,
        averageGrade: averageGrade.average ? parseFloat(averageGrade.average).toFixed(2) : null,
        lastSubmission: lastEssay?.submitted_at
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas do usuário:', error);
      throw error;
    }
  }

  // Obter semana atual
  getCurrentWeek() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    
    return {
      week,
      year: now.getFullYear()
    };
  }

  // Converter para JSON (remover senha)
  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }

  // Método para obter dados seguros do usuário
  getSafeData() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      phone: this.phone,
      birth_date: this.birth_date,
      created_at: this.created_at,
      email_verified: this.email_verified,
      last_login: this.last_login
    };
  }
}

module.exports = User;