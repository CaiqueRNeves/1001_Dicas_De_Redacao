const { run } = require('../config/database');
const logger = require('../utils/logger');

const up = async () => {
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('master', 'vip')),
        price DECIMAL(10,2) NOT NULL,
        quantity INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Criar índices para performance
    await run('CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_cart_items_expires_at ON cart_items(expires_at)');
    await run('CREATE INDEX IF NOT EXISTS idx_cart_items_created_at ON cart_items(created_at)');
    await run('CREATE INDEX IF NOT EXISTS idx_cart_items_plan_type ON cart_items(plan_type)');

    logger.info('Migration 009_create_cart_items executed successfully');
  } catch (error) {
    logger.error('Error in migration 009_create_cart_items:', error);
    throw error;
  }
};

const down = async () => {
  try {
    await run('DROP INDEX IF EXISTS idx_cart_items_plan_type');
    await run('DROP INDEX IF EXISTS idx_cart_items_created_at');
    await run('DROP INDEX IF EXISTS idx_cart_items_expires_at');
    await run('DROP INDEX IF EXISTS idx_cart_items_user_id');
    await run('DROP TABLE IF EXISTS cart_items');
    
    logger.info('Migration 009_create_cart_items rolled back successfully');
  } catch (error) {
    logger.error('Error rolling back migration 009_create_cart_items:', error);
    throw error;
  }
};

module.exports = { up, down };