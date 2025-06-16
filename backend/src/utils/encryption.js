const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const logger = require('./logger');

/**
 * Serviço de criptografia para dados sensíveis
 * Implementa AES-256-GCM para criptografia simétrica e bcrypt para hashing de senhas
 */
class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
    
    // Chave mestra derivada da variável de ambiente
    this.masterKey = this.deriveMasterKey();
  }

  /**
   * Deriva a chave mestra a partir da variável de ambiente
   * @private
   */
  deriveMasterKey() {
    const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production';
    const salt = process.env.ENCRYPTION_SALT || 'default-salt-change-in-production';
    
    if (secret === 'default-secret-change-in-production') {
      logger.warn('Using default encryption secret. Change ENCRYPTION_SECRET in production!');
    }
    
    return crypto.scryptSync(secret, salt, this.keyLength);
  }

  /**
   * Criptografa dados usando AES-256-GCM
   * @param {string} plaintext - Texto a ser criptografado
   * @param {string} associatedData - Dados associados opcionais
   * @returns {Object} Objeto com dados criptografados
   */
  encrypt(plaintext, associatedData = '') {
    try {
      if (!plaintext) {
        throw new Error('Plaintext é obrigatório');
      }

      // Gerar IV aleatório
      const iv = crypto.randomBytes(this.ivLength);
      
      // Criar cipher
      const cipher = crypto.createCipher(this.algorithm, this.masterKey, { ivLength: this.ivLength });
      
      // Configurar dados associados se fornecidos
      if (associatedData) {
        cipher.setAAD(Buffer.from(associatedData, 'utf8'));
      }
      
      // Criptografar
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Obter tag de autenticação
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: this.algorithm
      };
    } catch (error) {
      logger.error('Erro na criptografia:', error);
      throw new Error('Falha na criptografia dos dados');
    }
  }

  /**
   * Descriptografa dados usando AES-256-GCM
   * @param {Object} encryptedData - Dados criptografados
   * @param {string} associatedData - Dados associados opcionais
   * @returns {string} Texto descriptografado
   */
  decrypt(encryptedData, associatedData = '') {
    try {
      if (!encryptedData || !encryptedData.encrypted || !encryptedData.iv || !encryptedData.authTag) {
        throw new Error('Dados criptografados inválidos');
      }

      const { encrypted, iv, authTag } = encryptedData;
      
      // Criar decipher
      const decipher = crypto.createDecipher(
        this.algorithm, 
        this.masterKey, 
        { ivLength: this.ivLength }
      );
      
      // Configurar IV e tag de autenticação
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      // Configurar dados associados se fornecidos
      if (associatedData) {
        decipher.setAAD(Buffer.from(associatedData, 'utf8'));
      }
      
      // Descriptografar
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Erro na descriptografia:', error);
      throw new Error('Falha na descriptografia dos dados');
    }
  }

  /**
   * Gera hash seguro para senhas usando bcrypt
   * @param {string} password - Senha a ser hasheada
   * @param {number} rounds - Número de rounds (padrão: 12)
   * @returns {Promise<string>} Hash da senha
   */
  async hashPassword(password, rounds = 12) {
    try {
      if (!password) {
        throw new Error('Senha é obrigatória');
      }

      return await bcrypt.hash(password, rounds);
    } catch (error) {
      logger.error('Erro ao gerar hash da senha:', error);
      throw new Error('Falha ao processar senha');
    }
  }

  /**
   * Verifica senha contra hash usando bcrypt
   * @param {string} password - Senha em texto plano
   * @param {string} hash - Hash armazenado
   * @returns {Promise<boolean>} True se a senha for válida
   */
  async verifyPassword(password, hash) {
    try {
      if (!password || !hash) {
        return false;
      }

      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Erro na verificação da senha:', error);
      return false;
    }
  }

  /**
   * Gera token seguro aleatório
   * @param {number} length - Comprimento em bytes (padrão: 32)
   * @returns {string} Token hexadecimal
   */
  generateSecureToken(length = 32) {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      logger.error('Erro ao gerar token seguro:', error);
      throw new Error('Falha na geração do token');
    }
  }

  /**
   * Gera chave API única
   * @param {string} prefix - Prefixo da chave (padrão: 'ak')
   * @returns {string} Chave API formatada
   */
  generateAPIKey(prefix = 'ak') {
    try {
      const timestamp = Date.now().toString(36);
      const randomPart = crypto.randomBytes(16).toString('hex');
      return `${prefix}_${timestamp}_${randomPart}`;
    } catch (error) {
      logger.error('Erro ao gerar chave API:', error);
      throw new Error('Falha na geração da chave API');
    }
  }

  /**
   * Gera hash MD5
   * @param {string} data - Dados para hash
   * @returns {string} Hash MD5
   */
  generateMD5(data) {
    try {
      return crypto.createHash('md5').update(data, 'utf8').digest('hex');
    } catch (error) {
      logger.error('Erro ao gerar MD5:', error);
      throw new Error('Falha na geração do hash MD5');
    }
  }

  /**
   * Gera hash SHA256
   * @param {string} data - Dados para hash
   * @returns {string} Hash SHA256
   */
  generateSHA256(data) {
    try {
      return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
    } catch (error) {
      logger.error('Erro ao gerar SHA256:', error);
      throw new Error('Falha na geração do hash SHA256');
    }
  }

  /**
   * Gera HMAC SHA256
   * @param {string} data - Dados para assinar
   * @param {string} secret - Chave secreta (opcional, usa chave mestra)
   * @returns {string} HMAC SHA256
   */
  generateHMAC(data, secret = null) {
    try {
      const key = secret || this.masterKey;
      return crypto.createHmac('sha256', key).update(data, 'utf8').digest('hex');
    } catch (error) {
      logger.error('Erro ao gerar HMAC:', error);
      throw new Error('Falha na geração do HMAC');
    }
  }

  /**
   * Verifica HMAC SHA256
   * @param {string} data - Dados originais
   * @param {string} signature - Assinatura HMAC
   * @param {string} secret - Chave secreta (opcional)
   * @returns {boolean} True se válido
   */
  verifyHMAC(data, signature, secret = null) {
    try {
      const expectedSignature = this.generateHMAC(data, secret);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Erro na verificação do HMAC:', error);
      return false;
    }
  }

  /**
   * Mascara dados sensíveis mantendo apenas alguns caracteres visíveis
   * @param {string} data - Dados a serem mascarados
   * @param {number} visibleStart - Caracteres visíveis no início (padrão: 2)
   * @param {number} visibleEnd - Caracteres visíveis no final (padrão: 2)
   * @param {string} mask - Caractere de máscara (padrão: '*')
   * @returns {string} Dados mascarados
   */
  maskSensitiveData(data, visibleStart = 2, visibleEnd = 2, mask = '*') {
    if (!data || data.length <= visibleStart + visibleEnd) {
      return data;
    }
    
    const start = data.slice(0, visibleStart);
    const end = data.slice(-visibleEnd);
    const middleLength = data.length - visibleStart - visibleEnd;
    const middle = mask.repeat(middleLength);
    
    return start + middle + end;
  }

  /**
   * Mascara email mantendo primeira e última letra do usuário
   * @param {string} email - Email a ser mascarado
   * @returns {string} Email mascarado
   */
  maskEmail(email) {
    if (!email || !email.includes('@')) {
      return email;
    }
    
    const [username, domain] = email.split('@');
    if (username.length <= 2) {
      return email;
    }
    
    const maskedUsername = this.maskSensitiveData(username, 1, 1);
    return `${maskedUsername}@${domain}`;
  }

  /**
   * Criptografa dados de cartão de crédito (PCI DSS compliance)
   * @param {Object} cardData - Dados do cartão
   * @returns {Object} Dados criptografados
   */
  encryptCardData(cardData) {
    try {
      const encryptedData = {};
      
      // Criptografar apenas dados sensíveis
      if (cardData.number) {
        encryptedData.number = this.encrypt(cardData.number, 'card_number');
      }
      
      if (cardData.cvv) {
        encryptedData.cvv = this.encrypt(cardData.cvv, 'card_cvv');
      }
      
      // Dados não sensíveis podem ficar em texto plano
      encryptedData.holderName = cardData.holderName;
      encryptedData.expiryMonth = cardData.expiryMonth;
      encryptedData.expiryYear = cardData.expiryYear;
      encryptedData.brand = cardData.brand;
      
      // Adicionar hash para integridade
      const dataString = JSON.stringify(encryptedData);
      encryptedData._integrity = this.generateSHA256(dataString);
      
      return encryptedData;
    } catch (error) {
      logger.error('Erro ao criptografar dados do cartão:', error);
      throw new Error('Falha na criptografia dos dados do cartão');
    }
  }

  /**
   * Descriptografa dados do cartão de crédito
   * @param {Object} encryptedCardData - Dados criptografados
   * @returns {Object} Dados descriptografados
   */
  decryptCardData(encryptedCardData) {
    try {
      const cardData = { ...encryptedCardData };
      
      // Verificar integridade se disponível
      if (cardData._integrity) {
        const { _integrity, ...dataWithoutIntegrity } = cardData;
        const dataString = JSON.stringify(dataWithoutIntegrity);
        const expectedHash = this.generateSHA256(dataString);
        
        if (_integrity !== expectedHash) {
          throw new Error('Integridade dos dados do cartão comprometida');
        }
        
        delete cardData._integrity;
      }
      
      // Descriptografar dados sensíveis
      if (encryptedCardData.number && typeof encryptedCardData.number === 'object') {
        cardData.number = this.decrypt(encryptedCardData.number, 'card_number');
      }
      
      if (encryptedCardData.cvv && typeof encryptedCardData.cvv === 'object') {
        cardData.cvv = this.decrypt(encryptedCardData.cvv, 'card_cvv');
      }
      
      return cardData;
    } catch (error) {
      logger.error('Erro ao descriptografar dados do cartão:', error);
      throw new Error('Falha na descriptografia dos dados do cartão');
    }
  }

  /**
   * Gera assinatura para webhook
   * @param {string} payload - Payload do webhook
   * @param {string} secret - Chave secreta
   * @returns {string} Assinatura
   */
  generateWebhookSignature(payload, secret) {
    try {
      return crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
    } catch (error) {
      logger.error('Erro ao gerar assinatura do webhook:', error);
      throw new Error('Falha na geração da assinatura');
    }
  }

  /**
   * Verifica assinatura do webhook
   * @param {string} payload - Payload recebido
   * @param {string} signature - Assinatura recebida
   * @param {string} secret - Chave secreta
   * @returns {boolean} True se válida
   */
  verifyWebhookSignature(payload, signature, secret) {
    try {
      const expectedSignature = this.generateWebhookSignature(payload, secret);
      
      // Remover prefixo se presente (ex: "sha256=")
      const cleanSignature = signature.replace(/^sha256=/, '');
      
      return crypto.timingSafeEqual(
        Buffer.from(cleanSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Erro na verificação da assinatura do webhook:', error);
      return false;
    }
  }

  /**
   * Deriva chave específica para uso particular
   * @param {string} purpose - Propósito da chave (ex: 'user_data', 'session')
   * @param {string} context - Contexto adicional
   * @returns {Buffer} Chave derivada
   */
  deriveKey(purpose, context = '') {
    try {
      const info = `${purpose}:${context}`;
      const salt = crypto.createHash('sha256').update(info).digest();
      
      return crypto.scryptSync(this.masterKey, salt, this.keyLength);
    } catch (error) {
      logger.error('Erro ao derivar chave:', error);
      throw new Error('Falha na derivação da chave');
    }
  }

  /**
   * Gera par de chaves RSA
   * @param {number} keySize - Tamanho da chave em bits (padrão: 2048)
   * @returns {Object} Par de chaves públicas e privadas
   */
  generateRSAKeyPair(keySize = 2048) {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: keySize,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });
      
      return { publicKey, privateKey };
    } catch (error) {
      logger.error('Erro ao gerar par de chaves RSA:', error);
      throw new Error('Falha na geração das chaves RSA');
    }
  }

  /**
   * Limpa dados sensíveis da memória (simulação)
   * @param {string} data - Dados a serem limpos
   */
  secureClear(data) {
    if (typeof data === 'string') {
      // Em JavaScript não é possível limpar completamente a memória,
      // mas podemos sobrescrever a referência
      data = null;
    }
  }

  /**
   * Valida configuração de segurança
   * @returns {Object} Resultado da validação
   */
  validateSecurityConfig() {
    const checks = {
      encryptionSecret: process.env.ENCRYPTION_SECRET !== 'default-secret-change-in-production',
      encryptionSalt: process.env.ENCRYPTION_SALT !== 'default-salt-change-in-production',
      jwtSecret: process.env.JWT_SECRET && process.env.JWT_SECRET !== 'fallback_secret_key_change_in_production',
      nodeEnv: process.env.NODE_ENV === 'production'
    };
    
    const issues = [];
    
    if (!checks.encryptionSecret) {
      issues.push('ENCRYPTION_SECRET está usando valor padrão');
    }
    
    if (!checks.encryptionSalt) {
      issues.push('ENCRYPTION_SALT está usando valor padrão');
    }
    
    if (!checks.jwtSecret) {
      issues.push('JWT_SECRET não está configurado adequadamente');
    }
    
    if (checks.nodeEnv && issues.length > 0) {
      logger.error('Problemas de segurança em produção:', issues);
    }
    
    return {
      valid: issues.length === 0,
      issues,
      checks
    };
  }
}

// Criar instância singleton
const encryptionService = new EncryptionService();

// Validar configuração na inicialização
const validationResult = encryptionService.validateSecurityConfig();
if (!validationResult.valid) {
  logger.warn('Problemas de configuração de segurança detectados:', validationResult.issues);
}

module.exports = encryptionService;