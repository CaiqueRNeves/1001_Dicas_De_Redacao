const express = require('express');
const MaterialController = require('../controllers/materialController');
const { 
  auth, 
  optionalAuth,
  requireAdmin,
  logUserAction 
} = require('../middleware/auth');
const { 
  validateMaterial,
  validateParamId,
  validateFileUpload,
  sanitizeInput 
} = require('../middleware/validation');
const { materialUpload, handleUploadError } = require('../config/multer');

const router = express.Router();

// Rotas públicas (sem autenticação obrigatória)
router.get('/free', 
  optionalAuth,
  MaterialController.getFreeMetarials
);

router.get('/categories', 
  optionalAuth,
  MaterialController.getCategories
);

router.get('/most-downloaded', 
  optionalAuth,
  MaterialController.getMostDownloaded
);

// Aplicar autenticação para rotas protegidas
router.use(auth);

// Rotas gerais (autenticadas)
router.get('/', MaterialController.getMaterials);
router.get('/statistics', MaterialController.getMaterialStatistics);
router.get('/category/:category', MaterialController.getMaterialsByCategory);

// Rotas específicas por ID
router.get('/:id', 
  validateParamId('id'),
  MaterialController.getMaterialById
);

router.get('/:id/download', 
  validateParamId('id'),
  logUserAction('download_material'),
  MaterialController.downloadMaterial
);

router.get('/:id/related', 
  validateParamId('id'),
  MaterialController.getRelatedMaterials
);

// Rotas administrativas
router.post('/', 
  requireAdmin,
  materialUpload.single('material'),
  handleUploadError,
  sanitizeInput,
  validateMaterial,
  logUserAction('create_material'),
  MaterialController.createMaterial
);

router.put('/:id', 
  validateParamId('id'),
  requireAdmin,
  sanitizeInput,
  validateMaterial,
  logUserAction('update_material'),
  MaterialController.updateMaterial
);

router.delete('/:id', 
  validateParamId('id'),
  requireAdmin,
  logUserAction('delete_material'),
  MaterialController.deleteMaterial
);

router.put('/:id/upload', 
  validateParamId('id'),
  requireAdmin,
  materialUpload.single('material'),
  handleUploadError,
  logUserAction('upload_material_file'),
  MaterialController.uploadMaterialFile
);

module.exports = router;