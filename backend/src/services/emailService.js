const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Configuração do transportador de email
const createTransporter = () => {
  const config = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true' || false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  };

  return nodemailer.createTransporter(config);
};

// Verificar configuração do email
const verifyEmailConfig = async () => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      logger.warn('Configurações de email não encontradas');
      return false;
    }

    const transporter = createTransporter();
    await transporter.verify();
    logger.info('Configuração de email verificada com sucesso');
    return true;
  } catch (error) {
    logger.error('Erro na verificação da configuração de email:', error);
    return false;
  }
};

// Função base para enviar email
const sendEmail = async (to, subject, html, text = null) => {
  try {
    if (!await verifyEmailConfig()) {
      throw new Error('Configuração de email inválida');
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || '1001 Dicas de Redação',
        address: process.env.EMAIL_FROM || process.env.EMAIL_USER
      },
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Remove HTML tags para versão texto
    };

    const result = await transporter.sendMail(mailOptions);
    
    logger.info(`Email enviado com sucesso para ${to}: ${subject}`);
    return {
      success: true,
      messageId: result.messageId,
      to,
      subject
    };
  } catch (error) {
    logger.error(`Erro ao enviar email para ${to}:`, error);
    throw error;
  }
};

// Templates de email
const emailTemplates = {
  welcome: (name) => ({
    subject: 'Bem-vindo(a) ao 1001 Dicas de Redação!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background-color: #a8e6a3; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">1001 Dicas de Redação</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Olá, ${name}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Seja muito bem-vindo(a) à nossa plataforma! Estamos muito felizes em tê-lo(a) conosco.
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            Aqui você encontrará:
          </p>
          
          <ul style="color: #666; line-height: 1.8;">
            <li>Correção profissional de redações</li>
            <li>Materiais gratuitos para download</li>
            <li>Vídeos educativos</li>
            <li>Dicas e notícias sobre o ENEM</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}" 
               style="background-color: #ffb84d; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Começar Agora
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
            Atenciosamente,<br>
            Equipe 1001 Dicas de Redação
          </p>
        </div>
      </div>
    `
  }),

  passwordReset: (name, resetToken) => ({
    subject: 'Redefinição de Senha - 1001 Dicas de Redação',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background-color: #a8e6a3; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">1001 Dicas de Redação</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Olá, ${name}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Você solicitou a redefinição da sua senha. Clique no botão abaixo para criar uma nova senha:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}" 
               style="background-color: #ffb84d; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Redefinir Senha
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            Se você não solicitou esta redefinição, pode ignorar este email com segurança.
          </p>
          
          <p style="color: #999; font-size: 14px;">
            Este link expira em 1 hora por motivos de segurança.
          </p>
          
          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
            Atenciosamente,<br>
            Equipe 1001 Dicas de Redação
          </p>
        </div>
      </div>
    `
  }),

  emailVerification: (name, verificationToken) => ({
    subject: 'Verificação de Email - 1001 Dicas de Redação',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background-color: #a8e6a3; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">1001 Dicas de Redação</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Olá, ${name}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Para completar seu cadastro, precisamos verificar seu email. Clique no botão abaixo:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/verify-email/${verificationToken}" 
               style="background-color: #a8e6a3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Verificar Email
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
            Atenciosamente,<br>
            Equipe 1001 Dicas de Redação
          </p>
        </div>
      </div>
    `
  }),

  essayCorrected: (name, essayTitle, grade) => ({
    subject: 'Sua redação foi corrigida!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background-color: #a8e6a3; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">1001 Dicas de Redação</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Olá, ${name}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Sua redação "<strong>${essayTitle}</strong>" foi corrigida e já está disponível em sua conta!
          </p>
          
          ${grade ? `
            <div style="background-color: #f0f8f0; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
              <h3 style="margin: 0; color: #2d5d31;">Sua nota: ${grade}/1000</h3>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/painel/redacoes" 
               style="background-color: #ffb84d; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Ver Correção
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
            Atenciosamente,<br>
            Equipe 1001 Dicas de Redação
          </p>
        </div>
      </div>
    `
  }),

  subscriptionCreated: (name, planType, price) => ({
    subject: 'Assinatura ativada com sucesso!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background-color: #a8e6a3; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">1001 Dicas de Redação</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Parabéns, ${name}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Sua assinatura do plano <strong>${planType.toUpperCase()}</strong> foi ativada com sucesso!
          </p>
          
          <div style="background-color: #f0f8f0; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #2d5d31;">Detalhes da Assinatura</h3>
            <p style="margin: 5px 0; color: #666;"><strong>Plano:</strong> ${planType.toUpperCase()}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Valor:</strong> R$ ${price}/mês</p>
            <p style="margin: 5px 0; color: #666;"><strong>Limite semanal:</strong> ${planType === 'vip' ? '4' : '2'} redações</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/painel" 
               style="background-color: #ffb84d; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Acessar Painel
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
            Atenciosamente,<br>
            Equipe 1001 Dicas de Redação
          </p>
        </div>
      </div>
    `
  })
};

