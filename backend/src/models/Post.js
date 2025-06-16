const { query, queryOne, run } = require('../config/database');
const { generateSlug } = require('../utils/validators');
const logger = require('../utils/logger');

class Post {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.content = data.content;
    this.excerpt = data.excerpt;
    this.slug = data.slug;
    this.featured_image = data.featured_image;
    this.category = data.category;
    this.tags = data.tags;
    this.status = data.status || 'draft';
    this.views = data.views || 0;
    this.author_id = data.author_id;
    this.published_at = data.published_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Criar novo post
  static async create(postData) {
    try {
      const { 
        title, 
        content, 
        excerpt, 
        featured_image, 
        category, 
        tags, 
        status = 'draft', 
        author_id 
      } = postData;

      // Gerar slug único
      const baseSlug = generateSlug(title);
      const slug = await Post.generateUniqueSlug(baseSlug);

      // Gerar excerpt automaticamente se não fornecido
      const autoExcerpt = excerpt || Post.generateExcerpt(content);

      const result = await run(
        `INSERT INTO posts (
          title, content, excerpt, slug, featured_image, category, 
          tags, status, author_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [title, content, autoExcerpt, slug, featured_image, category, tags, status, author_id]
      );

      const newPost = await Post.findById(result.lastID);
      logger.info(`Post criado: ID ${result.lastID}, Título: ${title}`);
      
      return newPost;
    } catch (error) {
      logger.error('Erro ao criar post:', error);
      throw error;
    }
  }

  // Buscar post por ID
  static async findById(id) {
    try {
      const postData = await queryOne(
        `SELECT p.*, u.name as author_name, u.email as author_email 
         FROM posts p 
         LEFT JOIN users u ON p.author_id = u.id 
         WHERE p.id = ?`,
        [id]
      );
      return postData ? new Post(postData) : null;
    } catch (error) {
      logger.error('Erro ao buscar post por ID:', error);
      throw error;
    }
  }

  // Buscar post por slug
  static async findBySlug(slug) {
    try {
      const postData = await queryOne(
        `SELECT p.*, u.name as author_name, u.email as author_email 
         FROM posts p 
         LEFT JOIN users u ON p.author_id = u.id 
         WHERE p.slug = ?`,
        [slug]
      );
      return postData ? new Post(postData) : null;
    } catch (error) {
      logger.error('Erro ao buscar post por slug:', error);
      throw error;
    }
  }

  // Listar posts com filtros
  static async findAll(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        category, 
        author_id,
        search,
        published_only = false,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;
      
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      let params = [];

      if (status) {
        whereClause += ' AND p.status = ?';
        params.push(status);
      }

      if (published_only) {
        whereClause += ' AND p.status = "published" AND p.published_at IS NOT NULL';
      }

      if (category) {
        whereClause += ' AND p.category = ?';
        params.push(category);
      }

      if (author_id) {
        whereClause += ' AND p.author_id = ?';
        params.push(author_id);
      }

      if (search) {
        whereClause += ' AND (p.title LIKE ? OR p.content LIKE ? OR p.excerpt LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      const posts = await query(
        `SELECT p.*, u.name as author_name, u.email as author_email
         FROM posts p 
         LEFT JOIN users u ON p.author_id = u.id
         ${whereClause}
         ORDER BY p.${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const totalResult = await queryOne(
        `SELECT COUNT(*) as total FROM posts p ${whereClause}`,
        params
      );

      return {
        posts: posts.map(data => new Post(data)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResult.total,
          totalPages: Math.ceil(totalResult.total / limit)
        }
      };
    } catch (error) {
      logger.error('Erro ao listar posts:', error);
      throw error;
    }
  }

  // Buscar posts publicados
  static async findPublished(options = {}) {
    try {
      return await Post.findAll({ ...options, published_only: true });
    } catch (error) {
      logger.error('Erro ao buscar posts publicados:', error);
      throw error;
    }
  }

  // Buscar posts por categoria
  static async findByCategory(category, options = {}) {
    try {
      return await Post.findAll({ ...options, category, published_only: true });
    } catch (error) {
      logger.error('Erro ao buscar posts por categoria:', error);
      throw error;
    }
  }

  // Buscar posts mais visualizados
  static async findMostViewed(limit = 10) {
    try {
      const posts = await query(
        `SELECT p.*, u.name as author_name
         FROM posts p 
         LEFT JOIN users u ON p.author_id = u.id
         WHERE p.status = 'published'
         ORDER BY p.views DESC
         LIMIT ?`,
        [limit]
      );

      return posts.map(data => new Post(data));
    } catch (error) {
      logger.error('Erro ao buscar posts mais visualizados:', error);
      throw error;
    }
  }

  // Buscar posts recentes
  static async findRecent(limit = 5) {
    try {
      const posts = await query(
        `SELECT p.*, u.name as author_name
         FROM posts p 
         LEFT JOIN users u ON p.author_id = u.id
         WHERE p.status = 'published' AND p.published_at IS NOT NULL
         ORDER BY p.published_at DESC
         LIMIT ?`,
        [limit]
      );

      return posts.map(data => new Post(data));
    } catch (error) {
      logger.error('Erro ao buscar posts recentes:', error);
      throw error;
    }
  }

  // Atualizar post
  async update(updateData) {
    try {
      const allowedFields = [
        'title', 'content', 'excerpt', 'featured_image', 
        'category', 'tags', 'status'
      ];
      const updateFields = [];
      const params = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key} = ?`);
          params.push(value);
        }
      }

      // Se título mudou, gerar novo slug
      if (updateData.title && updateData.title !== this.title) {
        const baseSlug = generateSlug(updateData.title);
        const newSlug = await Post.generateUniqueSlug(baseSlug, this.id);
        updateFields.push('slug = ?');
        params.push(newSlug);
      }

      // Se status mudou para published, definir published_at
      if (updateData.status === 'published' && this.status !== 'published') {
        updateFields.push('published_at = datetime(\'now\')');
      }

      if (updateFields.length === 0) {
        throw new Error('Nenhum campo válido para atualizar');
      }

      updateFields.push('updated_at = datetime(\'now\')');
      params.push(this.id);

      await run(
        `UPDATE posts SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      // Atualizar instância atual
      Object.assign(this, updateData);
      this.updated_at = new Date().toISOString();

      if (updateData.status === 'published' && this.status !== 'published') {
        this.published_at = new Date().toISOString();
      }

      logger.info(`Post atualizado: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao atualizar post:', error);
      throw error;
    }
  }

  // Publicar post
  async publish() {
    try {
      await this.update({ status: 'published' });
      logger.info(`Post publicado: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao publicar post:', error);
      throw error;
    }
  }

  // Despublicar post
  async unpublish() {
    try {
      await this.update({ status: 'draft' });
      logger.info(`Post despublicado: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao despublicar post:', error);
      throw error;
    }
  }

  // Arquivar post
  async archive() {
    try {
      await this.update({ status: 'archived' });
      logger.info(`Post arquivado: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao arquivar post:', error);
      throw error;
    }
  }

  // Incrementar contador de visualizações
  async incrementViews() {
    try {
      await run(
        'UPDATE posts SET views = views + 1 WHERE id = ?',
        [this.id]
      );
      
      this.views = (this.views || 0) + 1;
      
      logger.debug(`Visualização registrada: Post ID ${this.id}, Total: ${this.views}`);
      return this.views;
    } catch (error) {
      logger.error('Erro ao incrementar visualizações:', error);
      throw error;
    }
  }

  // Deletar post
  async delete() {
    try {
      // Deletar imagem destacada se existir
      if (this.featured_image) {
        const { deleteFile } = require('../config/multer');
        await deleteFile(this.featured_image);
      }

      await run('DELETE FROM posts WHERE id = ?', [this.id]);
      logger.info(`Post deletado: ID ${this.id}`);
      return true;
    } catch (error) {
      logger.error('Erro ao deletar post:', error);
      throw error;
    }
  }

  // Gerar slug único
  static async generateUniqueSlug(baseSlug, excludeId = null) {
    try {
      let slug = baseSlug;
      let counter = 1;

      while (true) {
        let whereClause = 'WHERE slug = ?';
        let params = [slug];

        if (excludeId) {
          whereClause += ' AND id != ?';
          params.push(excludeId);
        }

        const existing = await queryOne(
          `SELECT id FROM posts ${whereClause}`,
          params
        );

        if (!existing) {
          return slug;
        }

        counter++;
        slug = `${baseSlug}-${counter}`;
      }
    } catch (error) {
      logger.error('Erro ao gerar slug único:', error);
      throw error;
    }
  }

  // Gerar excerpt automaticamente
  static generateExcerpt(content, maxLength = 200) {
    if (!content) return '';
    
    // Remover tags HTML
    const plainText = content.replace(/<[^>]*>/g, '');
    
    // Truncar no último espaço antes do limite
    if (plainText.length <= maxLength) {
      return plainText.trim();
    }
    
    const truncated = plainText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
  }

  // Processar tags
  static processTags(tagsString) {
    if (!tagsString) return [];
    
    return tagsString
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0)
      .slice(0, 10); // Máximo 10 tags
  }

  // Obter tags como array
  getTagsArray() {
    return Post.processTags(this.tags);
  }

  // Obter estatísticas de posts
  static async getStatistics(options = {}) {
    try {
      const { dateFrom, dateTo, author_id } = options;

      let whereClause = 'WHERE 1=1';
      let params = [];

      if (dateFrom) {
        whereClause += ' AND date(created_at) >= ?';
        params.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ' AND date(created_at) <= ?';
        params.push(dateTo);
      }

      if (author_id) {
        whereClause += ' AND author_id = ?';
        params.push(author_id);
      }

      const [total, published, draft, archived] = await Promise.all([
        queryOne(`SELECT COUNT(*) as count FROM posts ${whereClause}`, params),
        queryOne(`SELECT COUNT(*) as count FROM posts ${whereClause} AND status = 'published'`, params),
        queryOne(`SELECT COUNT(*) as count FROM posts ${whereClause} AND status = 'draft'`, params),
        queryOne(`SELECT COUNT(*) as count FROM posts ${whereClause} AND status = 'archived'`, params)
      ]);

      const byCategory = await query(
        `SELECT category, COUNT(*) as count 
         FROM posts ${whereClause} 
         GROUP BY category`,
        params
      );

      const totalViews = await queryOne(
        `SELECT SUM(views) as total FROM posts ${whereClause}`,
        params
      );

      const mostViewed = await query(
        `SELECT title, views 
         FROM posts ${whereClause} 
         ORDER BY views DESC 
         LIMIT 5`,
        params
      );

      return {
        total: total.count,
        byStatus: {
          published: published.count,
          draft: draft.count,
          archived: archived.count
        },
        byCategory: byCategory.reduce((acc, item) => {
          acc[item.category || 'Sem categoria'] = item.count;
          return acc;
        }, {}),
        totalViews: totalViews.total || 0,
        mostViewed
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas de posts:', error);
      throw error;
    }
  }

  // Obter categorias disponíveis
  static async getCategories() {
    try {
      const categories = await query(
        'SELECT DISTINCT category FROM posts WHERE category IS NOT NULL ORDER BY category'
      );
      
      return categories.map(row => row.category);
    } catch (error) {
      logger.error('Erro ao obter categorias:', error);
      throw error;
    }
  }

  // Obter todas as tags
  static async getAllTags() {
    try {
      const posts = await query(
        'SELECT tags FROM posts WHERE tags IS NOT NULL AND tags != ""'
      );
      
      const allTags = new Set();
      
      posts.forEach(post => {
        const tags = Post.processTags(post.tags);
        tags.forEach(tag => allTags.add(tag));
      });
      
      return Array.from(allTags).sort();
    } catch (error) {
      logger.error('Erro ao obter tags:', error);
      throw error;
    }
  }

  // Buscar posts relacionados
  async getRelatedPosts(limit = 5) {
    try {
      const tags = this.getTagsArray();
      
      if (tags.length === 0) {
        // Se não há tags, buscar por categoria
        return await query(
          `SELECT p.*, u.name as author_name
           FROM posts p 
           LEFT JOIN users u ON p.author_id = u.id
           WHERE p.category = ? AND p.id != ? AND p.status = 'published'
           ORDER BY p.published_at DESC
           LIMIT ?`,
          [this.category, this.id, limit]
        );
      }

      // Buscar posts com tags similares
      const tagPattern = tags.map(() => '?').join('|');
      const related = await query(
        `SELECT p.*, u.name as author_name,
          (LENGTH(p.tags) - LENGTH(REPLACE(LOWER(p.tags), LOWER(?), ''))) as relevance
         FROM posts p 
         LEFT JOIN users u ON p.author_id = u.id
         WHERE p.id != ? AND p.status = 'published' AND p.tags IS NOT NULL
         ORDER BY relevance DESC, p.published_at DESC
         LIMIT ?`,
        [tags.join('|'), this.id, limit]
      );

      return related.map(data => new Post(data));
    } catch (error) {
      logger.error('Erro ao buscar posts relacionados:', error);
      return [];
    }
  }

  // Verificar se está publicado
  isPublished() {
    return this.status === 'published' && this.published_at;
  }

  // Obter tempo de leitura estimado
  getReadingTime() {
    if (!this.content) return 0;
    
    const wordsPerMinute = 200;
    const plainText = this.content.replace(/<[^>]*>/g, '');
    const wordCount = plainText.split(/\s+/).length;
    
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  // Converter para JSON
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      excerpt: this.excerpt,
      slug: this.slug,
      featured_image: this.featured_image,
      category: this.category,
      tags: this.tags,
      tags_array: this.getTagsArray(),
      status: this.status,
      views: this.views,
      author_id: this.author_id,
      published_at: this.published_at,
      created_at: this.created_at,
      updated_at: this.updated_at,
      author_name: this.author_name,
      author_email: this.author_email,
      is_published: this.isPublished(),
      reading_time: this.getReadingTime(),
      url: `/posts/${this.slug}`
    };
  }
}

module.exports = Post;