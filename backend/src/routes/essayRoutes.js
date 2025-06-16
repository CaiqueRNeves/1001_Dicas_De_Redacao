const express = require('express');
const EssayController = require('../controllers/essayController');
const { 
  auth, 
  requireAdmin, 
  requireActiveSubscription,
  checkEssayLimit,
  logUserAction 
} = require('../middleware/auth');
const { 
  validateEssay,
  validateEssayCorrection,
  validateParamId,
  sanitizeInput 
} = require('../middleware/validation');
const { essayUpload, handleUploadError } = require('../config/multer');

const router = express.Router();

// Aplicar autenticação para todas as rotas
router.use(auth);

// Rotas públicas (autenticadas)
router.get('/', EssayController.getEssays);
router.get('/my-essays', EssayController.getMyEssays);
router.get('/statistics', EssayController.getEssayStatistics);
router.get('/by-period', EssayController.getEssaysByPeriod);
router.get('/check-limit', EssayController.checkSubmissionLimit);

// Rotas por ID
router.get('/:id', validateParamId('id'), EssayController.getEssayById);
router.put('/:id', 
  validateParamId('id'),
  sanitizeInput,
  validateEssay,
  logUserAction('update_essay'),
  EssayController.updateEssay
);
router.delete('/:id', validateParamId('id'), logUserAction('delete_essay'), EssayController.deleteEssay);

// Rotas de download
router.get('/:id/download', validateParamId('id'), EssayController.downloadEssayFile);
router.get('/:id/download-corrected', validateParamId('id'), EssayController.downloadCorrectedEssay);

// Rotas de upload
router.post('/', 
  requireActiveSubscription,
  checkEssayLimit,
  essayUpload.single('essay'),
  handleUploadError,
  sanitizeInput,
  validateEssay,
  logUserAction('create_essay'),
  EssayController.createEssay
);

router.put('/:id/upload', 
  validateParamId('id'),
  essayUpload.single('essay'),
  handleUploadError,
  logUserAction('upload_essay_file'),
  EssayController.uploadEssayFile
);

// Rotas administrativas
router.get('/pending/list', requireAdmin, EssayController.getPendingEssays);
router.get('/user/:userId', validateParamId('userId'), requireAdmin, EssayController.getEssaysByUser);
router.get('/theme/:theme', EssayController.getEssaysByTheme);

router.put('/:id/start-correction', 
  validateParamId('id'),
  requireAdmin,
  logUserAction('start_essay_correction'),
  EssayController.startCorrection
);

router.put('/:id/correct', 
  validateParamId('id'),
  requireAdmin,
  essayUpload.single('corrected_essay'),
  handleUploadError,
  sanitizeInput,
  validateEssayCorrection,
  logUserAction('correct_essay'),
  EssayController.correctEssay
);

router.put('/:id/return', 
  validateParamId('id'),
  requireAdmin,
  logUserAction('return_essay'),
  EssayController.returnEssay
);

router.put('/:id/upload-corrected', 
  validateParamId('id'),
  requireAdmin,
  essayUpload.single('corrected_essay'),
  handleUploadError,
  logUserAction('upload_corrected_essay'),
  EssayController.uploadCorrectedFile
);

module.exports = router;