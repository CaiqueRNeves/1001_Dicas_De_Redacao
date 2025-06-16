const { run } = require('../config/database');
const logger = require('../utils/logger');

const up = async () => {
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
        description TEXT,
        category VARCHAR(50) DEFAULT 'general',
        is_public BOOLEAN DEFAULT FALSE,
        updated_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Criar índices para performance
    await run('CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key)');
    await run('CREATE INDEX IF NOT EXISTS idx_site_settings_category ON site_settings(category)');
    await run('CREATE INDEX IF NOT EXISTS idx_site_settings_is_public ON site_settings(is_public)');
    await run('CREATE INDEX IF NOT EXISTS idx_site_settings_updated_by ON site_settings(updated_by)');

    // Inserir configurações padrão
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
        key: 'site_description',
        value: 'Plataforma de correção de redações para o ENEM',
        type: 'string',
        description: 'Descrição do site',
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
      },
      {
        key: 'master_plan_essays_limit',
        value: '2',
        type: 'number',
        description: 'Limite de redações semanais do plano Master',
        category: 'limits',
        is_public: false
      },
      {
        key: 'vip_plan_essays_limit',
        value: '4',
        type: 'number',
        description: 'Limite de redações semanais do plano VIP',
        category: 'limits',
        is_public: false
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        type: 'boolean',
        description: 'Modo de manutenção',
        category: 'system',
        is_public: false
      },
      {
        key: 'registration_enabled',
        value: 'true',
        type: 'boolean',
        description: 'Permitir novos cadastros',
        category: 'system',
        is_public: false
      },
      {
        key: 'contact_email',
        value: 'proftaynarasilva28@gmail.com',
        type: 'string',
        description: 'Email de contato',
        category: 'contact',
        is_public: true
      },
      {
        key: 'support_phone',
        value: '',
        type: 'string',
        description: 'Telefone de suporte',
        category: 'contact',
        is_public: true
      },
      {
        key: 'carousel_images',
        value: '[]',
        type: 'json',
        description: 'Imagens do carrossel',
        category: 'appearance',
        is_public: true
      },
      {
        key: 'social_media',
        value: '{"facebook":"","instagram":"","youtube":"","twitter":""}',
        type: 'json',
        description: 'Redes sociais',
        category: 'contact',
        is_public: true
      },
      {
        key: 'max_file_size',
        value: '10485760',
        type: 'number',
        description: 'Tamanho máximo de arquivo em bytes (10MB)',
        category: 'system',
        is_public: false
      }
    ];

    for (const setting of defaultSettings) {
      await run(
        `INSERT OR IGNORE INTO site_settings 
         (setting_key, setting_value, setting_type, description, category, is_public) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [setting.key, setting.value, setting.type, setting.description, setting.category, setting.is_public]
      );
    }

    logger.info('Migration 010_create_site_settings executed successfully');
  } catch (error) {
    logger.error('Error in migration 010_create_site_settings:', error);
    throw error;
  }
};

const down = async () => {
  try {
    await run('DROP INDEX IF EXISTS idx_site_settings_updated_by');
    await run('DROP INDEX IF EXISTS idx_site_settings_is_public');
    await run('DROP INDEX IF EXISTS idx_site_settings_category');
    await run('DROP INDEX IF EXISTS idx_site_settings_key');
    await run('DROP TABLE IF EXISTS site_settings');
    
    logger.info('Migration 010_create_site_settings rolled back successfully');
  } catch (error) {
    logger.error('Error rolling back migration 010_create_site_settings:', error);
    throw error;
  }
};

module.exports = { up, down };