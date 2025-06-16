const express = require('express');
const VideoController = require('../controllers/videoController');
const { 
  auth, 
  optionalAuth,
  requireAdmin,
  requireOwnershipOrAdmin,
  logUserAction 
} = require('../middleware/auth');
const { 
  validateVideo,
  validateParamId,
  sanitizeInput 
} = require('../middleware/validation');

const router = express.Router();

// Rotas públicas (sem autenticação obrigatória)
router.get('/public', 
  optionalAuth,
  VideoController.getPublicVideos
);

router.get('/most-viewed', 
  optionalAuth,
  VideoController.getMostViewedVideos
);

router.get('/recent', 
  optionalAuth,
  VideoController.getRecentVideos
);

router.get('/categories', 
  optionalAuth,
  VideoController.getCategories
);

router.get('/category/:category', 
  optionalAuth,
  VideoController.getVideosByCategory
);

// Aplicar autenticação para rotas protegidas
router.use(auth);

// Rotas gerais (autenticadas)
router.get('/', VideoController.getVideos);
router.get('/statistics', requireAdmin, VideoController.getVideoStatistics);

// Rotas específicas por ID
router.get('/:id', 
  validateParamId('id'),
  VideoController.getVideoById
);

router.get('/:id/related', 
  validateParamId('id'),
  VideoController.getRelatedVideos
);

router.put('/:id/view', 
  validateParamId('id'),
  logUserAction('view_video'),
  VideoController.incrementViews
);

router.put('/:id', 
  validateParamId('id'),
  requireAdmin,
  requireOwnershipOrAdmin,
  sanitizeInput,
  validateVideo,
  logUserAction('update_video'),
  VideoController.updateVideo
);

router.delete('/:id', 
  validateParamId('id'),
  requireAdmin,
  requireOwnershipOrAdmin,
  logUserAction('delete_video'),
  VideoController.deleteVideo
);

// Ações específicas de vídeos
router.put('/:id/verify', 
  validateParamId('id'),
  requireAdmin,
  logUserAction('verify_video'),
  VideoController.verifyVideo
);

router.put('/:id/update-info', 
  validateParamId('id'),
  requireAdmin,
  logUserAction('update_video_info'),
  VideoController.updateVideoInfo
);

// Criar novo vídeo
router.post('/', 
  requireAdmin,
  sanitizeInput,
  validateVideo,
  logUserAction('create_video'),
  VideoController.createVideo
);

module.exports = router;