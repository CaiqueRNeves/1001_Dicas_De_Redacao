const { run } = require('../config/database');
const logger = require('../utils/logger');

const up = async () => {
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        phone VARCHAR(20),
        birth_date DATE,
        subscription_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        lgpd_consent BOOLEAN DEFAULT FALSE,
        email_verified BOOLEAN DEFAULT FALSE,
        last_login DATETIME,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
      )
    `);

    // Criar índices para performance
    await run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    await run('CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)');

    logger.info('Migration 001_create_users executed successfully');
  } catch (error) {
    logger.error('Error in migration 001_create_users:', error);
    throw error;
  }
};

const down = async () => {
  try {
    await run('DROP INDEX IF EXISTS idx_users_created_at');
    await run('DROP INDEX IF EXISTS idx_users_subscription');
    await run('DROP INDEX IF EXISTS idx_users_role');
    await run('DROP INDEX IF EXISTS idx_users_email');
    await run('DROP TABLE IF EXISTS users');
    
    logger.info('Migration 001_create_users rolled back successfully');
  } catch (error) {
    logger.error('Error rolling back migration 001_create_users:', error);
    throw error;
  }
};

module.exports = { up, down };