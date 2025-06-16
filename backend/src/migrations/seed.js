const bcrypt = require('bcryptjs');
const { initDatabase, query, run } = require('../config/database');
const logger = require('../utils/logger');

// Dados iniciais para desenvolvimento
const seedData = {
  users: [
    {
      name: 'Taynara da Silva Monteiro',
      email: 'proftaynarasilva28@gmail.com',
      password: 'Admin123!',
      role: 'admin',
      phone: '11999999999',
      lgpd_consent: true,
      email_verified: true
    },
    {
      name: 'Caique Rabelo Neves',
      email: 'caiquerabelo2015@hotmail.com',
      password: 'Dev123!',
      role: 'admin',
      phone: '11888888888',
      lgpd_consent: true,
      email_verified: true
    },
    {
      name: 'João Silva',
      email: 'joao.silva@email.com',
      password: 'User123!',
      role: 'user',
      phone: '11777777777',
      birth_date: '2000-05-15',
      lgpd_consent: true,
      email_verified: true
    },
    {
      name: 'Maria Santos',
      email: 'maria.santos@email.com',
      password: 'User123!',
      role: 'user',
      phone: '11666666666',
      birth_date: '1999-08-22',
      lgpd_consent: true,
      email_verified: true
    }
  ],

  posts: [
    {
      title: 'Dicas para uma redação nota 1000 no ENEM',
      content: `
        <h2>Como conseguir nota máxima na redação do ENEM</h2>
        <p>A redação é uma das partes mais importantes do ENEM e pode fazer a diferença na sua nota final. Aqui estão algumas dicas essenciais:</p>
        
        <h3>1. Domine a estrutura dissertativa-argumentativa</h3>
        <p>A redação do ENEM deve seguir o modelo dissertativo-argumentativo, com introdução, desenvolvimento e conclusão com proposta de intervenção.</p>
        
        <h3>2. Pratique a argumentação</h3>
        <p>Desenvolva argumentos consistentes e utilize dados, exemplos e citações para fundamentar seus pontos de vista.</p>
        
        <h3>3. Respeite os direitos humanos</h3>
        <p>Qualquer proposta que fira os direitos humanos pode zerar sua redação. Mantenha sempre o respeito à dignidade humana.</p>
        
        <h3>4. Elabore uma proposta de intervenção completa</h3>
        <p>Sua conclusão deve conter uma proposta de solução detalhada, com agente, ação, meio/modo, finalidade e detalhamento.</p>
      `,
      excerpt: 'Descubra as principais estratégias para conseguir nota máxima na redação do ENEM.',
      category: 'Dicas',
      tags: 'enem,redacao,dicas,nota1000',
      status: 'published',
      published_at: new Date().toISOString()
    },
    {
      title: 'Temas que podem cair na redação do ENEM 2025',
      content: `
        <h2>Possíveis temas para a redação do ENEM 2025</h2>
        <p>Com base nas tendências atuais e nos problemas sociais em evidência, alguns temas têm maior probabilidade de aparecer:</p>
        
        <h3>1. Sustentabilidade e meio ambiente</h3>
        <p>Mudanças climáticas, desmatamento e energia renovável são temas sempre relevantes.</p>
        
        <h3>2. Tecnologia e sociedade</h3>
        <p>Inteligência artificial, privacidade digital e inclusão digital são assuntos em alta.</p>
        
        <h3>3. Saúde mental</h3>
        <p>Especialmente após a pandemia, a saúde mental tornou-se uma preocupação central.</p>
        
        <h3>4. Democracia e participação cidadã</h3>
        <p>O fortalecimento das instituições democráticas é um tema recorrente.</p>
      `,
      excerpt: 'Conheça os temas que têm maior probabilidade de cair na redação do ENEM 2025.',
      category: 'ENEM',
      tags: 'enem,temas,2025,redacao',
      status: 'published',
      published_at: new Date().toISOString()
    },
    {
      title: 'Erros mais comuns na redação do ENEM',
      content: `
        <h2>Principais erros que você deve evitar</h2>
        <p>Conhecer os erros mais comuns pode ajudar você a não cometê-los na hora da prova:</p>
        
        <h3>1. Fuga ao tema</h3>
        <p>Leia atentamente a proposta e mantenha-se sempre dentro do tema solicitado.</p>
        
        <h3>2. Problemas na proposta de intervenção</h3>
        <p>Muitos candidatos esquecem de detalhar adequadamente a proposta de solução.</p>
        
        <h3>3. Uso inadequado da norma padrão</h3>
        <p>Cuidado com erros de português, concordância e regência verbal.</p>
        
        <h3>4. Falta de coesão e coerência</h3>
        <p>Use conectivos adequados e mantenha a lógica entre as ideias.</p>
      `,
      excerpt: 'Evite os erros mais comuns e aumente suas chances de uma boa nota na redação.',
      category: 'Dicas',
      tags: 'enem,erros,redacao,dicas',
      status: 'published',
      published_at: new Date().toISOString()
    }
  ],

  videos: [
    {
      title: 'Como estruturar uma redação dissertativa-argumentativa',
      description: 'Aprenda a estrutura básica da redação do ENEM com exemplos práticos.',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      youtube_id: 'dQw4w9WgXcQ',
      category: 'Estrutura'
    },
    {
      title: 'Técnicas de argumentação para redação',
      description: 'Descubra como desenvolver argumentos convincentes e bem fundamentados.',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      youtube_id: 'dQw4w9WgXcQ',
      category: 'Argumentação'
    },
    {
      title: 'Proposta de intervenção nota 1000',
      description: 'Como elaborar uma proposta de intervenção completa e detalhada.',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      youtube_id: 'dQw4w9WgXcQ',
      category: 'Proposta'
    }
  ],

  materials: [
    {
      title: 'Guia Completo de Redação ENEM',
      description: 'Manual completo com todas as dicas e estratégias para uma redação nota 1000.',
      file_path: '/uploads/materials/guia-redacao-enem.pdf',
      file_size: 2048000,
      category: 'Guias',
      is_free: true
    },
    {
      title: 'Banco de Temas para Treinar',
      description: 'Coletânea com 50 temas de redação para você praticar.',
      file_path: '/uploads/materials/banco-temas.pdf',
      file_size: 1024000,
      category: 'Exercícios',
      is_free: true
    },
    {
      title: 'Conectivos e Operadores Argumentativos',
      description: 'Lista completa de conectivos para dar coesão ao seu texto.',
      file_path: '/uploads/materials/conectivos.pdf',
      file_size: 512000,
      category: 'Gramática',
      is_free: true
    }
  ]
};

