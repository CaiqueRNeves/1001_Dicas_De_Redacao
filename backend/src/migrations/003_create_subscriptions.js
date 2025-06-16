const { run } = require('../config/database');
const logger = require('../utils/logger');

const up = async () => {
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('master', 'vip')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'expired')),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50),
        auto_renewal BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Criar índices para performance
    await run('CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)');
    await run('CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON subscriptions(plan_type)');
    await run('CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date)');
    await run('CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions(created_at)');

    logger.info('Migration 003_create_subscriptions executed successfully');
  } catch (error) {
    logger.error('Error in migration 003_create_subscriptions:', error);
    throw error;
  }
};

const down = async () => {
  try {
    await run('DROP INDEX IF EXISTS idx_subscriptions_created_at');
    await run('DROP INDEX IF EXISTS idx_subscriptions_end_date');
    await run('DROP INDEX IF EXISTS idx_subscriptions_plan_type');
    await run('DROP INDEX IF EXISTS idx_subscriptions_status');
    await run('DROP INDEX IF EXISTS idx_subscriptions_user_id');
    await run('DROP TABLE IF EXISTS subscriptions');
    
    logger.info('Migration 003_create_subscriptions rolled back successfully');
  } catch (error) {
    logger.error('Error rolling back migration 003_create_subscriptions:', error);
    throw error;
  }
};

module.exports = { up, down };