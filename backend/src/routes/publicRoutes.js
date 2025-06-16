const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const SiteSettings = require('../models/SiteSettings');
const Post = require('../models/Post');
const Material = require('../models/Material');
const Video = require('../models/Video');

const router = express.Router();

// Aplicar autenticação opcional para todas as rotas
router.use(optionalAuth);

// Configurações públicas do site
router.get('/settings', async (req, res) => {
  try {
    const publicSettings = await SiteSettings.getAsObject(null, true);
    
    res.json({
      success: true,
      data: publicSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter configurações públicas'
    });
  }
});

// Posts públicos
router.get('/posts', async (req, res) => {
  try {
    const { page = 1, limit = 6, category, search } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      published_only: true
    };
    
    if (category) options.category = category;
    if (search) options.search = search;
    
    const result = await Post.findPublished(options);
    
    res.json({
      success: true,
      data: result.posts.map(post => ({
        id: post.id,
        title: post.title,
        excerpt: post.excerpt,
        slug: post.slug,
        featured_image: post.featured_image,
        category: post.category,
        views: post.views,
        published_at: post.published_at,
        author_name: post.author_name,
        reading_time: post.getReadingTime(),
        url: `/posts/${post.slug}`
      })),
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter posts'
    });
  }
});

// Post específico por slug
router.get('/posts/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await Post.findBySlug(slug);
    
    if (!post || !post.isPublished()) {
      return res.status(404).json({
        success: false,
        message: 'Post não encontrado'
      });
    }
    
    // Incrementar visualizações apenas se não for admin
    if (!req.user || req.user.role !== 'admin') {
      await post.incrementViews();
    }
    
    const relatedPosts = await post.getRelatedPosts(3);
    
    res.json({
      success: true,
      data: {
        post: post.toJSON(),
        related: relatedPosts.map(p => ({
          id: p.id,
          title: p.title,
          excerpt: p.excerpt,
          slug: p.slug,
          featured_image: p.featured_image,
          published_at: p.published_at,
          url: `/posts/${p.slug}`
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter post'
    });
  }
});

// Materiais gratuitos
router.get('/materials', async (req, res) => {
  try {
    const { page = 1, limit = 12, category } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      is_free: true
    };
    
    if (category) options.category = category;
    
    const result = await Material.findFree(options);
    
    res.json({
      success: true,
      data: result.materials.map(material => ({
        id: material.id,
        title: material.title,
        description: material.description,
        category: material.category,
        download_count: material.download_count,
        file_size_formatted: Material.formatFileSize(material.file_size || 0),
        download_url: material.getDownloadUrl()
      })),
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter materiais'
    });
  }
});

// Vídeos públicos
router.get('/videos', async (req, res) => {
  try {
    const { page = 1, limit = 12, category } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };
    
    if (category) options.category = category;
    
    const result = await Video.findAll(options);
    
    res.json({
      success: true,
      data: result.videos.map(video => ({
        id: video.id,
        title: video.title,
        description: video.description,
        youtube_id: video.youtube_id,
        thumbnail_url: video.thumbnail_url,
        duration_formatted: video.getFormattedDuration(),
        category: video.category,
        views: video.views,
        embed_url: video.getEmbedUrl(),
        watch_url: video.youtube_url
      })),
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter vídeos'
    });
  }
});

