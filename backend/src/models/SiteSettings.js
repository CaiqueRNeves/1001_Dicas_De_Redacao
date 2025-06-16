const { query, queryOne, run } = require('../config/database');
const logger = require('../utils/logger');

class SiteSettings {
  constructor(data) {
    this.id = data.id;
    this.setting_key = data.setting_key;
    this.setting_value = data.setting_value;
    this.setting_type = data.setting_type || 'string';
    this.description = data.description;
    this.category = data.category || 'general';
    this.is_public = data.is_public || false;
    this.updated_by = data.updated_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Buscar configuração por chave
  static async findByKey(key) {
    try {
      const settingData = await queryOne(
        `SELECT s.*, u.name as updated_by_name
         FROM site_settings s
         LEFT JOIN users u ON s.updated_by = u.id
         WHERE s.setting_key = ?`,
        [key]
      );
      return settingData ? new SiteSettings(settingData) : null;
    } catch (error) {
      logger.error('Erro ao buscar configuração por chave:', error);
      throw error;
    }
  }

  // Buscar configuração por ID
  static async findById(id) {
    try {
      const settingData = await queryOne(
        `SELECT s.*, u.name as updated_by_name
         FROM site_settings s
         LEFT JOIN users u ON s.updated_by = u.id
         WHERE s.id = ?`,
        [id]
      );
      return settingData ? new SiteSettings(settingData) : null;
    } catch (error) {
      logger.error('Erro ao buscar configuração por ID:', error);
      throw error;
    }
  }

  // Buscar todas as configurações
  static async findAll(options = {}) {
    try {
      const { category, is_public, search } = options;

      let whereClause = 'WHERE 1=1';
      let params = [];

      if (category) {
        whereClause += ' AND s.category = ?';
        params.push(category);
      }

      if (is_public !== undefined) {
        whereClause += ' AND s.is_public = ?';
        params.push(is_public);
      }

      if (search) {
        whereClause += ' AND (s.setting_key LIKE ? OR s.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      const settings = await query(
        `SELECT s.*, u.name as updated_by_name
         FROM site_settings s
         LEFT JOIN users u ON s.updated_by = u.id
         ${whereClause}
         ORDER BY s.category, s.setting_key`,
        params
      );

      return settings.map(data => new SiteSettings(data));
    } catch (error) {
      logger.error('Erro ao buscar configurações:', error);
      throw error;
    }
  }

  // Buscar configurações públicas
  static async findPublic() {
    try {
      return await SiteSettings.findAll({ is_public: true });
    } catch (error) {
      logger.error('Erro ao buscar configurações públicas:', error);
      throw error;
    }
  }

  // Buscar configurações por categoria
  static async findByCategory(category) {
    try {
      return await SiteSettings.findAll({ category });
    } catch (error) {
      logger.error('Erro ao buscar configurações por categoria:', error);
      throw error;
    }
  }

  // Criar ou atualizar configuração
  static async set(key, value, options = {}) {
    try {
      const {
        type = 'string',
        description = '',
        category = 'general',
        is_public = false,
        updated_by = null
      } = options;

      const existingSetting = await SiteSettings.findByKey(key);

      if (existingSetting) {
        // Atualizar existente
        await existingSetting.update({
          setting_value: value,
          setting_type: type,
          description,
          category,
          is_public,
          updated_by
        });
        return existingSetting;
      } else {
        // Criar nova
        const result = await run(
          `INSERT INTO site_settings (
            setting_key, setting_value, setting_type, description,
            category, is_public, updated_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [key, value, type, description, category, is_public, updated_by]
        );

        return await SiteSettings.findById(result.lastID);
      }
    } catch (error) {
      logger.error('Erro ao definir configuração:', error);
      throw error;
    }
  }

  // Obter valor da configuração com tipo correto
  static async get(key, defaultValue = null) {
    try {
      const setting = await SiteSettings.findByKey(key);
      
      if (!setting) {
        return defaultValue;
      }

      return setting.getParsedValue();
    } catch (error) {
      logger.error('Erro ao obter configuração:', error);
      return defaultValue;
    }
  }

  // Atualizar configuração
  async update(updateData) {
    try {
      const allowedFields = [
        'setting_value', 'setting_type', 'description',
        'category', 'is_public', 'updated_by'
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

      updateFields.push('updated_at = datetime(\'now\')');
      params.push(this.id);

      await run(
        `UPDATE site_settings SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      Object.assign(this, updateData);
      this.updated_at = new Date().toISOString();

      logger.info(`Configuração atualizada: ${this.setting_key} = ${this.setting_value}`);
      return this;
    } catch (error) {
      logger.error('Erro ao atualizar configuração:', error);
      throw error;
    }
  }

  // Deletar configuração
  async delete() {
    try {
      await run('DELETE FROM site_settings WHERE id = ?', [this.id]);
      logger.info(`Configuração deletada: ${this.setting_key}`);
      return true;
    } catch (error) {
      logger.error('Erro ao deletar configuração:', error);
      throw error;
    }
  }

  // Obter valor parseado baseado no tipo
  getParsedValue() {
    try {
      switch (this.setting_type) {
        case 'number':
          return parseFloat(this.setting_value);
        case 'boolean':
          return this.setting_value === 'true' || this.setting_value === '1';
        case 'json':
          return JSON.parse(this.setting_value);
        case 'string':
        default:
          return this.setting_value;
      }
    } catch (error) {
      logger.warn(`Erro ao parsear valor da configuração ${this.setting_key}:`, error);
      return this.setting_value;
    }
  }

  // Validar valor baseado no tipo
  static validateValue(value, type) {
    try {
      switch (type) {
        case 'number':
          const num = parseFloat(value);
          return !isNaN(num);
        case 'boolean':
          return ['true', 'false', '1', '0', true, false].includes(value);
        case 'json':
          JSON.parse(value);
          return true;
        case 'string':
        default:
          return typeof value === 'string' || value != null;
      }
    } catch {
      return false;
    }
  }

  // Obter configurações como objeto
  static async getAsObject(category = null, publicOnly = false) {
    try {
      const options = {};
      if (category) options.category = category;
      if (publicOnly) options.is_public = true;

      const settings = await SiteSettings.findAll(options);
      
      const result = {};
      settings.forEach(setting => {
        result[setting.setting_key] = setting.getParsedValue();
      });

      return result;
    } catch (error) {
      logger.error('Erro ao obter configurações como objeto:', error);
      throw error;
    }
  }

  // Backup das configurações
  static async backup() {
    try {
      const settings = await SiteSettings.findAll();
      const backup = {
        timestamp: new Date().toISOString(),
        settings: settings.map(setting => ({
          key: setting.setting_key,
          value: setting.setting_value,
          type: setting.setting_type,
          description: setting.description,
          category: setting.category,
          is_public: setting.is_public
        }))
      };

      logger.info('Backup das configurações criado');
      return backup;
    } catch (error) {
      logger.error('Erro ao criar backup das configurações:', error);
      throw error;
    }
  }

  // Restaurar configurações do backup
  static async restore(backupData, userId) {
    try {
      for (const setting of backupData.settings) {
        await SiteSettings.set(
          setting.key,
          setting.value,
          {
            type: setting.type,
            description: setting.description,
            category: setting.category,
            is_public: setting.is_public,
            updated_by: userId
          }
        );
      }

      logger.info(`${backupData.settings.length} configurações restauradas do backup`);
      return true;
    } catch (error) {
      logger.error('Erro ao restaurar backup das configurações:', error);
      throw error;
    }
  }

  // Resetar configurações para padrão
  static async resetToDefaults(userId) {
    try {
      const defaultSettings = [
        {
          key: 'site_name',
          value: '1001 Dicas de Redação',
          type: 'string',
          description: 'Nome do site',
          category: 'general',
          is_public: true
        },
        {
          key: 'primary_color',
          value: '#a8e6a3',
          type: 'string',
          description: 'Cor primária do site',
          category: 'appearance',
          is_public: true
        },
        {
          key: 'secondary_color',
          value: '#ffb84d',
          type: 'string',
          description: 'Cor secundária do site',
          category: 'appearance',
          is_public: true
        },
        {
          key: 'master_plan_price',
          value: '40.00',
          type: 'number',
          description: 'Preço do plano Master',
          category: 'pricing',
          is_public: true
        },
        {
          key: 'vip_plan_price',
          value: '50.00',
          type: 'number',
          description: 'Preço do plano VIP',
          category: 'pricing',
          is_public: true
        }
      ];

      for (const setting of defaultSettings) {
        await SiteSettings.set(setting.key, setting.value, {
          type: setting.type,
          description: setting.description,
          category: setting.category,
          is_public: setting.is_public,
          updated_by: userId
        });
      }

      logger.info('Configurações resetadas para os valores padrão');
      return true;
    } catch (error) {
      logger.error('Erro ao resetar configurações:', error);
      throw error;
    }
  }

  // Obter categorias disponíveis
  static async getCategories() {
    try {
      const categories = await query(
        'SELECT DISTINCT category FROM site_settings ORDER BY category'
      );
      return categories.map(row => row.category);
    } catch (error) {
      logger.error('Erro ao obter categorias:', error);
      throw error;
    }
  }

  // Validar todas as configurações
  static async validateAll() {
    try {
      const settings = await SiteSettings.findAll();
      const errors = [];

      for (const setting of settings) {
        if (!SiteSettings.validateValue(setting.setting_value, setting.setting_type)) {
          errors.push({
            key: setting.setting_key,
            value: setting.setting_value,
            type: setting.setting_type,
            error: 'Valor inválido para o tipo especificado'
          });
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      logger.error('Erro ao validar configurações:', error);
      throw error;
    }
  }

  // Converter para JSON
  toJSON() {
    return {
      id: this.id,
      setting_key: this.setting_key,
      setting_value: this.setting_value,
      parsed_value: this.getParsedValue(),
      setting_type: this.setting_type,
      description: this.description,
      category: this.category,
      is_public: this.is_public,
      updated_by: this.updated_by,
      updated_by_name: this.updated_by_name,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = SiteSettings;