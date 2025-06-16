const { run } = require('../config/database');
const logger = require('../utils/logger');

const up = async () => {
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        category VARCHAR(100),
        is_free BOOLEAN DEFAULT TRUE,
        download_count INTEGER DEFAULT 0,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Criar índices para performance
    await run('CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category)');
    await run('CREATE INDEX IF NOT EXISTS idx_materials_is_free ON materials(is_free)');
    await run('CREATE INDEX IF NOT EXISTS idx_materials_created_by ON materials(created_by)');
    await run('CREATE INDEX IF NOT EXISTS idx_materials_created_at ON materials(created_at)');
    await run('CREATE INDEX IF NOT EXISTS idx_materials_download_count ON materials(download_count)');
    await run('CREATE INDEX IF NOT EXISTS idx_materials_title ON materials(title)');

    logger.info('Migration 004_create_materials executed successfully');
  } catch (error) {
    logger.error('Error in migration 004_create_materials:', error);
    throw error;
  }
};

const down = async () => {
  try {
    await run('DROP INDEX IF EXISTS idx_materials_title');
    await run('DROP INDEX IF EXISTS idx_materials_download_count');
    await run('DROP INDEX IF EXISTS idx_materials_created_at');
    await run('DROP INDEX IF EXISTS idx_materials_created_by');
    await run('DROP INDEX IF EXISTS idx_materials_is_free');
    await run('DROP INDEX IF EXISTS idx_materials_category');
    await run('DROP TABLE IF EXISTS materials');
    
    logger.info('Migration 004_create_materials rolled back successfully');
  } catch (error) {
    logger.error('Error rolling back migration 004_create_materials:', error);
    throw error;
  }
};

module.exports = { up, down };