// Função para criar hash da senha
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

// Seed de usuários
const seedUsers = async () => {
  try {
    logger.info('Iniciando seed de usuários...');
    
    for (const userData of seedData.users) {
      // Verificar se usuário já existe
      const existingUser = await query(
        'SELECT id FROM users WHERE email = ?',
        [userData.email]
      );
      
      if (existingUser.length > 0) {
        logger.info(`Usuário ${userData.email} já existe`);
        continue;
      }
      
      // Hash da senha
      const hashedPassword = await hashPassword(userData.password);
      
      await run(
        `INSERT INTO users (name, email, password, role, phone, birth_date, lgpd_consent, email_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          userData.name,
          userData.email,
          hashedPassword,
          userData.role,
          userData.phone,
          userData.birth_date,
          userData.lgpd_consent,
          userData.email_verified
        ]
      );
      
      logger.info(`Usuário ${userData.email} criado`);
    }
    
    logger.info('Seed de usuários concluído');
  } catch (error) {
    logger.error('Erro no seed de usuários:', error);
    throw error;
  }
};

// Seed de posts
const seedPosts = async () => {
  try {
    logger.info('Iniciando seed de posts...');
    
    // Obter ID do primeiro admin para ser o autor
    const admin = await query(
      'SELECT id FROM users WHERE role = "admin" LIMIT 1'
    );
    
    if (admin.length === 0) {
      logger.warn('Nenhum admin encontrado para ser autor dos posts');
      return;
    }
    
    const authorId = admin[0].id;
    
    for (const postData of seedData.posts) {
      // Verificar se post já existe
      const existingPost = await query(
        'SELECT id FROM posts WHERE title = ?',
        [postData.title]
      );
      
      if (existingPost.length > 0) {
        logger.info(`Post "${postData.title}" já existe`);
        continue;
      }
      
      // Gerar slug
      const slug = postData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      
      await run(
        `INSERT INTO posts (title, content, excerpt, slug, category, tags, status, author_id, published_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          postData.title,
          postData.content,
          postData.excerpt,
          slug,
          postData.category,
          postData.tags,
          postData.status,
          authorId,
          postData.published_at
        ]
      );
      
      logger.info(`Post "${postData.title}" criado`);
    }
    
    logger.info('Seed de posts concluído');
  } catch (error) {
    logger.error('Erro no seed de posts:', error);
    throw error;
  }
};

