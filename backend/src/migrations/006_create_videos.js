const { run } = require('../config/database');
const logger = require('../utils/logger');

const up = async () => {
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        youtube_url VARCHAR(500) NOT NULL,
        youtube_id VARCHAR(50) NOT NULL UNIQUE,
        thumbnail_url VARCHAR(500),
        duration INTEGER,
        category VARCHAR(100),
        views INTEGER DEFAULT 0,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Criar índices para performance
    await run('CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category)');
    await run('CREATE INDEX IF NOT EXISTS idx_videos_created_by ON videos(created_by)');
    await run('CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at)');
    await run('CREATE INDEX IF NOT EXISTS idx_videos_views ON videos(views)');
    await run('CREATE INDEX IF NOT EXISTS idx_videos_title ON videos(title)');
    await run('CREATE INDEX IF NOT EXISTS idx_videos_duration ON videos(duration)');

    logger.info('Migration 006_create_videos executed successfully');
  } catch (error) {
    logger.error('Error in migration 006_create_videos:', error);
    throw error;
  }
};

const down = async () => {
  try {
    await run('DROP INDEX IF EXISTS idx_videos_duration');
    await run('DROP INDEX IF EXISTS idx_videos_title');
    await run('DROP INDEX IF EXISTS idx_videos_views');
    await run('DROP INDEX IF EXISTS idx_videos_created_at');
    await run('DROP INDEX IF EXISTS idx_videos_created_by');
    await run('DROP INDEX IF EXISTS idx_videos_category');
    await run('DROP INDEX IF EXISTS idx_videos_youtube_id');
    await run('DROP TABLE IF EXISTS videos');
    
    logger.info('Migration 006_create_videos rolled back successfully');
  } catch (error) {
    logger.error('Error rolling back migration 006_create_videos:', error);
    throw error;
  }
};

module.exports = { up, down };