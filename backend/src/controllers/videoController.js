const Video = require('../models/Video');
const logger = require('../utils/logger');

class VideoController {
  // Criar novo vídeo
  static async createVideo(req, res) {
    try {
      const { title, description, youtube_url, category } = req.body;

      const videoData = {
        title: title.trim(),
        description: description?.trim(),
        youtube_url: youtube_url.trim(),
        category: category?.trim(),
        created_by: req.user.id
      };

      const video = await Video.create(videoData);

      logger.info(`Vídeo criado: ID ${video.id}, YouTube ID: ${video.youtube_id}`);

      res.status(201).json({
        success: true,
        message: 'Vídeo criado com sucesso',
        data: video.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao criar vídeo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Listar vídeos
  static async getVideos(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        category, 
        search,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        category,
        search,
        sortBy,
        sortOrder
      };

      const result = await Video.findAll(options);

      res.json({
        success: true,
        data: result.videos.map(video => video.toJSON()),
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro ao listar vídeos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Incrementar visualizações
  static async incrementViews(req, res) {
    try {
      const { id } = req.params;
      const video = await Video.findById(id);

      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Vídeo não encontrado'
        });
      }

      await video.incrementViews();

      res.json({
        success: true,
        message: 'Visualização registrada',
        data: { views: video.views }
      });

    } catch (error) {
      logger.error('Erro ao incrementar visualizações:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Outros métodos do VideoController...
}

module.exports = VideoController;