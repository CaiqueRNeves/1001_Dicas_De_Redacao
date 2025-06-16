const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Gerar token de acesso
const generateAccessToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: '1001-dicas-redacao',
      audience: 'users'
    });
  } catch (error) {
    logger.error('Erro ao gerar token de acesso:', error);
    throw new Error('Falha na geração do token');
  }
};

// Gerar token de refresh
const generateRefreshToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: '1001-dicas-redacao',
      audience: 'refresh'
    });
  } catch (error) {
    logger.error('Erro ao gerar token de refresh:', error);
    throw new Error('Falha na geração do token de refresh');
  }
};

// Verificar token
const verifyToken = (token, options = {}) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: '1001-dicas-redacao',
      audience: options.audience || 'users',
      ...options
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token ainda não é válido');
    } else {
      logger.error('Erro ao verificar token:', error);
      throw new Error('Falha na verificação do token');
    }
  }
};

// Decodificar token sem verificação (para debug)
const decodeToken = (token) => {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    logger.error('Erro ao decodificar token:', error);
    return null;
  }
};

// Verificar se token está expirado
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

// Obter tempo restante do token (em segundos)
const getTokenRemainingTime = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return 0;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    const remainingTime = decoded.exp - currentTime;
    
    return remainingTime > 0 ? remainingTime : 0;
  } catch (error) {
    return 0;
  }
};

// Extrair informações do token
const extractTokenInfo = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded) {
      return null;
    }
    
    return {
      userId: decoded.id,
      email: decoded.email,
      role: decoded.role,
      issuedAt: new Date(decoded.iat * 1000),
      expiresAt: new Date(decoded.exp * 1000),
      issuer: decoded.iss,
      audience: decoded.aud
    };
  } catch (error) {
    logger.error('Erro ao extrair informações do token:', error);
    return null;
  }
};

// Gerar par de tokens (access + refresh)
const generateTokenPair = (payload) => {
  try {
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRES_IN,
      tokenType: 'Bearer'
    };
  } catch (error) {
    logger.error('Erro ao gerar par de tokens:', error);
    throw new Error('Falha na geração dos tokens');
  }
};

// Renovar token usando refresh token
const refreshAccessToken = (refreshToken) => {
  try {
    const decoded = verifyToken(refreshToken, { audience: 'refresh' });
    
    // Criar novo payload sem campos internos do JWT
    const payload = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    
    return generateAccessToken(payload);
  } catch (error) {
    logger.error('Erro ao renovar token:', error);
    throw new Error('Falha na renovação do token');
  }
};

// Middleware para validação de token
const validateTokenMiddleware = (options = {}) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: 'Token de autorização não fornecido'
        });
      }
      
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;
      
      const decoded = verifyToken(token, options);
      req.user = decoded;
      req.token = token;
      
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  isTokenExpired,
  getTokenRemainingTime,
  extractTokenInfo,
  generateTokenPair,
  refreshAccessToken,
  validateTokenMiddleware,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN
};