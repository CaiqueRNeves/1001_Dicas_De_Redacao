const express = require('express');
const AuthController = require('../controllers/authController');
const { auth, validateRefreshToken, logUserAction } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting para rotas sensíveis
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas
  message: {
    success: false,
    message: 'Muitas tentativas. Tente novamente em 15 minutos.'
  }
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 tentativas
  message: {
    success: false,
    message: 'Muitas tentativas de recuperação. Tente novamente em 1 hora.'
  }
});

// Rotas públicas
router.post('/register', validateRegistration, AuthController.register);
router.post('/login', authLimiter, validateLogin, AuthController.login);
router.post('/refresh', validateRefreshToken, AuthController.refreshToken);
router.post('/forgot-password', resetLimiter, AuthController.forgotPassword);
router.post('/reset-password', resetLimiter, AuthController.resetPassword);
router.get('/verify-email/:token', AuthController.verifyEmail);

// Rotas protegidas
router.use(auth); // Todas as rotas abaixo precisam de autenticação

router.post('/logout', logUserAction('logout'), AuthController.logout);
router.get('/verify', AuthController.verifyToken);
router.get('/profile', AuthController.getProfile);
router.put('/profile', logUserAction('update_profile'), AuthController.updateProfile);
router.post('/change-password', logUserAction('change_password'), AuthController.changePassword);
router.post('/resend-verification', AuthController.resendVerificationEmail);

module.exports = router;