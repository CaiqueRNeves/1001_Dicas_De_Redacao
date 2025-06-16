const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const logger = require('../utils/logger');

// Tipos de arquivo permitidos
const ALLOWED_FILE_TYPES = {
  essays: ['.pdf', '.doc', '.docx', '.txt'],
  materials: ['.pdf'],
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf']
};

// Tamanhos máximos (em bytes)
const MAX_FILE_SIZES = {
  essays: 10 * 1024 * 1024, // 10MB
  materials: 50 * 1024 * 1024, // 50MB
  images: 5 * 1024 * 1024, // 5MB
  documents: 20 * 1024 * 1024 // 20MB
};

// Garantir que os diretórios existem
const ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

// Gerar nome único para arquivo
const generateUniqueFileName = (originalName) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalName);
  const baseName = path.basename(originalName, extension)
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 50);
  
  return `${timestamp}_${randomString}_${baseName}${extension}`;
};

// Configuração de storage para diferentes tipos
const createStorage = (uploadType) => {
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        const uploadDir = path.join(__dirname, '../../uploads', uploadType);
        await ensureDirectoryExists(uploadDir);
        cb(null, uploadDir);
      } catch (error) {
        logger.error(`Erro ao criar diretório ${uploadType}:`, error);
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      try {
        const uniqueName = generateUniqueFileName(file.originalname);
        cb(null, uniqueName);
      } catch (error) {
        logger.error('Erro ao gerar nome do arquivo:', error);
        cb(error);
      }
    }
  });
};

// Filtro de arquivos
const createFileFilter = (allowedTypes) => {
  return (req, file, cb) => {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      const error = new Error(`Tipo de arquivo não permitido: ${fileExtension}`);
      error.code = 'INVALID_FILE_TYPE';
      cb(error, false);
    }
  };
};

// Configurações específicas para cada tipo de upload

// Upload de redações
const essayUpload = multer({
  storage: createStorage('essays'),
  fileFilter: createFileFilter(ALLOWED_FILE_TYPES.essays),
  limits: {
    fileSize: MAX_FILE_SIZES.essays,
    files: 1
  }
});

// Upload de materiais
const materialUpload = multer({
  storage: createStorage('materials'),
  fileFilter: createFileFilter(ALLOWED_FILE_TYPES.materials),
  limits: {
    fileSize: MAX_FILE_SIZES.materials,
    files: 1
  }
});

// Upload de imagens
const imageUpload = multer({
  storage: createStorage('images'),
  fileFilter: createFileFilter(ALLOWED_FILE_TYPES.images),
  limits: {
    fileSize: MAX_FILE_SIZES.images,
    files: 5 // até 5 imagens por vez
  }
});

// Upload de documentos gerais
const documentUpload = multer({
  storage: createStorage('documents'),
  fileFilter: createFileFilter(ALLOWED_FILE_TYPES.documents),
  limits: {
    fileSize: MAX_FILE_SIZES.documents,
    files: 3
  }
});

// Upload múltiplo para carrossel
const carouselUpload = multer({
  storage: createStorage('carousel'),
  fileFilter: createFileFilter(ALLOWED_FILE_TYPES.images),
  limits: {
    fileSize: MAX_FILE_SIZES.images,
    files: 10
  }
});

// Middleware para tratamento de erros de upload
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = 'Erro no upload do arquivo';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'Arquivo muito grande';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Muitos arquivos enviados';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Campo de arquivo inesperado';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Muitas partes no upload';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Nome do campo muito longo';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Valor do campo muito longo';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Muitos campos';
        break;
    }
    
    logger.error('Erro Multer:', error);
    return res.status(400).json({
      success: false,
      message,
      code: error.code
    });
  }
  
  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// Função para deletar arquivo
const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    logger.info(`Arquivo deletado: ${filePath}`);
    return true;
  } catch (error) {
    logger.error(`Erro ao deletar arquivo ${filePath}:`, error);
    return false;
  }
};

// Função para mover arquivo
const moveFile = async (sourcePath, destinationPath) => {
  try {
    await ensureDirectoryExists(path.dirname(destinationPath));
    await fs.rename(sourcePath, destinationPath);
    logger.info(`Arquivo movido: ${sourcePath} -> ${destinationPath}`);
    return true;
  } catch (error) {
    logger.error(`Erro ao mover arquivo ${sourcePath}:`, error);
    return false;
  }
};

// Função para obter informações do arquivo
const getFileInfo = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      extension: path.extname(filePath),
      name: path.basename(filePath)
    };
  } catch (error) {
    logger.error(`Erro ao obter informações do arquivo ${filePath}:`, error);
    return null;
  }
};

// Middleware para validar proprietário do arquivo
const validateFileOwnership = (userIdField = 'user_id') => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const fileId = req.params.id;
      
      // Implementar validação específica baseada no modelo
      // Este é um exemplo genérico
      const { queryOne } = require('./database');
      const file = await queryOne(
        `SELECT ${userIdField} FROM files WHERE id = ?`,
        [fileId]
      );
      
      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'Arquivo não encontrado'
        });
      }
      
      if (file[userIdField] !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para acessar este arquivo'
        });
      }
      
      next();
    } catch (error) {
      logger.error('Erro na validação de propriedade do arquivo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };
};

// Limpar uploads temporários antigos
const cleanupOldUploads = async (maxAge = 24 * 60 * 60 * 1000) => {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads');
    const directories = ['essays', 'materials', 'images', 'documents', 'carousel'];
    
    for (const dir of directories) {
      const dirPath = path.join(uploadsDir, dir);
      
      try {
        const files = await fs.readdir(dirPath);
        const now = Date.now();
        
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > maxAge) {
            await deleteFile(filePath);
          }
        }
      } catch (error) {
        logger.error(`Erro ao limpar diretório ${dir}:`, error);
      }
    }
  } catch (error) {
    logger.error('Erro na limpeza de uploads antigos:', error);
  }
};

module.exports = {
  essayUpload,
  materialUpload,
  imageUpload,
  documentUpload,
  carouselUpload,
  handleUploadError,
  deleteFile,
  moveFile,
  getFileInfo,
  validateFileOwnership,
  cleanupOldUploads,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZES,
  generateUniqueFileName
};