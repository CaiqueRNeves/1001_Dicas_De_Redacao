const express = require('express');
const UserController = require('../controllers/userController');
const { 
  auth, 
  requireAdmin, 
  requireOwnershipOrAdmin,
  logUserAction 
} = require('../middleware/auth');
const { 
  validateProfileUpdate,
  validateParamId,
  sanitizeInput 
} = require('../middleware/validation');
const { 
  handleDataAccess, 
  handleDataDeletion, 
  handleDataPortability 
} = require('../middleware/lgpd');

const router = express.Router();

// Aplicar autenticação para todas as rotas
router.use(auth);

// Rotas do usuário atual
router.get('/me', UserController.getUserStats);
router.get('/my-data', handleDataAccess);
router.get('/export-data', handleDataPortability);
router.delete('/delete-my-data', handleDataDeletion);
router.get('/dashboard', logUserAction('view_dashboard'), UserController.getUserDashboard);
router.get('/subscription', UserController.getCurrentSubscription);
router.get('/essay-permission', UserController.checkEssayPermission);

// Rotas CRUD de usuários (admin apenas para listar e gerenciar outros)
router.get('/', requireAdmin, UserController.getUsers);
router.get('/search', requireAdmin, UserController.searchUsers);

// Rotas específicas por ID
router.get('/:id', validateParamId('id'), requireOwnershipOrAdmin, UserController.getUserById);
router.put('/:id', 
  validateParamId('id'), 
  sanitizeInput, 
  validateProfileUpdate, 
  requireOwnershipOrAdmin, 
  logUserAction('update_profile'),
  UserController.updateUser
);
router.delete('/:id', validateParamId('id'), requireAdmin, logUserAction('delete_user'), UserController.deleteUser);

// Rotas administrativas
router.put('/:id/role', validateParamId('id'), requireAdmin, logUserAction('update_user_role'), UserController.updateUserRole);
router.put('/:id/verify-email', validateParamId('id'), requireAdmin, logUserAction('verify_user_email'), UserController.verifyUserEmail);
router.put('/:id/suspend', validateParamId('id'), requireAdmin, logUserAction('suspend_user'), UserController.suspendUser);

module.exports = router;