// Funções específicas para envio de emails

// Email de boas-vindas
const sendWelcomeEmail = async (email, name) => {
  const template = emailTemplates.welcome(name);
  return await sendEmail(email, template.subject, template.html);
};

// Email de redefinição de senha
const sendPasswordResetEmail = async (email, name, resetToken) => {
  const template = emailTemplates.passwordReset(name, resetToken);
  return await sendEmail(email, template.subject, template.html);
};

// Email de verificação
const sendEmailVerification = async (email, name, verificationToken) => {
  const template = emailTemplates.emailVerification(name, verificationToken);
  return await sendEmail(email, template.subject, template.html);
};

// Email de redação corrigida
const sendEssayCorrectedEmail = async (email, name, essayTitle, grade = null) => {
  const template = emailTemplates.essayCorrected(name, essayTitle, grade);
  return await sendEmail(email, template.subject, template.html);
};

// Email de assinatura criada
const sendSubscriptionCreatedEmail = async (email, name, planType, price) => {
  const template = emailTemplates.subscriptionCreated(name, planType, price);
  return await sendEmail(email, template.subject, template.html);
};

// Email genérico com template customizado
const sendCustomEmail = async (email, subject, htmlContent) => {
  const customHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
      <div style="background-color: #a8e6a3; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">1001 Dicas de Redação</h1>
      </div>
      
      <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
        ${htmlContent}
        
        <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
          Atenciosamente,<br>
          Equipe 1001 Dicas de Redação
        </p>
      </div>
    </div>
  `;
  
  return await sendEmail(email, subject, customHtml);
};

// Enviar email em lote (newsletter)
const sendBulkEmail = async (emailList, subject, htmlContent) => {
  try {
    const results = [];
    
    // Enviar em lotes para evitar sobrecarga
    const batchSize = 10;
    for (let i = 0; i < emailList.length; i += batchSize) {
      const batch = emailList.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (email) => {
        try {
          return await sendCustomEmail(email, subject, htmlContent);
        } catch (error) {
          logger.error(`Erro ao enviar email para ${email}:`, error);
          return { success: false, email, error: error.message };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Pequena pausa entre lotes
      if (i + batchSize < emailList.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    logger.info(`Email em lote enviado: ${successful} sucessos, ${failed} falhas`);
    
    return {
      success: true,
      total: emailList.length,
      successful,
      failed,
      results
    };
  } catch (error) {
    logger.error('Erro no envio de email em lote:', error);
    throw error;
  }
};

// Agendar envio de email (implementação simples)
const scheduleEmail = async (email, subject, htmlContent, sendAt) => {
  try {
    const delay = new Date(sendAt) - new Date();
    
    if (delay <= 0) {
      throw new Error('Data de envio deve ser no futuro');
    }
    
    setTimeout(async () => {
      try {
        await sendCustomEmail(email, subject, htmlContent);
        logger.info(`Email agendado enviado para ${email}`);
      } catch (error) {
        logger.error(`Erro ao enviar email agendado para ${email}:`, error);
      }
    }, delay);
    
    logger.info(`Email agendado para ${email} em ${sendAt}`);
    return { success: true, scheduledFor: sendAt };
  } catch (error) {
    logger.error('Erro ao agendar email:', error);
    throw error;
  }
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmailVerification,
  sendEssayCorrectedEmail,
  sendSubscriptionCreatedEmail,
  sendCustomEmail,
  sendBulkEmail,
  scheduleEmail,
  verifyEmailConfig,
  emailTemplates
};