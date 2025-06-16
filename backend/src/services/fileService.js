const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

class FileService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../../uploads');
    this.allowedTypes = {
      essays: ['.pdf', '.doc', '.docx', '.txt'],
      materials: ['.pdf'],
      images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf']
    };
    this.maxSizes = {
      essays: 10 * 1024 * 1024, // 10MB
      materials: 50 * 1024 * 1024, // 50MB
      images: 5 * 1024 * 1024, // 5MB
      documents: 20 * 1024 * 1024 // 20MB
    };
  }

  // Garantir que o diretório existe
  async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      await fs.mkdir(dirPath, { recursive: true });
      logger.info(`Diretório criado: ${dirPath}`);
    }
  }

  // Gerar nome único para arquivo
  generateUniqueFileName(originalName, prefix = '') {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    
    return `${prefix}${timestamp}_${randomString}_${baseName}${extension}`;
  }

  // Validar arquivo
  validateFile(file, type = 'documents') {
    const errors = [];
    
    if (!file) {
      errors.push('Arquivo é obrigatório');
      return { valid: false, errors };
    }

    // Verificar extensão
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = this.allowedTypes[type] || this.allowedTypes.documents;
    
    if (!allowedExtensions.includes(extension)) {
      errors.push(`Tipo de arquivo não permitido. Tipos aceitos: ${allowedExtensions.join(', ')}`);
    }

    // Verificar tamanho
    const maxSize = this.maxSizes[type] || this.maxSizes.documents;
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      errors.push(`Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Salvar arquivo
  async saveFile(file, type = 'documents', customName = null) {
    try {
      const validation = this.validateFile(file, type);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      const typeDir = path.join(this.uploadsDir, type);
      await this.ensureDirectory(typeDir);

      const fileName = customName || this.generateUniqueFileName(file.originalname);
      const filePath = path.join(typeDir, fileName);

      // Se o arquivo já vem do multer, usar fs.rename
      if (file.path) {
        await fs.rename(file.path, filePath);
      } else {
        // Se é buffer, escrever diretamente
        await fs.writeFile(filePath, file.buffer);
      }

      const fileInfo = {
        originalName: file.originalname,
        fileName,
        filePath,
        relativePath: path.join(type, fileName),
        size: file.size,
        mimeType: file.mimetype,
        extension: path.extname(file.originalname),
        uploadDate: new Date().toISOString()
      };

      logger.info(`Arquivo salvo: ${fileName} (${this.formatFileSize(file.size)})`);
      return fileInfo;
    } catch (error) {
      logger.error('Erro ao salvar arquivo:', error);
      throw error;
    }
  }

  // Deletar arquivo
  async deleteFile(filePath) {
    try {
      // Verificar se é caminho absoluto ou relativo
      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(this.uploadsDir, filePath);

      await fs.unlink(absolutePath);
      logger.info(`Arquivo deletado: ${filePath}`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn(`Arquivo não encontrado para deletar: ${filePath}`);
        return false;
      }
      logger.error(`Erro ao deletar arquivo ${filePath}:`, error);
      throw error;
    }
  }

  // Mover arquivo
  async moveFile(sourcePath, destinationPath) {
    try {
      const absoluteSource = path.isAbsolute(sourcePath) 
        ? sourcePath 
        : path.join(this.uploadsDir, sourcePath);
      
      const absoluteDestination = path.isAbsolute(destinationPath) 
        ? destinationPath 
        : path.join(this.uploadsDir, destinationPath);

      await this.ensureDirectory(path.dirname(absoluteDestination));
      await fs.rename(absoluteSource, absoluteDestination);
      
      logger.info(`Arquivo movido: ${sourcePath} -> ${destinationPath}`);
      return true;
    } catch (error) {
      logger.error(`Erro ao mover arquivo ${sourcePath}:`, error);
      throw error;
    }
  }

  // Copiar arquivo
  async copyFile(sourcePath, destinationPath) {
    try {
      const absoluteSource = path.isAbsolute(sourcePath) 
        ? sourcePath 
        : path.join(this.uploadsDir, sourcePath);
      
      const absoluteDestination = path.isAbsolute(destinationPath) 
        ? destinationPath 
        : path.join(this.uploadsDir, destinationPath);

      await this.ensureDirectory(path.dirname(absoluteDestination));
      await fs.copyFile(absoluteSource, absoluteDestination);
      
      logger.info(`Arquivo copiado: ${sourcePath} -> ${destinationPath}`);
      return true;
    } catch (error) {
      logger.error(`Erro ao copiar arquivo ${sourcePath}:`, error);
      throw error;
    }
  }

  // Obter informações do arquivo
  async getFileInfo(filePath) {
    try {
      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(this.uploadsDir, filePath);

      const stats = await fs.stat(absolutePath);
      const extension = path.extname(filePath);
      
      return {
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        created: stats.birthtime,
        modified: stats.mtime,
        extension,
        name: path.basename(filePath),
        exists: true
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { exists: false };
      }
      logger.error(`Erro ao obter informações do arquivo ${filePath}:`, error);
      throw error;
    }
  }

  // Verificar se arquivo existe
  async fileExists(filePath) {
    try {
      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(this.uploadsDir, filePath);
      
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  // Ler arquivo
  async readFile(filePath, encoding = null) {
    try {
      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(this.uploadsDir, filePath);
      
      return await fs.readFile(absolutePath, encoding);
    } catch (error) {
      logger.error(`Erro ao ler arquivo ${filePath}:`, error);
      throw error;
    }
  }

  // Listar arquivos em diretório
  async listFiles(directory, type = null) {
    try {
      const dirPath = path.join(this.uploadsDir, directory);
      await this.ensureDirectory(dirPath);
      
      const files = await fs.readdir(dirPath);
      const fileInfos = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(dirPath, file);
          const stats = await fs.stat(filePath);
          
          if (stats.isFile()) {
            const extension = path.extname(file);
            
            // Filtrar por tipo se especificado
            if (type && this.allowedTypes[type]) {
              if (!this.allowedTypes[type].includes(extension)) {
                return null;
              }
            }
            
            return {
              name: file,
              path: path.join(directory, file),
              size: stats.size,
              sizeFormatted: this.formatFileSize(stats.size),
              extension,
              created: stats.birthtime,
              modified: stats.mtime
            };
          }
          return null;
        })
      );

      return fileInfos.filter(Boolean);
    } catch (error) {
      logger.error(`Erro ao listar arquivos em ${directory}:`, error);
      throw error;
    }
  }

  // Limpar arquivos antigos
  async cleanupOldFiles(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 dias
    try {
      const types = Object.keys(this.allowedTypes);
      let totalDeleted = 0;

      for (const type of types) {
        const typeDir = path.join(this.uploadsDir, type);
        
        try {
          const files = await this.listFiles(type);
          const now = Date.now();

          for (const file of files) {
            const fileAge = now - new Date(file.modified).getTime();
            
            if (fileAge > maxAge) {
              await this.deleteFile(file.path);
              totalDeleted++;
            }
          }
        } catch (error) {
          logger.error(`Erro ao limpar arquivos em ${type}:`, error);
        }
      }

      logger.info(`Limpeza concluída: ${totalDeleted} arquivos removidos`);
      return totalDeleted;
    } catch (error) {
      logger.error('Erro na limpeza de arquivos:', error);
      throw error;
    }
  }

  // Obter estatísticas de uso de disco
  async getStorageStats() {
    try {
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        byType: {}
      };

      const types = Object.keys(this.allowedTypes);

      for (const type of types) {
        const files = await this.listFiles(type);
        const typeSize = files.reduce((sum, file) => sum + file.size, 0);
        
        stats.byType[type] = {
          count: files.length,
          size: typeSize,
          sizeFormatted: this.formatFileSize(typeSize)
        };
        
        stats.totalFiles += files.length;
        stats.totalSize += typeSize;
      }

      stats.totalSizeFormatted = this.formatFileSize(stats.totalSize);
      
      return stats;
    } catch (error) {
      logger.error('Erro ao obter estatísticas de armazenamento:', error);
      throw error;
    }
  }

  // Criar backup de arquivo
  async backupFile(filePath, backupDir = 'backups') {
    try {
      const backupPath = path.join(backupDir, `backup_${Date.now()}_${path.basename(filePath)}`);
      await this.copyFile(filePath, backupPath);
      
      logger.info(`Backup criado: ${filePath} -> ${backupPath}`);
      return backupPath;
    } catch (error) {
      logger.error(`Erro ao criar backup de ${filePath}:`, error);
      throw error;
    }
  }

  // Verificar integridade do arquivo (hash)
  async getFileHash(filePath, algorithm = 'md5') {
    try {
      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(this.uploadsDir, filePath);
      
      const fileBuffer = await fs.readFile(absolutePath);
      const hash = crypto.createHash(algorithm);
      hash.update(fileBuffer);
      
      return hash.digest('hex');
    } catch (error) {
      logger.error(`Erro ao calcular hash de ${filePath}:`, error);
      throw error;
    }
  }

  // Formatar tamanho de arquivo
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Obter tipo MIME por extensão
  getMimeType(extension) {
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.rtf': 'application/rtf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  // Validar múltiplos arquivos
  validateMultipleFiles(files, type = 'documents', maxFiles = 5) {
    const errors = [];
    
    if (!Array.isArray(files)) {
      files = [files];
    }
    
    if (files.length > maxFiles) {
      errors.push(`Máximo de ${maxFiles} arquivos permitidos`);
      return { valid: false, errors };
    }
    
    for (let i = 0; i < files.length; i++) {
      const validation = this.validateFile(files[i], type);
      if (!validation.valid) {
        errors.push(`Arquivo ${i + 1}: ${validation.errors.join(', ')}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Salvar múltiplos arquivos
  async saveMultipleFiles(files, type = 'documents') {
    try {
      if (!Array.isArray(files)) {
        files = [files];
      }
      
      const validation = this.validateMultipleFiles(files, type);
      if (!validation.valid) {
        throw new Error(validation.errors.join('; '));
      }
      
      const savedFiles = [];
      
      for (const file of files) {
        const fileInfo = await this.saveFile(file, type);
        savedFiles.push(fileInfo);
      }
      
      logger.info(`${savedFiles.length} arquivos salvos com sucesso`);
      return savedFiles;
    } catch (error) {
      logger.error('Erro ao salvar múltiplos arquivos:', error);
      throw error;
    }
  }

  // Compactar arquivos (ZIP)
  async createZip(files, zipName) {
    try {
      const archiver = require('archiver');
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });
      
      const zipPath = path.join(this.uploadsDir, 'temp', zipName);
      await this.ensureDirectory(path.dirname(zipPath));
      
      const output = require('fs').createWriteStream(zipPath);
      archive.pipe(output);
      
      for (const file of files) {
        const absolutePath = path.isAbsolute(file.path) 
          ? file.path 
          : path.join(this.uploadsDir, file.path);
        
        archive.file(absolutePath, { name: file.name || path.basename(file.path) });
      }
      
      await archive.finalize();
      
      return new Promise((resolve, reject) => {
        output.on('close', () => {
          logger.info(`ZIP criado: ${zipName} (${this.formatFileSize(archive.pointer())})`);
          resolve(zipPath);
        });
        
        archive.on('error', reject);
      });
    } catch (error) {
      logger.error('Erro ao criar ZIP:', error);
      throw error;
    }
  }
}

// Singleton instance
const fileService = new FileService();

module.exports = fileService;