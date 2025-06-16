const { run } = require('../config/database');
const logger = require('../utils/logger');

const up = async () => {
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        recipient_id INTEGER NOT NULL,
        subject VARCHAR(200),
        content TEXT NOT NULL,
        essay_id INTEGER,
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        read_at DATETIME,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (essay_id) REFERENCES essays(id) ON DELETE SET NULL
      )
    `);

    // Criar índices para performance
    await run('CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_messages_essay_id ON messages(essay_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read)');
    await run('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)');

    logger.info('Migration 008_create_messages executed successfully');
  } catch (error) {
    logger.error('Error in migration 008_create_messages:', error);
    throw error;
  }
};

const down = async () => {
  try {
    await run('DROP INDEX IF EXISTS idx_messages_created_at');
    await run('DROP INDEX IF EXISTS idx_messages_is_read');
    await run('DROP INDEX IF EXISTS idx_messages_essay_id');
    await run('DROP INDEX IF EXISTS idx_messages_recipient_id');
    await run('DROP INDEX IF EXISTS idx_messages_sender_id');
    await run('DROP TABLE IF EXISTS messages');
    
    logger.info('Migration 008_create_messages rolled back successfully');
  } catch (error) {
    logger.error('Error rolling back migration 008_create_messages:', error);
    throw error;
  }
};

module.exports = { up, down };