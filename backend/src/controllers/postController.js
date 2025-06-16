const Post = require('../models/Post');
const { imageUpload } = require('../config/multer');
const logger = require('../utils/logger');

class PostController {
  // Criar novo post
  static async createPost(req, res) {
    try {
      const { title, content, excerpt, category, tags, status = 'draft' } = req.body;
      const featuredImage = req.file ? req.file.path : null;

      const postData = {
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt?.trim(),
        featured_image: featuredImage,
        category: category?.trim(),
        tags: tags?.trim(),
        status,
        author_id: req.user.id
      };

      const post = await Post.create(postData);

      logger.info(`Post criado: ID ${post.id}, Título: ${title}, Autor: ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Post criado com sucesso',
        data: post.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao criar post:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Listar posts
  static async getPosts(req, res) {
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
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        category,
        author_id,
        search,
        published_only: published_only === 'true',
        sortBy,
        sortOrder
      };

      const result = await Post.findAll(options);

      res.json({
        success: true,
        data: result.posts.map(post => post.toJSON()),
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro ao listar posts:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter post por ID
  static async getPostById(req, res) {
    try {
      const { id } = req.params;
      const post = await Post.findById(id);

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post não encontrado'
        });
      }

      // Incrementar visualizações se for acesso público
      if (!req.user || req.user.role !== 'admin') {
        await post.incrementViews();
      }

      // Buscar posts relacionados
      const relatedPosts = await post.getRelatedPosts(3);

      res.json({
        success: true,
        data: {
          post: post.toJSON(),
          related: relatedPosts.map(p => p.toJSON())
        }
      });

    } catch (error) {
      logger.error('Erro ao obter post:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter post por slug
  static async getPostBySlug(req, res) {
    try {
      const { slug } = req.params;
      const post = await Post.findBySlug(slug);

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post não encontrado'
        });
      }

      // Verificar se está publicado (exceto para admin)
      if (req.user?.role !== 'admin' && !post.isPublished()) {
        return res.status(404).json({
          success: false,
          message: 'Post não encontrado'
        });
      }

      // Incrementar visualizações
      if (!req.user || req.user.role !== 'admin') {
        await post.incrementViews();
      }

      // Buscar posts relacionados
      const relatedPosts = await post.getRelatedPosts(3);

      res.json({
        success: true,
        data: {
          post: post.toJSON(),
          related: relatedPosts.map(p => p.toJSON())
        }
      });

    } catch (error) {
      logger.error('Erro ao obter post por slug:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar post
  static async updatePost(req, res) {
    try {
      const { id } = req.params;
      const { title, content, excerpt, category, tags, status } = req.body;
      const featuredImage = req.file ? req.file.path : undefined;

      const post = await Post.findById(id);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post não encontrado'
        });
      }

      // Verificar permissões
      if (req.user.role !== 'admin' && post.author_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      const updateData = {};
      if (title) updateData.title = title.trim();
      if (content) updateData.content = content.trim();
      if (excerpt !== undefined) updateData.excerpt = excerpt?.trim();
      if (category !== undefined) updateData.category = category?.trim();
      if (tags !== undefined) updateData.tags = tags?.trim();
      if (status) updateData.status = status;
      if (featuredImage) updateData.featured_image = featuredImage;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum campo para atualizar'
        });
      }

      await post.update(updateData);

      logger.info(`Post atualizado: ID ${post.id} por ${req.user.email}`);

      res.json({
        success: true,
        message: 'Post atualizado com sucesso',
        data: post.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao atualizar post:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Deletar post
  static async deletePost(req, res) {
    try {
      const { id } = req.params;

      const post = await Post.findById(id);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post não encontrado'
        });
      }

      // Verificar permissões
      if (req.user.role !== 'admin' && post.author_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      await post.delete();

      logger.info(`Post deletado: ID ${post.id} por ${req.user.email}`);

      res.json({
        success: true,
        message: 'Post deletado com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao deletar post:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Publicar post
  static async publishPost(req, res) {
    try {
      const { id } = req.params;

      const post = await Post.findById(id);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post não encontrado'
        });
      }

      // Verificar permissões
      if (req.user.role !== 'admin' && post.author_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      await post.publish();

      logger.info(`Post publicado: ID ${post.id} por ${req.user.email}`);

      res.json({
        success: true,
        message: 'Post publicado com sucesso',
        data: post.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao publicar post:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Despublicar post
  static async unpublishPost(req, res) {
    try {
      const { id } = req.params;

      const post = await Post.findById(id);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post não encontrado'
        });
      }

      // Verificar permissões
      if (req.user.role !== 'admin' && post.author_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      await post.unpublish();

      logger.info(`Post despublicado: ID ${post.id} por ${req.user.email}`);

      res.json({
        success: true,
        message: 'Post despublicado com sucesso',
        data: post.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao despublicar post:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Arquivar post
  static async archivePost(req, res) {
    try {
      const { id } = req.params;

      const post = await Post.findById(id);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post não encontrado'
        });
      }

      // Verificar permissões
      if (req.user.role !== 'admin' && post.author_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      await post.archive();

      logger.info(`Post arquivado: ID ${post.id} por ${req.user.email}`);

      res.json({
        success: true,
        message: 'Post arquivado com sucesso',
        data: post.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao arquivar post:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter posts publicados
  static async getPublishedPosts(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        category, 
        search,
        sortBy = 'published_at',
        sortOrder = 'DESC'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        category,
        search,
        published_only: true,
        sortBy,
        sortOrder
      };

      const result = await Post.findPublished(options);

      res.json({
        success: true,
        data: result.posts.map(post => post.toJSON()),
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro ao listar posts publicados:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter posts por categoria
  static async getPostsByCategory(req, res) {
    try {
      const { category } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await Post.findByCategory(category, options);

      res.json({
        success: true,
        data: result.posts.map(post => post.toJSON()),
        pagination: result.pagination,
        category
      });

    } catch (error) {
      logger.error('Erro ao buscar posts por categoria:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter posts mais visualizados
  static async getMostViewedPosts(req, res) {
    try {
      const { limit = 10 } = req.query;

      const posts = await Post.findMostViewed(parseInt(limit));

      res.json({
        success: true,
        data: posts.map(post => post.toJSON())
      });

    } catch (error) {
      logger.error('Erro ao buscar posts mais visualizados:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter posts recentes
  static async getRecentPosts(req, res) {
    try {
      const { limit = 5 } = req.query;

      const posts = await Post.findRecent(parseInt(limit));

      res.json({
        success: true,
        data: posts.map(post => post.toJSON())
      });

    } catch (error) {
      logger.error('Erro ao buscar posts recentes:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter categorias disponíveis
  static async getCategories(req, res) {
    try {
      const categories = await Post.getCategories();

      res.json({
        success: true,
        data: categories
      });

    } catch (error) {
      logger.error('Erro ao obter categorias:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter todas as tags
  static async getAllTags(req, res) {
    try {
      const tags = await Post.getAllTags();

      res.json({
        success: true,
        data: tags
      });

    } catch (error) {
      logger.error('Erro ao obter tags:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter estatísticas de posts
  static async getPostStatistics(req, res) {
    try {
      const { dateFrom, dateTo, author_id } = req.query;
      
      const options = {};
      if (dateFrom) options.dateFrom = dateFrom;
      if (dateTo) options.dateTo = dateTo;
      if (author_id) options.author_id = author_id;

      const stats = await Post.getStatistics(options);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Erro ao obter estatísticas de posts:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Upload de imagem para post
  static async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Arquivo de imagem é obrigatório'
        });
      }

      const imageUrl = `/uploads/images/${req.file.filename}`;

      logger.info(`Imagem uploadada para post: ${req.file.filename} por ${req.user.email}`);

      res.json({
        success: true,
        message: 'Imagem uploadada com sucesso',
        data: {
          url: imageUrl,
          filename: req.file.filename,
          size: req.file.size
        }
      });

    } catch (error) {
      logger.error('Erro ao fazer upload de imagem:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = PostController;