const { query, queryOne, run } = require('../config/database');
const { validateYouTubeURL, extractYouTubeID } = require('../utils/validators');
const logger = require('../utils/logger');

class Video {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.youtube_url = data.youtube_url;
    this.youtube_id = data.youtube_id;
    this.thumbnail_url = data.thumbnail_url;
    this.duration = data.duration;
    this.category = data.category;
    this.views = data.views || 0;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Criar novo vídeo
  static async create(videoData) {
    try {
      const { 
        title, 
        description, 
        youtube_url, 
        category, 
        created_by 
      } = videoData;

      // Validar URL do YouTube
      if (!validateYouTubeURL(youtube_url)) {
        throw new Error('URL do YouTube inválida');
      }

      // Extrair ID do YouTube
      const youtube_id = extractYouTubeID(youtube_url);
      if (!youtube_id) {
        throw new Error('Não foi possível extrair ID do vídeo do YouTube');
      }

      // Gerar URL da thumbnail
      const thumbnail_url = `https://img.youtube.com/vi/${youtube_id}/maxresdefault.jpg`;

      // Obter dados do vídeo do YouTube (duração, etc.)
      const videoInfo = await Video.fetchYouTubeInfo(youtube_id);

      const result = await run(
        `INSERT INTO videos (
          title, description, youtube_url, youtube_id, thumbnail_url, 
          duration, category, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          title, 
          description, 
          youtube_url, 
          youtube_id, 
          thumbnail_url, 
          videoInfo.duration || null, 
          category, 
          created_by
        ]
      );

      const newVideo = await Video.findById(result.lastID);
      logger.info(`Vídeo criado: ID ${result.lastID}, YouTube ID: ${youtube_id}`);
      
      return newVideo;
    } catch (error) {
      logger.error('Erro ao criar vídeo:', error);
      throw error;
    }
  }

  // Buscar vídeo por ID
  static async findById(id) {
    try {
      const videoData = await queryOne(
        `SELECT v.*, u.name as creator_name, u.email as creator_email 
         FROM videos v 
         LEFT JOIN users u ON v.created_by = u.id 
         WHERE v.id = ?`,
        [id]
      );
      return videoData ? new Video(videoData) : null;
    } catch (error) {
      logger.error('Erro ao buscar vídeo por ID:', error);
      throw error;
    }
  }

  // Buscar vídeo por YouTube ID
  static async findByYouTubeId(youtubeId) {
    try {
      const videoData = await queryOne(
        `SELECT v.*, u.name as creator_name, u.email as creator_email 
         FROM videos v 
         LEFT JOIN users u ON v.created_by = u.id 
         WHERE v.youtube_id = ?`,
        [youtubeId]
      );
      return videoData ? new Video(videoData) : null;
    } catch (error) {
      logger.error('Erro ao buscar vídeo por YouTube ID:', error);
      throw error;
    }
  }

  // Listar vídeos com filtros
  static async findAll(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        category, 
        search,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;
      
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      let params = [];

      if (category) {
        whereClause += ' AND v.category = ?';
        params.push(category);
      }

      if (search) {
        whereClause += ' AND (v.title LIKE ? OR v.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      const videos = await query(
        `SELECT v.*, u.name as creator_name, u.email as creator_email
         FROM videos v 
         LEFT JOIN users u ON v.created_by = u.id
         ${whereClause}
         ORDER BY v.${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const totalResult = await queryOne(
        `SELECT COUNT(*) as total FROM videos v ${whereClause}`,
        params
      );

      return {
        videos: videos.map(data => new Video(data)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResult.total,
          totalPages: Math.ceil(totalResult.total / limit)
        }
      };
    } catch (error) {
      logger.error('Erro ao listar vídeos:', error);
      throw error;
    }
  }

  // Buscar vídeos por categoria
  static async findByCategory(category, options = {}) {
    try {
      return await Video.findAll({ ...options, category });
    } catch (error) {
      logger.error('Erro ao buscar vídeos por categoria:', error);
      throw error;
    }
  }

  // Buscar vídeos mais visualizados
  static async findMostViewed(limit = 10) {
    try {
      const videos = await query(
        `SELECT v.*, u.name as creator_name
         FROM videos v 
         LEFT JOIN users u ON v.created_by = u.id
         ORDER BY v.views DESC
         LIMIT ?`,
        [limit]
      );

      return videos.map(data => new Video(data));
    } catch (error) {
      logger.error('Erro ao buscar vídeos mais visualizados:', error);
      throw error;
    }
  }

  // Buscar vídeos recentes
  static async findRecent(limit = 10) {
    try {
      const videos = await query(
        `SELECT v.*, u.name as creator_name
         FROM videos v 
         LEFT JOIN users u ON v.created_by = u.id
         ORDER BY v.created_at DESC
         LIMIT ?`,
        [limit]
      );

      return videos.map(data => new Video(data));
    } catch (error) {
      logger.error('Erro ao buscar vídeos recentes:', error);
      throw error;
    }
  }

  // Atualizar vídeo
  async update(updateData) {
    try {
      const allowedFields = [
        'title', 'description', 'youtube_url', 'category'
      ];
      const updateFields = [];
      const params = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key} = ?`);
          params.push(value);
        }
      }

      // Se URL do YouTube mudou, atualizar dados relacionados
      if (updateData.youtube_url && updateData.youtube_url !== this.youtube_url) {
        if (!validateYouTubeURL(updateData.youtube_url)) {
          throw new Error('URL do YouTube inválida');
        }

        const newYouTubeId = extractYouTubeID(updateData.youtube_url);
        if (!newYouTubeId) {
          throw new Error('Não foi possível extrair ID do vídeo do YouTube');
        }

        updateFields.push('youtube_id = ?', 'thumbnail_url = ?');
        params.push(
          newYouTubeId,
          `https://img.youtube.com/vi/${newYouTubeId}/maxresdefault.jpg`
        );

        // Atualizar duração se possível
        try {
          const videoInfo = await Video.fetchYouTubeInfo(newYouTubeId);
          if (videoInfo.duration) {
            updateFields.push('duration = ?');
            params.push(videoInfo.duration);
          }
        } catch (error) {
          logger.warn('Não foi possível obter informações do YouTube:', error);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('Nenhum campo válido para atualizar');
      }

      updateFields.push('updated_at = datetime(\'now\')');
      params.push(this.id);

      await run(
        `UPDATE videos SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      // Atualizar instância atual
      Object.assign(this, updateData);
      this.updated_at = new Date().toISOString();

      logger.info(`Vídeo atualizado: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao atualizar vídeo:', error);
      throw error;
    }
  }

  // Incrementar contador de visualizações
  async incrementViews() {
    try {
      await run(
        'UPDATE videos SET views = views + 1 WHERE id = ?',
        [this.id]
      );
      
      this.views = (this.views || 0) + 1;
      
      logger.debug(`Visualização registrada: Vídeo ID ${this.id}, Total: ${this.views}`);
      return this.views;
    } catch (error) {
      logger.error('Erro ao incrementar visualizações:', error);
      throw error;
    }
  }

  // Deletar vídeo
  async delete() {
    try {
      await run('DELETE FROM videos WHERE id = ?', [this.id]);
      logger.info(`Vídeo deletado: ID ${this.id}`);
      return true;
    } catch (error) {
      logger.error('Erro ao deletar vídeo:', error);
      throw error;
    }
  }

  // Obter informações do YouTube
  static async fetchYouTubeInfo(youtubeId) {
    try {
      // Implementação simplificada - em produção usar YouTube Data API
      const axios = require('axios');
      const apiKey = process.env.YOUTUBE_API_KEY;
      
      if (!apiKey) {
        logger.warn('YouTube API key não configurada');
        return { duration: null };
      }

      const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
        params: {
          id: youtubeId,
          part: 'contentDetails,snippet,statistics',
          key: apiKey
        }
      });

      if (response.data.items && response.data.items.length > 0) {
        const video = response.data.items[0];
        
        return {
          duration: Video.parseDuration(video.contentDetails.duration),
          viewCount: parseInt(video.statistics.viewCount) || 0,
          publishedAt: video.snippet.publishedAt
        };
      }

      return { duration: null };
    } catch (error) {
      logger.error('Erro ao obter informações do YouTube:', error);
      return { duration: null };
    }
  }

  // Converter duração do YouTube (PT4M13S) para segundos
  static parseDuration(isoDuration) {
    if (!isoDuration) return null;
    
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return null;
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  // Formatar duração em formato legível
  getFormattedDuration() {
    if (!this.duration) return 'Duração desconhecida';
    
    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    const seconds = this.duration % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Obter URL do player incorporado
  getEmbedUrl() {
    return `https://www.youtube.com/embed/${this.youtube_id}`;
  }

  // Obter URL da thumbnail em diferentes tamanhos
  getThumbnailUrl(size = 'maxresdefault') {
    const sizes = {
      default: 'default.jpg',
      medium: 'mqdefault.jpg',
      high: 'hqdefault.jpg',
      standard: 'sddefault.jpg',
      maxres: 'maxresdefault.jpg'
    };
    
    const thumbnailFile = sizes[size] || sizes.maxres;
    return `https://img.youtube.com/vi/${this.youtube_id}/${thumbnailFile}`;
  }

  // Obter estatísticas de vídeos
  static async getStatistics(options = {}) {
    try {
      const { dateFrom, dateTo, category } = options;

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

      if (category) {
        whereClause += ' AND category = ?';
        params.push(category);
      }

      const total = await queryOne(
        `SELECT COUNT(*) as count FROM videos ${whereClause}`,
        params
      );

      const byCategory = await query(
        `SELECT category, COUNT(*) as count 
         FROM videos ${whereClause} 
         GROUP BY category`,
        params
      );

      const totalViews = await queryOne(
        `SELECT SUM(views) as total FROM videos ${whereClause}`,
        params
      );

      const totalDuration = await queryOne(
        `SELECT SUM(duration) as total FROM videos ${whereClause} AND duration IS NOT NULL`,
        params
      );

      const mostViewed = await query(
        `SELECT title, views 
         FROM videos ${whereClause} 
         ORDER BY views DESC 
         LIMIT 5`,
        params
      );

      return {
        total: total.count,
        byCategory: byCategory.reduce((acc, item) => {
          acc[item.category || 'Sem categoria'] = item.count;
          return acc;
        }, {}),
        totalViews: totalViews.total || 0,
        totalDuration: totalDuration.total || 0,
        mostViewed
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas de vídeos:', error);
      throw error;
    }
  }

  // Obter categorias disponíveis
  static async getCategories() {
    try {
      const categories = await query(
        'SELECT DISTINCT category FROM videos WHERE category IS NOT NULL ORDER BY category'
      );
      
      return categories.map(row => row.category);
    } catch (error) {
      logger.error('Erro ao obter categorias:', error);
      throw error;
    }
  }

  // Buscar vídeos relacionados
  async getRelatedVideos(limit = 5) {
    try {
      const related = await query(
        `SELECT v.*, u.name as creator_name
         FROM videos v 
         LEFT JOIN users u ON v.created_by = u.id
         WHERE v.category = ? AND v.id != ?
         ORDER BY v.views DESC
         LIMIT ?`,
        [this.category, this.id, limit]
      );

      return related.map(data => new Video(data));
    } catch (error) {
      logger.error('Erro ao buscar vídeos relacionados:', error);
      return [];
    }
  }

  // Verificar se vídeo existe no YouTube
  async verifyYouTubeVideo() {
    try {
      const videoInfo = await Video.fetchYouTubeInfo(this.youtube_id);
      return videoInfo.duration !== null;
    } catch (error) {
      logger.error('Erro ao verificar vídeo no YouTube:', error);
      return false;
    }
  }

  // Atualizar informações do YouTube
  async updateYouTubeInfo() {
    try {
      const videoInfo = await Video.fetchYouTubeInfo(this.youtube_id);
      
      if (videoInfo.duration) {
        await this.update({ duration: videoInfo.duration });
      }
      
      return videoInfo;
    } catch (error) {
      logger.error('Erro ao atualizar informações do YouTube:', error);
      throw error;
    }
  }

  // Validar se é um vídeo público
  async isPublicVideo() {
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${this.youtube_url}&format=json`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Converter para JSON
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      youtube_url: this.youtube_url,
      youtube_id: this.youtube_id,
      thumbnail_url: this.thumbnail_url,
      thumbnail_sizes: {
        default: this.getThumbnailUrl('default'),
        medium: this.getThumbnailUrl('medium'),
        high: this.getThumbnailUrl('high'),
        standard: this.getThumbnailUrl('standard'),
        maxres: this.getThumbnailUrl('maxres')
      },
      duration: this.duration,
      duration_formatted: this.getFormattedDuration(),
      category: this.category,
      views: this.views,
      created_by: this.created_by,
      created_at: this.created_at,
      updated_at: this.updated_at,
      creator_name: this.creator_name,
      creator_email: this.creator_email,
      embed_url: this.getEmbedUrl(),
      watch_url: this.youtube_url
    };
  }
}

module.exports = Video;