const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateTokenPair, refreshAccessToken } = require('../config/jwt');
const { validateEmail, validatePassword } = require('../utils/validators');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

class AuthController {
  // Registro de usuário
  static async register(req, res) {
    try {
      const { name, email, password, confirmPassword, phone, birth_date, lgpd_consent } = req.body;

      // Validações básicas
      if (!name || !email || !password || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Todos os campos obrigatórios devem ser preenchidos'
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Senhas não coincidem'
        });
      }

      if (!lgpd_consent) {
        return res.status(400).json({
          success: false,
          message: 'Consentimento LGPD é obrigatório'
        });
      }

      // Validar email
      if (!validateEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Email inválido'
        });
      }

      // Validar senha
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message
        });
      }

      // Verificar se usuário já existe
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email já está em uso'
        });
      }

      // Criar usuário
      const userData = {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        phone: phone?.trim(),
        birth_date,
        lgpd_consent: true
      };

      const user = await User.create(userData);

      // Gerar tokens
      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      const tokens = generateTokenPair(tokenPayload);

      // Enviar email de boas-vindas
      try {
        await emailService.sendWelcomeEmail(user.email, user.name);
      } catch (emailError) {
        logger.error('Erro ao enviar email de boas-vindas:', emailError);
        // Não falhar o registro por causa do email
      }

      logger.info(`Usuário registrado: ${user.email}`);

      res.status(201).json({
        success: true,
        message: 'Usuário registrado com sucesso',
        data: {
          user: user.getSafeData(),
          ...tokens
        }
      });

    } catch (error) {
      logger.error('Erro no registro:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Login de usuário
  static async login(req, res) {
    try {
      const { email, password, rememberMe = false } = req.body;

      // Validações básicas
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email e senha são obrigatórios'
        });
      }

      // Buscar usuário
      const user = await User.findByEmail(email.toLowerCase().trim());
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      // Verificar senha
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      // Atualizar último login
      await user.updateLastLogin();

      // Gerar tokens
      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      const tokens = generateTokenPair(tokenPayload);

      // Se "lembrar de mim" estiver ativado, aumentar tempo de expiração
      if (rememberMe) {
        // Implementar lógica para tokens de longa duração se necessário
      }

      logger.info(`Login realizado: ${user.email}`);

      res.json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          user: user.getSafeData(),
          ...tokens
        }
      });

    } catch (error) {
      logger.error('Erro no login:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Logout
  static async logout(req, res) {
    try {
      // Em uma implementação mais robusta, você poderia:
      // 1. Adicionar o token a uma blacklist
      // 2. Salvar logs de logout
      // 3. Invalidar refresh tokens

      logger.info(`Logout realizado: ${req.user?.email || 'Usuário desconhecido'}`);

      res.json({
        success: true,
        message: 'Logout realizado com sucesso'
      });

    } catch (error) {
      logger.error('Erro no logout:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Renovar token
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token requerido'
        });
      }

      // Gerar novo access token
      const newAccessToken = refreshAccessToken(refreshToken);

      res.json({
        success: true,
        message: 'Token renovado com sucesso',
        data: {
          accessToken: newAccessToken,
          tokenType: 'Bearer'
        }
      });

    } catch (error) {
      logger.error('Erro ao renovar token:', error);
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  // Verificar token
  static async verifyToken(req, res) {
    try {
      // Se chegou aqui, o token é válido (middleware auth)
      res.json({
        success: true,
        message: 'Token válido',
        data: {
          user: req.user.getSafeData()
        }
      });

    } catch (error) {
      logger.error('Erro na verificação do token:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Esqueceu a senha
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email é obrigatório'
        });
      }

      const user = await User.findByEmail(email.toLowerCase().trim());
      
      // Por segurança, sempre retornar sucesso mesmo se usuário não existir
      if (!user) {
        return res.json({
          success: true,
          message: 'Se o email estiver cadastrado, você receberá instruções de recuperação'
        });
      }

      // Gerar token de recuperação
      const resetToken = jwt.sign(
        { id: user.id, email: user.email, type: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Enviar email de recuperação
      try {
        await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
        logger.info(`Email de recuperação enviado: ${user.email}`);
      } catch (emailError) {
        logger.error('Erro ao enviar email de recuperação:', emailError);
        return res.status(500).json({
          success: false,
          message: 'Erro ao enviar email de recuperação'
        });
      }

      res.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá instruções de recuperação'
      });

    } catch (error) {
      logger.error('Erro em esqueceu senha:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Redefinir senha
  static async resetPassword(req, res) {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Todos os campos são obrigatórios'
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Senhas não coincidem'
        });
      }

      // Validar nova senha
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message
        });
      }

      // Verificar token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.type !== 'password_reset') {
          throw new Error('Token inválido');
        }
      } catch (tokenError) {
        return res.status(401).json({
          success: false,
          message: 'Token inválido ou expirado'
        });
      }

      // Buscar usuário
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Atualizar senha
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await user.update({ password: hashedPassword });

      logger.info(`Senha redefinida: ${user.email}`);

      res.json({
        success: true,
        message: 'Senha redefinida com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao redefinir senha:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Alterar senha (usuário logado)
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Todos os campos são obrigatórios'
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Senhas não coincidem'
        });
      }

      // Validar nova senha
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message
        });
      }

      // Atualizar senha
      await req.user.updatePassword(currentPassword, newPassword);

      logger.info(`Senha alterada: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Senha alterada com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao alterar senha:', error);
      
      if (error.message === 'Senha atual incorreta') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Verificar email
  static async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token de verificação requerido'
        });
      }

      // Verificar token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.type !== 'email_verification') {
          throw new Error('Token inválido');
        }
      } catch (tokenError) {
        return res.status(401).json({
          success: false,
          message: 'Token inválido ou expirado'
        });
      }

      // Buscar usuário
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Verificar email
      await user.update({ email_verified: true });

      logger.info(`Email verificado: ${user.email}`);

      res.json({
        success: true,
        message: 'Email verificado com sucesso'
      });

    } catch (error) {
      logger.error('Erro na verificação de email:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Reenviar email de verificação
  static async resendVerificationEmail(req, res) {
    try {
      const user = req.user;

      if (user.email_verified) {
        return res.status(400).json({
          success: false,
          message: 'Email já verificado'
        });
      }

      // Gerar token de verificação
      const verificationToken = jwt.sign(
        { id: user.id, email: user.email, type: 'email_verification' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Enviar email de verificação
      try {
        await emailService.sendEmailVerification(user.email, user.name, verificationToken);
        logger.info(`Email de verificação reenviado: ${user.email}`);
      } catch (emailError) {
        logger.error('Erro ao reenviar email de verificação:', emailError);
        return res.status(500).json({
          success: false,
          message: 'Erro ao enviar email de verificação'
        });
      }

      res.json({
        success: true,
        message: 'Email de verificação enviado'
      });

    } catch (error) {
      logger.error('Erro ao reenviar verificação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter perfil do usuário logado
  static async getProfile(req, res) {
    try {
      const user = req.user;
      
      // Obter dados adicionais
      const [subscription, stats] = await Promise.all([
        user.getCurrentSubscription(),
        user.getStats()
      ]);

      res.json({
        success: true,
        data: {
          user: user.getSafeData(),
          subscription,
          stats
        }
      });

    } catch (error) {
      logger.error('Erro ao obter perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar perfil
  static async updateProfile(req, res) {
    try {
      const { name, phone, birth_date } = req.body;
      
      const updateData = {};
      
      if (name) updateData.name = name.trim();
      if (phone) updateData.phone = phone.trim();
      if (birth_date) updateData.birth_date = birth_date;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum campo para atualizar'
        });
      }

      await req.user.update(updateData);

      logger.info(`Perfil atualizado: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: {
          user: req.user.getSafeData()
        }
      });

    } catch (error) {
      logger.error('Erro ao atualizar perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = AuthController;