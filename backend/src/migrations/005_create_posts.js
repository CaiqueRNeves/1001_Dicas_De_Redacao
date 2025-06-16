const { run } = require('../config/database');
const logger = require('../utils/logger');

const up = async () => {
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        slug VARCHAR(255) UNIQUE NOT NULL,
        featured_image VARCHAR(500),
        category VARCHAR(100),
        tags TEXT,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        views INTEGER DEFAULT 0,
        author_id INTEGER,
        published_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Criar índices para performance
    await run('CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug)');
    await run('CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status)');
    await run('CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category)');
    await run('CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at)');
    await run('CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at)');
    await run('CREATE INDEX IF NOT EXISTS idx_posts_views ON posts(views)');
    await run('CREATE INDEX IF NOT EXISTS idx_posts_title ON posts(title)');

    logger.info('Migration 005_create_posts executed successfully');
  } catch (error) {
    logger.error('Error in migration 005_create_posts:', error);
    throw error;
  }
};

const down = async () => {
  try {
    await run('DROP INDEX IF EXISTS idx_posts_title');
    await run('DROP INDEX IF EXISTS idx_posts_views');
    await run('DROP INDEX IF EXISTS idx_posts_created_at');
    await run('DROP INDEX IF EXISTS idx_posts_published_at');
    await run('DROP INDEX IF EXISTS idx_posts_author_id');
    await run('DROP INDEX IF EXISTS idx_posts_category');
    await run('DROP INDEX IF EXISTS idx_posts_status');
    await run('DROP INDEX IF EXISTS idx_posts_slug');
    await run('DROP TABLE IF EXISTS posts');
    
    logger.info('Migration 005_create_posts rolled back successfully');
  } catch (error) {
    logger.error('Error rolling back migration 005_create_posts:', error);
    throw error;
  }
};

module.exports = { up, down };