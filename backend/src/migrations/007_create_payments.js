const { run } = require('../config/database');
const logger = require('../utils/logger');

const up = async () => {
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subscription_id INTEGER,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'boleto')),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
        transaction_id VARCHAR(100),
        gateway_response TEXT,
        gateway VARCHAR(50),
        paid_at DATETIME,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
      )
    `);

    // Criar índices para performance
    await run('CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)');
    await run('CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method)');
    await run('CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at)');
    await run('CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at)');
    await run('CREATE INDEX IF NOT EXISTS idx_payments_expires_at ON payments(expires_at)');

    logger.info('Migration 007_create_payments executed successfully');
  } catch (error) {
    logger.error('Error in migration 007_create_payments:', error);
    throw error;
  }
};

const down = async () => {
  try {
    await run('DROP INDEX IF EXISTS idx_payments_expires_at');
    await run('DROP INDEX IF EXISTS idx_payments_paid_at');
    await run('DROP INDEX IF EXISTS idx_payments_created_at');
    await run('DROP INDEX IF EXISTS idx_payments_transaction_id');
    await run('DROP INDEX IF EXISTS idx_payments_payment_method');
    await run('DROP INDEX IF EXISTS idx_payments_status');
    await run('DROP INDEX IF EXISTS idx_payments_subscription_id');
    await run('DROP INDEX IF EXISTS idx_payments_user_id');
    await run('DROP TABLE IF EXISTS payments');
    
    logger.info('Migration 007_create_payments rolled back successfully');
  } catch (error) {
    logger.error('Error rolling back migration 007_create_payments:', error);
    throw error;
  }
};

module.exports = { up, down };