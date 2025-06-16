const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
    this.keyBuffer = crypto.scryptSync(this.secretKey, 'salt', 32);
  }

  // Criptografar dados sensíveis
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.keyBuffer, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error('Erro na criptografia: ' + error.message);
    }
  }

  // Descriptografar dados
  decrypt(encryptedData) {
    try {
      const { encrypted, iv, authTag } = encryptedData;
      
      const decipher = crypto.createDecipher(
        this.algorithm, 
        this.keyBuffer, 
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Erro na descriptografia: ' + error.message);
    }
  }

  // Hash seguro para senhas
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Verificar senha
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // Gerar token seguro
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Gerar hash MD5
  generateMD5(data) {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  // Gerar hash SHA256
  generateSHA256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Gerar HMAC
  generateHMAC(data, secret = this.secretKey) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  // Verificar HMAC
  verifyHMAC(data, signature, secret = this.secretKey) {
    const expectedSignature = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Mascarar dados sensíveis
  maskSensitiveData(data, visibleChars = 4) {
    if (!data || data.length <= visibleChars) return data;
    
    const masked = '*'.repeat(data.length - visibleChars);
    return data.slice(0, visibleChars) + masked;
  }

  // Mascarar email
  maskEmail(email) {
    if (!email || !email.includes('@')) return email;
    
    const [username, domain] = email.split('@');
    if (username.length <= 2) return email;
    
    const maskedUsername = username[0] + '*'.repeat(username.length - 2) + username.slice(-1);
    return `${maskedUsername}@${domain}`;
  }

  // Gerar chave de API
  generateAPIKey() {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `ak_${timestamp}_${randomBytes}`;
  }

  // Criptografar dados de cartão de crédito (PCI DSS compliance)
  encryptCardData(cardData) {
    const encryptedData = {};
    
    // Criptografar apenas dados sensíveis
    if (cardData.number) {
      encryptedData.number = this.encrypt(cardData.number);
    }
    
    if (cardData.cvv) {
      encryptedData.cvv = this.encrypt(cardData.cvv);
    }
    
    // Dados não sensíveis podem ficar em texto plano
    encryptedData.holderName = cardData.holderName;
    encryptedData.expiryMonth = cardData.expiryMonth;
    encryptedData.expiryYear = cardData.expiryYear;
    encryptedData.brand = cardData.brand;
    
    return encryptedData;
  }

  // Descriptografar dados do cartão
  decryptCardData(encryptedCardData) {
    const cardData = { ...encryptedCardData };
    
    if (encryptedCardData.number && typeof encryptedCardData.number === 'object') {
      cardData.number = this.decrypt(encryptedCardData.number);
    }
    
    if (encryptedCardData.cvv && typeof encryptedCardData.cvv === 'object') {
      cardData.cvv = this.decrypt(encryptedCardData.cvv);
    }
    
    return cardData;
  }

  // Gerar assinatura para webhook
  generateWebhookSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
  }

  // Verificar assinatura de webhook
  verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = this.generateWebhookSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}

module.exports = new EncryptionService();