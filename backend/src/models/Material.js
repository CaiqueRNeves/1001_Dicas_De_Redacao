const { query, queryOne, run } = require('../config/database');
const logger = require('../utils/logger');

class Material {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.file_path = data.file_path;
    this.file_size = data.file_size;
    this.category = data.category;
    this.is_free = data.is_free;
    this.download_count = data.download_count || 0;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Criar novo material
  static async create(materialData) {
    try {
      const { 
        title, 
        description, 
        file_path, 
        file_size, 
        category, 
        is_free = true, 
        created_by 
      } = materialData;

      const result = await run(
        `INSERT INTO materials (
          title, description, file_path, file_size, category, 
          is_free, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [title, description, file_path, file_size, category, is_free, created_by]
      );

      const newMaterial = await Material.findById(result.lastID);
      logger.info(`Material criado: ID ${result.lastID}, Título: ${title}`);
      
      return newMaterial;
    } catch (error) {
      logger.error('Erro ao criar material:', error);
      throw error;
    }
  }

  // Buscar material por ID
  static async findById(id) {
    try {
      const materialData = await queryOne(
        `SELECT m.*, u.name as creator_name, u.email as creator_email 
         FROM materials m 
         LEFT JOIN users u ON m.created_by = u.id 
         WHERE m.id = ?`,
        [id]
      );
      return materialData ? new Material(materialData) : null;
    } catch (error) {
      logger.error('Erro ao buscar material por ID:', error);
      throw error;
    }
  }

  // Listar materiais com filtros
  static async findAll(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        category, 
        is_free, 
        search,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options;
      
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      let params = [];

      if (category) {
        whereClause += ' AND m.category = ?';
        params.push(category);
      }

      if (is_free !== undefined) {
        whereClause += ' AND m.is_free = ?';
        params.push(is_free);
      }

      if (search) {
        whereClause += ' AND (m.title LIKE ? OR m.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      const materials = await query(
        `SELECT m.*, u.name as creator_name, u.email as creator_email
         FROM materials m 
         LEFT JOIN users u ON m.created_by = u.id
         ${whereClause}
         ORDER BY m.${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const totalResult = await queryOne(
        `SELECT COUNT(*) as total FROM materials m ${whereClause}`,
        params
      );

      return {
        materials: materials.map(data => new Material(data)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResult.total,
          totalPages: Math.ceil(totalResult.total / limit)
        }
      };
    } catch (error) {
      logger.error('Erro ao listar materiais:', error);
      throw error;
    }
  }

  // Buscar materiais gratuitos
  static async findFree(options = {}) {
    try {
      return await Material.findAll({ ...options, is_free: true });
    } catch (error) {
      logger.error('Erro ao buscar materiais gratuitos:', error);
      throw error;
    }
  }

  // Buscar materiais por categoria
  static async findByCategory(category, options = {}) {
    try {
      return await Material.findAll({ ...options, category });
    } catch (error) {
      logger.error('Erro ao buscar materiais por categoria:', error);
      throw error;
    }
  }

  // Buscar materiais mais baixados
  static async findMostDownloaded(limit = 10) {
    try {
      const materials = await query(
        `SELECT m.*, u.name as creator_name
         FROM materials m 
         LEFT JOIN users u ON m.created_by = u.id
         WHERE m.is_free = 1
         ORDER BY m.download_count DESC
         LIMIT ?`,
        [limit]
      );

      return materials.map(data => new Material(data));
    } catch (error) {
      logger.error('Erro ao buscar materiais mais baixados:', error);
      throw error;
    }
  }

  // Atualizar material
  async update(updateData) {
    try {
      const allowedFields = [
        'title', 'description', 'category', 'is_free'
      ];
      const updateFields = [];
      const params = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key} = ?`);
          params.push(value);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('Nenhum campo válido para atualizar');
      }

      updateFields.push('updated_at = datetime(\'now\')');
      params.push(this.id);

      await run(
        `UPDATE materials SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      // Atualizar instância atual
      Object.assign(this, updateData);
      this.updated_at = new Date().toISOString();

      logger.info(`Material atualizado: ID ${this.id}`);
      return this;
    } catch (error) {
      logger.error('Erro ao atualizar material:', error);
      throw error;
    }
  }

  // Incrementar contador de downloads
  async incrementDownloadCount() {
    try {
      await run(
        'UPDATE materials SET download_count = download_count + 1 WHERE id = ?',
        [this.id]
      );
      
      this.download_count = (this.download_count || 0) + 1;
      
      logger.info(`Download registrado: Material ID ${this.id}, Total: ${this.download_count}`);
      return this.download_count;
    } catch (error) {
      logger.error('Erro ao incrementar contador de downloads:', error);
      throw error;
    }
  }

  // Deletar material
  async delete() {
    try {
      // Deletar arquivo físico se existir
      if (this.file_path) {
        const { deleteFile } = require('../config/multer');
        await deleteFile(this.file_path);
      }

      await run('DELETE FROM materials WHERE id = ?', [this.id]);
      logger.info(`Material deletado: ID ${this.id}`);
      return true;
    } catch (error) {
      logger.error('Erro ao deletar material:', error);
      throw error;
    }
  }

  // Verificar se arquivo existe
  async hasFile() {
    const fs = require('fs').promises;
    try {
      if (!this.file_path) return false;
      await fs.access(this.file_path);
      return true;
    } catch {
      return false;
    }
  }

  // Obter informações do arquivo
  async getFileInfo() {
    try {
      if (!this.file_path) return null;
      
      const { getFileInfo } = require('../config/multer');
      return await getFileInfo(this.file_path);
    } catch (error) {
      logger.error('Erro ao obter informações do arquivo:', error);
      return null;
    }
  }

  // Obter URL de download
  getDownloadUrl() {
    return this.file_path ? `/api/materials/${this.id}/download` : null;
  }

  // Obter estatísticas de materiais
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

      const [total, free, premium] = await Promise.all([
        queryOne(`SELECT COUNT(*) as count FROM materials ${whereClause}`, params),
        queryOne(`SELECT COUNT(*) as count FROM materials ${whereClause} AND is_free = 1`, params),
        queryOne(`SELECT COUNT(*) as count FROM materials ${whereClause} AND is_free = 0`, params)
      ]);

      const byCategory = await query(
        `SELECT category, COUNT(*) as count 
         FROM materials ${whereClause} 
         GROUP BY category`,
        params
      );

      const totalDownloads = await queryOne(
        `SELECT SUM(download_count) as total FROM materials ${whereClause}`,
        params
      );

      const topDownloaded = await query(
        `SELECT title, download_count 
         FROM materials ${whereClause} 
         ORDER BY download_count DESC 
         LIMIT 5`,
        params
      );

      return {
        total: total.count,
        free: free.count,
        premium: premium.count,
        byCategory: byCategory.reduce((acc, item) => {
          acc[item.category || 'Sem categoria'] = item.count;
          return acc;
        }, {}),
        totalDownloads: totalDownloads.total || 0,
        topDownloaded
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas de materiais:', error);
      throw error;
    }
  }

