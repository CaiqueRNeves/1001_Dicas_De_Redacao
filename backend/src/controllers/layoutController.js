const SiteSettings = require('../models/SiteSettings');
const logger = require('../utils/logger');

class LayoutController {
  // Obter configurações do layout
  static async getLayoutSettings(req, res) {
    try {
      const settings = await SiteSettings.getAsObject('appearance', true);
      
      // Configurações padrão do layout
      const layoutConfig = {
        siteName: settings.site_name || '1001 Dicas de Redação',
        primaryColor: settings.primary_color || '#a8e6a3',
        secondaryColor: settings.secondary_color || '#ffb84d',
        logo: settings.logo_url || '/assets/logo.png',
        favicon: settings.favicon_url || '/assets/favicon.ico',
        socialMedia: {
          instagram: settings.instagram_url || '',
          youtube: settings.youtube_url || '',
          facebook: settings.facebook_url || '',
          whatsapp: settings.whatsapp_number || ''
        },
        contact: {
          email: settings.contact_email || 'contato@1001dicasderedacao.com',
          phone: settings.contact_phone || '',
          address: settings.contact_address || ''
        },
        features: {
          showPricing: settings.show_pricing !== false,
          showTestimonials: settings.show_testimonials !== false,
          showBlog: settings.show_blog !== false,
          showMaterials: settings.show_materials !== false
        },
        theme: {
          darkMode: settings.dark_mode_enabled || false,
          animations: settings.animations_enabled !== false,
          customCss: settings.custom_css || ''
        }
      };

      res.json({
        success: true,
        data: layoutConfig
      });

    } catch (error) {
      logger.error('Erro ao obter configurações do layout:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter navegação do site
  static async getNavigation(req, res) {
    try {
      const navigation = {
        main: [
          { 
            label: 'Início', 
            href: '/', 
            active: true 
          },
          { 
            label: 'Como Funciona', 
            href: '/como-funciona' 
          },
          { 
            label: 'Planos', 
            href: '/planos' 
          },
          { 
            label: 'Materiais', 
            href: '/materiais' 
          },
          { 
            label: 'Blog', 
            href: '/blog' 
          },
          { 
            label: 'Contato', 
            href: '/contato' 
          }
        ],
        user: req.user ? [
          { 
            label: 'Painel', 
            href: '/painel' 
          },
          { 
            label: 'Minhas Redações', 
            href: '/painel/redacoes' 
          },
          { 
            label: 'Assinatura', 
            href: '/painel/assinatura' 
          },
          { 
            label: 'Perfil', 
            href: '/painel/perfil' 
          }
        ] : [
          { 
            label: 'Entrar', 
            href: '/entrar' 
          },
          { 
            label: 'Cadastrar', 
            href: '/cadastrar' 
          }
        ],
        admin: req.user?.role === 'admin' ? [
          { 
            label: 'Dashboard Admin', 
            href: '/admin' 
          },
          { 
            label: 'Usuários', 
            href: '/admin/usuarios' 
          },
          { 
            label: 'Redações', 
            href: '/admin/redacoes' 
          },
          { 
            label: 'Conteúdo', 
            href: '/admin/conteudo' 
          },
          { 
            label: 'Configurações', 
            href: '/admin/configuracoes' 
          }
        ] : []
      };

      res.json({
        success: true,
        data: navigation
      });

    } catch (error) {
      logger.error('Erro ao obter navegação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter footer
  static async getFooter(req, res) {
    try {
      const settings = await SiteSettings.getAsObject('contact', true);

      const footer = {
        company: {
          name: settings.company_name || '1001 Dicas de Redação',
          description: settings.company_description || 'A melhor plataforma para aperfeiçoar suas redações do ENEM.',
          logo: settings.footer_logo || '/assets/logo-footer.png'
        },
        links: {
          about: [
            { label: 'Como Funciona', href: '/como-funciona' },
            { label: 'Nossa Equipe', href: '/equipe' },
            { label: 'Depoimentos', href: '/depoimentos' }
          ],
          support: [
            { label: 'Central de Ajuda', href: '/ajuda' },
            { label: 'Contato', href: '/contato' },
            { label: 'FAQ', href: '/faq' }
          ],
          legal: [
            { label: 'Termos de Uso', href: '/termos' },
            { label: 'Política de Privacidade', href: '/privacidade' },
            { label: 'LGPD', href: '/lgpd' }
          ]
        },
        contact: {
          email: settings.contact_email || 'contato@1001dicasderedacao.com',
          phone: settings.contact_phone || '',
          whatsapp: settings.whatsapp_number || '',
          address: settings.contact_address || ''
        },
        social: {
          instagram: settings.instagram_url || '',
          youtube: settings.youtube_url || '',
          facebook: settings.facebook_url || '',
          twitter: settings.twitter_url || ''
        },
        copyright: `© ${new Date().getFullYear()} ${settings.company_name || '1001 Dicas de Redação'}. Todos os direitos reservados.`
      };

      res.json({
        success: true,
        data: footer
      });

    } catch (error) {
      logger.error('Erro ao obter footer:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter meta tags para SEO
  static async getMetaTags(req, res) {
    try {
      const { page = 'home' } = req.query;
      const settings = await SiteSettings.getAsObject('seo', true);

      const defaultMeta = {
        title: settings.site_title || '1001 Dicas de Redação - Sua nota 1000 está aqui!',
        description: settings.site_description || 'Plataforma completa para aperfeiçoar suas redações do ENEM com correção profissional, materiais gratuitos e dicas exclusivas.',
        keywords: settings.site_keywords || 'redação, enem, correção, dicas, materiais, vestibular',
        author: settings.site_author || '1001 Dicas de Redação',
        robots: 'index, follow',
        canonical: `${process.env.FRONTEND_URL || 'https://1001dicasderedacao.com'}`,
        ogTitle: settings.og_title || settings.site_title,
        ogDescription: settings.og_description || settings.site_description,
        ogImage: settings.og_image || '/assets/og-image.jpg',
        ogType: 'website',
        twitterCard: 'summary_large_image',
        twitterSite: settings.twitter_username || '@1001dicasredacao'
      };

      // Customizar meta tags baseado na página
      const pageMeta = getPageSpecificMeta(page, defaultMeta);

      res.json({
        success: true,
        data: pageMeta
      });

    } catch (error) {
      logger.error('Erro ao obter meta tags:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter configurações do breadcrumb
  static async getBreadcrumb(req, res) {
    try {
      const { path } = req.query;
      
      if (!path) {
        return res.status(400).json({
          success: false,
          message: 'Path é obrigatório'
        });
      }

      const breadcrumb = generateBreadcrumb(path);

      res.json({
        success: true,
        data: breadcrumb
      });

    } catch (error) {
      logger.error('Erro ao obter breadcrumb:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Obter configurações do tema atual
  static async getTheme(req, res) {
    try {
      const settings = await SiteSettings.getAsObject('appearance', true);

      const theme = {
        colors: {
          primary: settings.primary_color || '#a8e6a3',
          secondary: settings.secondary_color || '#ffb84d',
          accent: settings.accent_color || '#7fd97a',
          background: settings.background_color || '#ffffff',
          surface: settings.surface_color || '#f8f9fa',
          text: {
            primary: settings.text_primary_color || '#343a40',
            secondary: settings.text_secondary_color || '#6c757d',
            muted: settings.text_muted_color || '#9ca3af'
          },
          status: {
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545',
            info: '#17a2b8'
          }
        },
        fonts: {
          primary: settings.primary_font || 'Inter, sans-serif',
          secondary: settings.secondary_font || 'Poppins, sans-serif',
          monospace: settings.monospace_font || 'Fira Code, monospace'
        },
        spacing: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
          '2xl': '3rem'
        },
        borderRadius: {
          sm: '0.125rem',
          md: '0.375rem',
          lg: '0.5rem',
          xl: '0.75rem',
          full: '9999px'
        },
        shadows: {
          sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        },
        animations: {
          enabled: settings.animations_enabled !== false,
          duration: settings.animation_duration || 300,
          easing: settings.animation_easing || 'ease-in-out'
        }
      };

      res.json({
        success: true,
        data: theme
      });

    } catch (error) {
      logger.error('Erro ao obter tema:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

// Funções auxiliares

// Gerar meta tags específicas por página
const getPageSpecificMeta = (page, defaultMeta) => {
  const pageConfigs = {
    home: {
      title: '1001 Dicas de Redação - Sua nota 1000 está aqui!',
      description: 'Plataforma completa para aperfeiçoar suas redações do ENEM com correção profissional, materiais gratuitos e dicas exclusivas.',
      keywords: 'redação enem, correção redação, dicas redação, materiais enem'
    },
    planos: {
      title: 'Planos e Preços - 1001 Dicas de Redação',
      description: 'Escolha o plano ideal para suas necessidades. Correção profissional de redações com feedback detalhado.',
      keywords: 'planos redação, preços correção, assinatura redação'
    },
    materiais: {
      title: 'Materiais Gratuitos - 1001 Dicas de Redação',
      description: 'Baixe materiais gratuitos para estudar e melhorar suas redações. PDFs, apostilas e guias exclusivos.',
      keywords: 'materiais gratuitos, pdf redação, apostilas enem'
    },
    blog: {
      title: 'Blog - 1001 Dicas de Redação',
      description: 'Dicas, notícias e artigos sobre redação do ENEM. Conteúdo atualizado para te ajudar a alcançar a nota 1000.',
      keywords: 'blog redação, dicas enem, artigos redação'
    },
    contato: {
      title: 'Contato - 1001 Dicas de Redação',
      description: 'Entre em contato conosco. Tire suas dúvidas e receba suporte especializado.',
      keywords: 'contato, suporte, ajuda redação'
    }
  };

  return {
    ...defaultMeta,
    ...pageConfigs[page]
  };
};

// Gerar breadcrumb baseado no path
const generateBreadcrumb = (path) => {
  const segments = path.split('/').filter(segment => segment);
  const breadcrumb = [{ label: 'Início', href: '/' }];

  const pathMap = {
    'planos': 'Planos',
    'materiais': 'Materiais',
    'blog': 'Blog',
    'contato': 'Contato',
    'painel': 'Painel',
    'redacoes': 'Redações',
    'assinatura': 'Assinatura',
    'perfil': 'Perfil',
    'admin': 'Administração',
    'usuarios': 'Usuários',
    'configuracoes': 'Configurações'
  };

  let currentPath = '';
  segments.forEach(segment => {
    currentPath += `/${segment}`;
    breadcrumb.push({
      label: pathMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
      href: currentPath
    });
  });

  return breadcrumb;
};

module.exports = LayoutController;