const { run } = require('../config/database');
const logger = require('../utils/logger');

const up = async () => {
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS essays (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT,
        theme VARCHAR(200) NOT NULL,
        file_path VARCHAR(500),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'correcting', 'corrected', 'returned')),
        grade DECIMAL(4,2),
        feedback TEXT,
        corrected_file_path VARCHAR(500),
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        corrected_at DATETIME,
        week_submission INTEGER NOT NULL,
        year_submission INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Criar índices para performance
    await run('CREATE INDEX IF NOT EXISTS idx_essays_user_id ON essays(user_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_essays_status ON essays(status)');
    await run('CREATE INDEX IF NOT EXISTS idx_essays_submitted_at ON essays(submitted_at)');
    await run('CREATE INDEX IF NOT EXISTS idx_essays_week_year ON essays(week_submission, year_submission)');
    await run('CREATE INDEX IF NOT EXISTS idx_essays_theme ON essays(theme)');
    await run('CREATE INDEX IF NOT EXISTS idx_essays_grade ON essays(grade)');

    logger.info('Migration 002_create_essays executed successfully');
  } catch (error) {
    logger.error('Error in migration 002_create_essays:', error);
    throw error;
  }
};

const down = async () => {
  try {
    await run('DROP INDEX IF EXISTS idx_essays_grade');
    await run('DROP INDEX IF EXISTS idx_essays_theme');
    await run('DROP INDEX IF EXISTS idx_essays_week_year');
    await run('DROP INDEX IF EXISTS idx_essays_submitted_at');
    await run('DROP INDEX IF EXISTS idx_essays_status');
    await run('DROP INDEX IF EXISTS idx_essays_user_id');
    await run('DROP TABLE IF EXISTS essays');
    
    logger.info('Migration 002_create_essays rolled back successfully');
  } catch (error) {
    logger.error('Error rolling back migration 002_create_essays:', error);
    throw error;
  }
};

module.exports = { up, down };