// Seed de vídeos
const seedVideos = async () => {
  try {
    logger.info('Iniciando seed de vídeos...');
    
    // Obter ID do primeiro admin
    const admin = await query(
      'SELECT id FROM users WHERE role = "admin" LIMIT 1'
    );
    
    if (admin.length === 0) {
      logger.warn('Nenhum admin encontrado para criar vídeos');
      return;
    }
    
    const createdBy = admin[0].id;
    
    for (const videoData of seedData.videos) {
      // Verificar se vídeo já existe
      const existingVideo = await query(
        'SELECT id FROM videos WHERE youtube_id = ?',
        [videoData.youtube_id]
      );
      
      if (existingVideo.length > 0) {
        logger.info(`Vídeo "${videoData.title}" já existe`);
        continue;
      }
      
      const thumbnailUrl = `https://img.youtube.com/vi/${videoData.youtube_id}/maxresdefault.jpg`;
      
      await run(
        `INSERT INTO videos (title, description, youtube_url, youtube_id, thumbnail_url, category, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          videoData.title,
          videoData.description,
          videoData.youtube_url,
          videoData.youtube_id,
          thumbnailUrl,
          videoData.category,
          createdBy
        ]
      );
      
      logger.info(`Vídeo "${videoData.title}" criado`);
    }
    
    logger.info('Seed de vídeos concluído');
  } catch (error) {
    logger.error('Erro no seed de vídeos:', error);
    throw error;
  }
};

// Seed de materiais
const seedMaterials = async () => {
  try {
    logger.info('Iniciando seed de materiais...');
    
    // Obter ID do primeiro admin
    const admin = await query(
      'SELECT id FROM users WHERE role = "admin" LIMIT 1'
    );
    
    if (admin.length === 0) {
      logger.warn('Nenhum admin encontrado para criar materiais');
      return;
    }
    
    const createdBy = admin[0].id;
    
    for (const materialData of seedData.materials) {
      // Verificar se material já existe
      const existingMaterial = await query(
        'SELECT id FROM materials WHERE title = ?',
        [materialData.title]
      );
      
      if (existingMaterial.length > 0) {
        logger.info(`Material "${materialData.title}" já existe`);
        continue;
      }
      
      await run(
        `INSERT INTO materials (title, description, file_path, file_size, category, is_free, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          materialData.title,
          materialData.description,
          materialData.file_path,
          materialData.file_size,
          materialData.category,
          materialData.is_free,
          createdBy
        ]
      );
      
      logger.info(`Material "${materialData.title}" criado`);
    }
    
    logger.info('Seed de materiais concluído');
  } catch (error) {
    logger.error('Erro no seed de materiais:', error);
    throw error;
  }
};

// Função principal de seed
const runSeed = async () => {
  try {
    logger.info('Iniciando processo de seed...');
    
    await initDatabase();
    
    await seedUsers();
    await seedPosts();
    await seedVideos();
    await seedMaterials();
    
    logger.info('Processo de seed concluído com sucesso');
  } catch (error) {
    logger.error('Erro no processo de seed:', error);
    throw error;
  }
};

// Limpar todos os dados (use com cuidado!)
const clearAllData = async () => {
  try {
    logger.warn('ATENÇÃO: Limpando todos os dados...');
    
    await initDatabase();
    
    // Desabilitar foreign keys temporariamente
    await run('PRAGMA foreign_keys = OFF');
    
    const tables = [
      'cart_items',
      'messages',
      'payments',
      'videos',
      'posts',
      'materials',
      'essays',
      'subscriptions',
      'users',
      'migrations'
    ];
    
    for (const table of tables) {
      await run(`DELETE FROM ${table}`);
      logger.info(`Tabela ${table} limpa`);
    }
    
    // Reabilitar foreign keys
    await run('PRAGMA foreign_keys = ON');
    
    logger.warn('Todos os dados foram removidos');
  } catch (error) {
    logger.error('Erro ao limpar dados:', error);
    throw error;
  }
};

// Interface de linha de comando
const runCLI = async () => {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'run':
      case 'seed':
        await runSeed();
        break;
        
      case 'users':
        await initDatabase();
        await seedUsers();
        break;
        
      case 'posts':
        await initDatabase();
        await seedPosts();
        break;
        
      case 'videos':
        await initDatabase();
        await seedVideos();
        break;
        
      case 'materials':
        await initDatabase();
        await seedMaterials();
        break;
        
      case 'clear':
        const confirm = args[1];
        if (confirm !== '--confirm') {
          console.log('ATENÇÃO: Este comando irá apagar TODOS os dados!');
          console.log('Use: node seed.js clear --confirm');
          return;
        }
        await clearAllData();
        break;
        
      default:
        console.log(`
Uso: node seed.js <comando> [opções]

Comandos:
  run, seed     Executar todos os seeds
  users         Seed apenas de usuários
  posts         Seed apenas de posts
  videos        Seed apenas de vídeos
  materials     Seed apenas de materiais
  clear --confirm  Limpar todos os dados (CUIDADO!)

Exemplos:
  node seed.js run
  node seed.js users
  node seed.js clear --confirm
        `);
        break;
    }
  } catch (error) {
    logger.error('Erro na execução do comando:', error);
    process.exit(1);
  }
};

// Exportar funções
module.exports = {
  runSeed,
  seedUsers,
  seedPosts,
  seedVideos,
  seedMaterials,
  clearAllData,
  seedData
};

// Executar CLI se chamado diretamente
if (require.main === module) {
  runCLI()
    .then(() => {
      logger.info('Comando de seed executado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Erro na execução do seed:', error);
      process.exit(1);
    });
}