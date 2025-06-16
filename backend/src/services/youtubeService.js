const axios = require('axios');
const logger = require('../utils/logger');

class YouTubeService {
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY;
    this.baseURL = 'https://www.googleapis.com/youtube/v3';
  }

  // Obter informações do vídeo
  async getVideoInfo(videoId) {
    try {
      if (!this.apiKey) {
        logger.warn('YouTube API key não configurada');
        return this.getFallbackVideoInfo(videoId);
      }

      const response = await axios.get(`${this.baseURL}/videos`, {
        params: {
          id: videoId,
          part: 'snippet,contentDetails,statistics',
          key: this.apiKey
        }
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Vídeo não encontrado');
      }

      const video = response.data.items[0];
      
      return {
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url,
        duration: this.parseDuration(video.contentDetails.duration),
        publishedAt: video.snippet.publishedAt,
        channelTitle: video.snippet.channelTitle,
        viewCount: parseInt(video.statistics.viewCount) || 0,
        likeCount: parseInt(video.statistics.likeCount) || 0,
        isAvailable: true
      };
    } catch (error) {
      logger.error(`Erro ao obter informações do YouTube para ${videoId}:`, error);
      return this.getFallbackVideoInfo(videoId);
    }
  }

  // Informações básicas sem API
  getFallbackVideoInfo(videoId) {
    return {
      id: videoId,
      title: 'Vídeo do YouTube',
      description: '',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: null,
      publishedAt: null,
      channelTitle: '',
      viewCount: 0,
      likeCount: 0,
      isAvailable: true
    };
  }

  // Validar URL do YouTube
  validateYouTubeURL(url) {
    const patterns = [
      /^https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})$/,
      /^https:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})$/,
      /^https:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]{11})$/
    ];

    return patterns.some(pattern => pattern.test(url));
  }

  // Extrair ID do vídeo da URL
  extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  // Converter duração ISO 8601 para segundos
  parseDuration(isoDuration) {
    if (!isoDuration) return null;

    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return null;

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    return hours * 3600 + minutes * 60 + seconds;
  }

  // Formatar duração em formato legível
  formatDuration(seconds) {
    if (!seconds) return 'Duração desconhecida';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // Verificar se vídeo está disponível
  async isVideoAvailable(videoId) {
    try {
      const response = await axios.head(`https://www.youtube.com/watch?v=${videoId}`);
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // Obter thumbnail em diferentes tamanhos
  getThumbnailURL(videoId, size = 'maxresdefault') {
    const sizes = {
      default: 'default.jpg',
      medium: 'mqdefault.jpg',
      high: 'hqdefault.jpg',
      standard: 'sddefault.jpg',
      maxres: 'maxresdefault.jpg'
    };

    const thumbnailFile = sizes[size] || sizes.maxres;
    return `https://img.youtube.com/vi/${videoId}/${thumbnailFile}`;
  }

  // Gerar URL de embed
  getEmbedURL(videoId, options = {}) {
    const params = new URLSearchParams({
      autoplay: options.autoplay ? '1' : '0',
      mute: options.mute ? '1' : '0',
      controls: options.controls !== false ? '1' : '0',
      modestbranding: '1',
      rel: '0',
      ...options.customParams
    });

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }

  // Buscar vídeos por canal
  async searchChannelVideos(channelId, maxResults = 10) {
    try {
      if (!this.apiKey) {
        throw new Error('YouTube API key não configurada');
      }

      const response = await axios.get(`${this.baseURL}/search`, {
        params: {
          channelId,
          part: 'snippet',
          order: 'date',
          maxResults,
          type: 'video',
          key: this.apiKey
        }
      });

      return response.data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.high?.url,
        publishedAt: item.snippet.publishedAt
      }));
    } catch (error) {
      logger.error('Erro ao buscar vídeos do canal:', error);
      throw error;
    }
  }

  // Obter estatísticas de múltiplos vídeos
  async getMultipleVideoStats(videoIds) {
    try {
      if (!this.apiKey) {
        return videoIds.map(id => ({ id, viewCount: 0, likeCount: 0 }));
      }

      const response = await axios.get(`${this.baseURL}/videos`, {
        params: {
          id: videoIds.join(','),
          part: 'statistics',
          key: this.apiKey
        }
      });

      return response.data.items.map(item => ({
        id: item.id,
        viewCount: parseInt(item.statistics.viewCount) || 0,
        likeCount: parseInt(item.statistics.likeCount) || 0,
        commentCount: parseInt(item.statistics.commentCount) || 0
      }));
    } catch (error) {
      logger.error('Erro ao obter estatísticas dos vídeos:', error);
      return videoIds.map(id => ({ id, viewCount: 0, likeCount: 0 }));
    }
  }

  // Verificar quota da API
  async checkAPIQuota() {
    try {
      if (!this.apiKey) {
        return { available: false, reason: 'API key not configured' };
      }

      // Fazer uma requisição simples para verificar quota
      await axios.get(`${this.baseURL}/videos`, {
        params: {
          id: 'dQw4w9WgXcQ', // Rick Roll - vídeo que sempre existe
          part: 'snippet',
          key: this.apiKey
        }
      });

      return { available: true };
    } catch (error) {
      if (error.response?.status === 403) {
        return { available: false, reason: 'Quota exceeded' };
      }
      return { available: false, reason: error.message };
    }
  }
}

module.exports = new YouTubeService();