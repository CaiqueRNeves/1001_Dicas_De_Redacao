const Material = require('../models/Material');
const { materialUpload } = require('../config/multer');
const logger = require('../utils/logger');

class MaterialController {
  // Criar novo material
  static async createMaterial(req, res) {
    try {
      const { title, description, category, is_free = true } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'Arquivo é obrigatório'
        });
      }

      const materialData = {
        title: title.trim(),
        description: description?.trim(),
        file_path: file.path,
        file_size: file.size,
        category: category?.trim(),
        is_free: Boolean(is_free),
        created_by: req.user.id
      };

      const material = await Material.create(materialData);

      logger.info(`Material criado: ID ${material.id}, Título: ${title}`);

      res.status(201).json({
        success: true,
        message: 'Material criado com sucesso',
        data: material.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao criar material:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Listar materiais
  static async getMaterials(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        category, 
        is_free,
        search,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        category,
        is_free: is_free === 'true' ? true : is_free === 'false' ? false : undefined,
        search,
        sortBy,
        sortOrder
      };

      const result = await Material.findAll(options);

      res.json({
        success: true,
        data: result.materials.map(material => material.toJSON()),
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro ao listar materiais:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter material por ID
  static async getMaterialById(req, res) {
    try {
      const { id } = req.params;
      const material = await Material.findById(id);

      if (!material) {
        return res.status(404).json({
          success: false,
          message: 'Material não encontrado'
        });
      }

      res.json({
        success: true,
        data: material.toJSON()
      });

    } catch (error) {
      logger.error('Erro ao obter material:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
// Download de material
  static async downloadMaterial(req, res) {
    try {
      const { id } = req.params;
      const material = await Material.findById(id);

      if (!material) {
        return res.status(404).json({
          success: false,
          message: 'Material não encontrado'
        });
      }

      if (!material.is_free && (!req.user || !req.user.hasActiveSubscription())) {
        return res.status(403).json({
          success: false,
          message: 'Assinatura ativa requerida para este material'
        });
      }

      if (!material.file_path || !(await material.hasFile())) {
        return res.status(404).json({
          success: false,
          message: 'Arquivo não encontrado'
        });
      }

      // Incrementar contador de downloads
      await material.incrementDownloadCount();

      const fileName = path.basename(material.file_path);
      res.download(material.file_path, `material_${material.id}_${fileName}`);

    } catch (error) {
      logger.error('Erro no download do material:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter materiais gratuitos
  static async getFreeMetarials(req, res) {
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
        data: result.materials.map(material => material.toJSON()),
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro ao obter materiais gratuitos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter categorias
  static async getCategories(req, res) {
    try {
      const categories = await Material.getCategories();

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

  // Obter mais baixados
  static async getMostDownloaded(req, res) {
    try {
      const { limit = 10 } = req.query;
      const materials = await Material.findMostDownloaded(parseInt(limit));

      res.json({
        success: true,
        data: materials.map(material => material.toJSON())
      });

    } catch (error) {
      logger.error('Erro ao obter materiais mais baixados:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Outros métodos... (updateMaterial, deleteMaterial, etc.)
}

module.exports = MaterialController;
