const express = require('express');
const PostController = require('../controllers/postController');
const { 
  auth, 
  optionalAuth,
  requireAdmin,
  requireOwnershipOrAdmin,
  logUserAction 
} = require('../middleware/auth');
const { 
  validatePost,
  validateParamId,
  sanitizeInput 
} = require('../middleware/validation');
const { imageUpload, handleUploadError } = require('../config/multer');

const router = express.Router();

// Rotas públicas (sem autenticação obrigatória)
router.get('/published', 
  optionalAuth,
  PostController.getPublishedPosts
);

router.get('/category/:category', 
  optionalAuth,
  PostController.getPostsByCategory
);

router.get('/most-viewed', 
  optionalAuth,
  PostController.getMostViewedPosts
);

router.get('/recent', 
  optionalAuth,
  PostController.getRecentPosts
);

router.get('/categories', 
  optionalAuth,
  PostController.getCategories
);

router.get('/tags', 
  optionalAuth,
  PostController.getAllTags
);

router.get('/slug/:slug', 
  optionalAuth,
  PostController.getPostBySlug
);

// Aplicar autenticação para rotas administrativas
router.use(auth);

// Rotas gerais (autenticadas)
router.get('/', 
  requireAdmin,
  PostController.getPosts
);

router.get('/statistics', 
  requireAdmin,
  PostController.getPostStatistics
);

// Upload de imagens para posts
router.post('/upload-image', 
  requireAdmin,
  imageUpload.single('image'),
  handleUploadError,
  logUserAction('upload_post_image'),
  PostController.uploadImage
);

// Rotas específicas por ID
router.get('/:id', 
  validateParamId('id'),
  requireAdmin,
  PostController.getPostById
);

router.put('/:id', 
  validateParamId('id'),
  requireAdmin,
  imageUpload.single('featured_image'),
  handleUploadError,
  sanitizeInput,
  validatePost,
  requireOwnershipOrAdmin,
  logUserAction('update_post'),
  PostController.updatePost
);

router.delete('/:id', 
  validateParamId('id'),
  requireAdmin,
  requireOwnershipOrAdmin,
  logUserAction('delete_post'),
  PostController.deletePost
);

// Ações específicas de posts
router.put('/:id/publish', 
  validateParamId('id'),
  requireAdmin,
  requireOwnershipOrAdmin,
  logUserAction('publish_post'),
  PostController.publishPost
);

router.put('/:id/unpublish', 
  validateParamId('id'),
  requireAdmin,
  requireOwnershipOrAdmin,
  logUserAction('unpublish_post'),
  PostController.unpublishPost
);

router.put('/:id/archive', 
  validateParamId('id'),
  requireAdmin,
  requireOwnershipOrAdmin,
  logUserAction('archive_post'),
  PostController.archivePost
);

// Criar novo post
router.post('/', 
  requireAdmin,
  imageUpload.single('featured_image'),
  handleUploadError,
  sanitizeInput,
  validatePost,
  logUserAction('create_post'),
  PostController.createPost
);

module.exports = router;