  // Obter categorias disponíveis
  static async getCategories() {
    try {
      const categories = await query(
        'SELECT DISTINCT category FROM materials WHERE category IS NOT NULL ORDER BY category'
      );
      
      return categories.map(row => row.category);
    } catch (error) {
      logger.error('Erro ao obter categorias:', error);
      throw error;
    }
  }

  // Buscar materiais relacionados
  async getRelatedMaterials(limit = 5) {
    try {
      const related = await query(
        `SELECT m.*, u.name as creator_name
         FROM materials m 
         LEFT JOIN users u ON m.created_by = u.id
         WHERE m.category = ? AND m.id != ? AND m.is_free = 1
         ORDER BY m.download_count DESC
         LIMIT ?`,
        [this.category, this.id, limit]
      );

      return related.map(data => new Material(data));
    } catch (error) {
      logger.error('Erro ao buscar materiais relacionados:', error);
      return [];
    }
  }

  // Validar formato do arquivo
  static validateFileFormat(fileName) {
    const allowedExtensions = ['.pdf'];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    return allowedExtensions.includes(extension);
  }

  // Gerar nome único para arquivo
  static generateUniqueFileName(originalName) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2);
    const extension = originalName.substring(originalName.lastIndexOf('.'));
    const baseName = originalName
      .substring(0, originalName.lastIndexOf('.'))
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    
    return `${timestamp}_${randomString}_${baseName}${extension}`;
  }

  // Converter tamanho de arquivo para formato legível
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Converter para JSON
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      file_path: this.file_path,
      file_size: this.file_size,
      file_size_formatted: Material.formatFileSize(this.file_size || 0),
      category: this.category,
      is_free: this.is_free,
      download_count: this.download_count,
      created_by: this.created_by,
      created_at: this.created_at,
      updated_at: this.updated_at,
      creator_name: this.creator_name,
      creator_email: this.creator_email,
      download_url: this.getDownloadUrl(),
      has_file: this.file_path ? true : false
    };
  }
}

module.exports = Material;