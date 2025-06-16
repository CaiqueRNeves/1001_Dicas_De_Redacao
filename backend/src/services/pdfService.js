const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class PDFService {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  // Gerar PDF de redação corrigida
  async generateEssayCorrectionPDF(essayData, correctionData) {
    try {
      const html = this.generateEssayCorrectionHTML(essayData, correctionData);
      const pdfBuffer = await this.htmlToPDF(html);
      
      const filename = `correcao_redacao_${essayData.id}_${Date.now()}.pdf`;
      const filepath = path.join(this.tempDir, filename);
      
      await fs.writeFile(filepath, pdfBuffer);
      
      logger.info(`PDF de correção gerado: ${filename}`);
      return { filepath, filename };
    } catch (error) {
      logger.error('Erro ao gerar PDF de correção:', error);
      throw error;
    }
  }

  // Gerar PDF de relatório
  async generateReportPDF(reportData, title = 'Relatório') {
    try {
      const html = this.generateReportHTML(reportData, title);
      const pdfBuffer = await this.htmlToPDF(html);
      
      const filename = `relatorio_${Date.now()}.pdf`;
      const filepath = path.join(this.tempDir, filename);
      
      await fs.writeFile(filepath, pdfBuffer);
      
      logger.info(`PDF de relatório gerado: ${filename}`);
      return { filepath, filename };
    } catch (error) {
      logger.error('Erro ao gerar PDF de relatório:', error);
      throw error;
    }
  }

  // Converter HTML para PDF
  async htmlToPDF(html, options = {}) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfOptions = {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        },
        ...options
      };
      
      const pdfBuffer = await page.pdf(pdfOptions);
      return pdfBuffer;
    } catch (error) {
      logger.error('Erro ao converter HTML para PDF:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // Template HTML para correção de redação
  generateEssayCorrectionHTML(essayData, correctionData) {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Correção de Redação - ${essayData.title}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          background: linear-gradient(135deg, #a8e6a3, #7fd97a);
          color: white;
          padding: 30px;
          border-radius: 10px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .info-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .grade-box {
          background: #e8f5e8;
          border: 2px solid #28a745;
          padding: 20px;
          text-align: center;
          border-radius: 8px;
          margin: 20px 0;
        }
        .grade-box h2 {
          margin: 0;
          color: #28a745;
          font-size: 32px;
        }
        .essay-content {
          background: white;
          border: 1px solid #ddd;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .feedback-section {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 20px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding: 20px;
          border-top: 1px solid #ddd;
          color: #666;
        }
        .criteria {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin: 20px 0;
        }
        .criterion {
          background: white;
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 6px;
        }
        .criterion h4 {
          margin: 0 0 10px 0;
          color: #2c5530;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>1001 Dicas de Redação</h1>
        <p>Correção Profissional de Redação</p>
      </div>
      
      <div class="info-section">
        <h3>Informações da Redação</h3>
        <p><strong>Título:</strong> ${essayData.title}</p>
        <p><strong>Tema:</strong> ${essayData.theme}</p>
        <p><strong>Data de Submissão:</strong> ${new Date(essayData.submitted_at).toLocaleDateString('pt-BR')}</p>
        <p><strong>Data de Correção:</strong> ${new Date(correctionData.corrected_at).toLocaleDateString('pt-BR')}</p>
      </div>
      
      ${correctionData.grade ? `
      <div class="grade-box">
        <h2>${correctionData.grade}/1000</h2>
        <p>Nota Final</p>
      </div>
      ` : ''}
      
      <div class="essay-content">
        <h3>Texto da Redação</h3>
        <div style="white-space: pre-wrap;">${essayData.content || 'Redação enviada como arquivo anexo.'}</div>
      </div>
      
      ${correctionData.feedback ? `
      <div class="feedback-section">
        <h3>Feedback do Professor</h3>
        <div style="white-space: pre-wrap;">${correctionData.feedback}</div>
      </div>
      ` : ''}
      
      <div class="criteria">
        <div class="criterion">
          <h4>Competência 1</h4>
          <p>Demonstrar domínio da modalidade escrita formal da língua portuguesa</p>
        </div>
        <div class="criterion">
          <h4>Competência 2</h4>
          <p>Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento</p>
        </div>
        <div class="criterion">
          <h4>Competência 3</h4>
          <p>Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos</p>
        </div>
        <div class="criterion">
          <h4>Competência 4</h4>
          <p>Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação</p>
        </div>
        <div class="criterion">
          <h4>Competência 5</h4>
          <p>Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos</p>
        </div>
      </div>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} 1001 Dicas de Redação - Correção Profissional</p>
        <p>www.1001dicasderedacao.com</p>
      </div>
    </body>
    </html>
    `;
  }

  // Template HTML para relatórios
  generateReportHTML(reportData, title) {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          background: linear-gradient(135deg, #a8e6a3, #7fd97a);
          color: white;
          padding: 30px;
          border-radius: 10px;
          margin-bottom: 30px;
        }
        .section {
          margin: 30px 0;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #ddd;
        }
        .stat-number {
          font-size: 32px;
          font-weight: bold;
          color: #28a745;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background: #f8f9fa;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding: 20px;
          border-top: 1px solid #ddd;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p>
      </div>
      
      ${JSON.stringify(reportData, null, 2)}
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} 1001 Dicas de Redação</p>
      </div>
    </body>
    </html>
    `;
  }

  // Limpar arquivos temporários
  async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          logger.info(`Arquivo temporário removido: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Erro ao limpar arquivos temporários:', error);
    }
  }
}

module.exports = new PDFService();