// Categorias disponíveis
router.get('/categories', async (req, res) => {
  try {
    const [postCategories, materialCategories, videoCategories] = await Promise.all([
      Post.getCategories(),
      Material.getCategories(),
      Video.getCategories()
    ]);
    
    res.json({
      success: true,
      data: {
        posts: postCategories,
        materials: materialCategories,
        videos: videoCategories
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter categorias'
    });
  }
});

// Estatísticas públicas do site
router.get('/stats', async (req, res) => {
  try {
    const [postStats, materialStats, videoStats] = await Promise.all([
      Post.getStatistics(),
      Material.getStatistics(),
      Video.getStatistics()
    ]);
    
    res.json({
      success: true,
      data: {
        posts: {
          total: postStats.total,
          published: postStats.byStatus.published,
          total_views: postStats.totalViews
        },
        materials: {
          total: materialStats.total,
          free: materialStats.free,
          total_downloads: materialStats.totalDownloads
        },
        videos: {
          total: videoStats.total,
          total_views: videoStats.totalViews
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas'
    });
  }
});

// Conteúdo em destaque
router.get('/featured', async (req, res) => {
  try {
    const [recentPosts, popularMaterials, recentVideos] = await Promise.all([
      Post.findRecent(3),
      Material.findMostDownloaded(3),
      Video.findRecent(3)
    ]);
    
    res.json({
      success: true,
      data: {
        posts: recentPosts.map(post => ({
          id: post.id,
          title: post.title,
          excerpt: post.excerpt,
          slug: post.slug,
          featured_image: post.featured_image,
          published_at: post.published_at,
          url: `/posts/${post.slug}`
        })),
        materials: popularMaterials.map(material => ({
          id: material.id,
          title: material.title,
          description: material.description,
          download_count: material.download_count,
          download_url: material.getDownloadUrl()
        })),
        videos: recentVideos.map(video => ({
          id: video.id,
          title: video.title,
          youtube_id: video.youtube_id,
          thumbnail_url: video.thumbnail_url,
          duration_formatted: video.getFormattedDuration(),
          embed_url: video.getEmbedUrl()
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter conteúdo em destaque'
    });
  }
});

// Busca geral
router.get('/search', async (req, res) => {
  try {
    const { q: query, type = 'all', page = 1, limit = 10 } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Termo de busca deve ter pelo menos 2 caracteres'
      });
    }
    
    const searchOptions = {
      page: parseInt(page),
      limit: parseInt(limit),
      search: query
    };
    
    let results = {};
    
    if (type === 'all' || type === 'posts') {
      const posts = await Post.findAll({ ...searchOptions, published_only: true });
              results.posts = {
        data: posts.posts.map(post => ({
          id: post.id,
          title: post.title,
          excerpt: post.excerpt,
          slug: post.slug,
          featured_image: post.featured_image,
          category: post.category,
          published_at: post.published_at,
          url: `/posts/${post.slug}`
        })),
        pagination: posts.pagination
      };
    }
    
    if (type === 'all' || type === 'materials') {
      const materials = await Material.findAll({ ...searchOptions, is_free: true });
      results.materials = {
        data: materials.materials.map(material => ({
          id: material.id,
          title: material.title,
          description: material.description,
          category: material.category,
          download_count: material.download_count,
          download_url: material.getDownloadUrl()
        })),
        pagination: materials.pagination
      };
    }
    
    if (type === 'all' || type === 'videos') {
      const videos = await Video.findAll(searchOptions);
      results.videos = {
        data: videos.videos.map(video => ({
          id: video.id,
          title: video.title,
          description: video.description,
          youtube_id: video.youtube_id,
          thumbnail_url: video.thumbnail_url,
          category: video.category,
          embed_url: video.getEmbedUrl()
        })),
        pagination: videos.pagination
      };
    }
    
    res.json({
      success: true,
      data: results,
      query,
      type
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro na busca'
    });
  }
});

// Informações de contato e sobre
router.get('/about', async (req, res) => {
  try {
    const aboutSettings = await SiteSettings.getAsObject('about', true);
    
    res.json({
      success: true,
      data: aboutSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter informações'
    });
  }
});

// Preços dos planos
router.get('/pricing', async (req, res) => {
  try {
    const plans = {
      master: {
        name: 'Plano Master',
        price: 40.00,
        currency: 'BRL',
        period: 'mensal',
        features: [
          'Até 2 redações por semana',
          'Correção profissional detalhada',
          'Feedback personalizado',
          'Acesso a materiais gratuitos',
          'Suporte por email'
        ],
        recommended: false
      },
      vip: {
        name: 'Plano VIP',
        price: 50.00,
        currency: 'BRL',
        period: 'mensal',
        features: [
          'Até 4 redações por semana',
          'Correção profissional detalhada',
          'Feedback personalizado',
          'Acesso a materiais gratuitos',
          'Suporte prioritário',
          'Acesso antecipado a novos conteúdos'
        ],
        recommended: true
      }
    };
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter preços'
    });
  }
});

module.exports = router;