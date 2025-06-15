# 1001 Dicas de Redação

Sistema completo de correção de redações para estudantes do ENEM, desenvolvido com tecnologias modernas e foco na experiência do usuário.

##  Sobre o Projeto

O "1001 Dicas de Redação" é uma plataforma educacional que oferece serviços de correção de redações, materiais gratuitos, conteúdo em vídeo e notícias sobre o ENEM. O sistema permite que estudantes enviem suas redações para correção profissional através de planos de assinatura.

##  Equipe

- **Proprietária**: Taynara da Silva Monteiro
  - Email: proftaynarasilva28@gmail.com
- **Desenvolvedor**: Caique Rabelo Neves
  - Email: caiquerabelo2015@hotmail.com

##  Tecnologias Utilizadas

### Backend
- **Node.js** com **Express.js**
- **SQLite** com migrations
- **JWT** para autenticação
- **Bcrypt** para criptografia de senhas
- **Multer** para upload de arquivos
- **Docker** para containerização

### Frontend
- **React.js** (ES6+)
- **React Router** para navegação
- **Axios** para requisições HTTP
- **CSS3** com design responsivo

### Segurança e Compliance
- Conformidade com **LGPD**
- Criptografia de dados sensíveis
- Validação de entrada robusta
- Headers de segurança configurados

##  Planos de Assinatura

- **Aluno Master**: R$ 40,00/mês - Até 2 redações por semana
- **Aluno VIP**: R$ 50,00/mês - Até 4 redações por semana

##  Design

- **Cores principais**: Branco e verde claro (tons pastéis)
- **Hover effects**: Coloração alaranjada clara
- **Layout**: Responsivo e moderno
- **UX**: Interface intuitiva e acessível

##  Estrutura do Projeto

### Backend Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # Configuração SQLite
│   │   ├── jwt.js               # Configuração JWT
│   │   ├── multer.js            # Configuração upload arquivos
│   │   ├── cors.js              # Configuração CORS
│   │   └── security.js          # Headers de segurança
│   │
│   ├── controllers/
│   │   ├── authController.js    # Login/Logout/Register
│   │   ├── userController.js    # CRUD usuários
│   │   ├── adminController.js   # Funcões admin
│   │   ├── essayController.js   # CRUD redações
│   │   ├── subscriptionController.js # Planos assinatura
│   │   ├── materialController.js     # Materiais PDF
│   │   ├── postController.js         # Posts/Notícias
│   │   ├── videoController.js        # Vídeos YouTube
│   │   ├── paymentController.js      # Pagamentos
│   │   ├── messageController.js      # Sistema mensagens
│   │   ├── dashboardController.js    # Métricas/Dashboard
│   │   └── layoutController.js       # Configurações layout
│   │
│   ├── models/
│   │   ├── User.js              # Modelo usuário
│   │   ├── Essay.js             # Modelo redação
│   │   ├── Subscription.js      # Modelo assinatura
│   │   ├── Material.js          # Modelo material PDF
│   │   ├── Post.js              # Modelo post/notícia
│   │   ├── Video.js             # Modelo vídeo
│   │   ├── Payment.js           # Modelo pagamento
│   │   ├── Message.js           # Modelo mensagem
│   │   ├── CartItem.js          # Item carrinho
│   │   └── SiteSettings.js      # Configurações site
│   │
│   ├── routes/
│   │   ├── index.js             # Rotas principais
│   │   ├── authRoutes.js        # Rotas autenticação
│   │   ├── userRoutes.js        # Rotas usuário
│   │   ├── adminRoutes.js       # Rotas admin
│   │   ├── essayRoutes.js       # Rotas redações
│   │   ├── subscriptionRoutes.js # Rotas assinaturas
│   │   ├── materialRoutes.js     # Rotas materiais
│   │   ├── postRoutes.js         # Rotas posts
│   │   ├── videoRoutes.js        # Rotas vídeos
│   │   ├── paymentRoutes.js      # Rotas pagamentos
│   │   ├── messageRoutes.js      # Rotas mensagens
│   │   ├── dashboardRoutes.js    # Rotas dashboard
│   │   └── publicRoutes.js       # Rotas públicas
│   │
│   ├── middleware/
│   │   ├── auth.js              # Middleware autenticação
│   │   ├── adminAuth.js         # Middleware admin
│   │   ├── validation.js        # Validação dados
│   │   ├── lgpd.js              # Compliance LGPD
│   │   ├── rateLimiter.js       # Rate limiting
│   │   ├── errorHandler.js      # Tratamento erros
│   │   └── logger.js            # Logs sistema
│   │
│   ├── migrations/
│   │   ├── 001_create_users.js
│   │   ├── 002_create_essays.js
│   │   ├── 003_create_subscriptions.js
│   │   ├── 004_create_materials.js
│   │   ├── 005_create_posts.js
│   │   ├── 006_create_videos.js
│   │   ├── 007_create_payments.js
│   │   ├── 008_create_messages.js
│   │   ├── 009_create_cart_items.js
│   │   └── 010_create_site_settings.js
│   │
│   ├── services/
│   │   ├── emailService.js      # Envio emails
│   │   ├── paymentService.js    # Processamento pagamentos
│   │   ├── fileService.js       # Manipulação arquivos
│   │   ├── pdfService.js        # Geração PDFs
│   │   ├── youtubeService.js    # Integração YouTube
│   │   ├── cartService.js       # Carrinho compras
│   │   └── metricsService.js    # Métricas/Analytics
│   │
│   ├── utils/
│   │   ├── validators.js        # Validadores personalizados
│   │   ├── encryption.js        # Funções criptografia
│   │   ├── helpers.js           # Funções auxiliares
│   │   ├── constants.js         # Constantes sistema
│   │   ├── dateHelpers.js       # Manipulação datas
│   │   └── formatters.js        # Formatadores dados
│   │
│   └── app.js                   # Aplicação principal
│
├── uploads/                     # Arquivos enviados
│   ├── essays/                  # Redações
│   ├── materials/               # Materiais PDF
│   ├── images/                  # Imagens
│   └── corrected/               # Redações corrigidas
│
├── tests/                       # Testes automatizados
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── package.json
├── Dockerfile
├── .env.example
├── .gitignore
└── server.js                    # Servidor principal
```

### Frontend Structure

```
frontend/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   ├── manifest.json
│   ├── robots.txt
│   └── images/                  # Imagens estáticas
│       ├── carousel/
│       ├── icons/
│       └── backgrounds/
│
├── src/
│   ├── components/
│   │   ├── common/              # Componentes comuns
│   │   │   ├── Header.js        # Cabeçalho
│   │   │   ├── Footer.js        # Rodapé
│   │   │   ├── Sidebar.js       # Menu retrátil
│   │   │   ├── Loading.js       # Indicador carregamento
│   │   │   ├── Modal.js         # Modal genérico
│   │   │   ├── Button.js        # Botão personalizado
│   │   │   ├── Input.js         # Input personalizado
│   │   │   └── Notification.js  # Notificações
│   │   │
│   │   ├── layout/              # Componentes layout
│   │   │   ├── Carousel.js      # Carrossel imagens
│   │   │   ├── Card.js          # Cards informativos
│   │   │   ├── Cart.js          # Carrinho compras
│   │   │   ├── Navigation.js    # Navegação
│   │   │   └── Container.js     # Container responsivo
│   │   │
│   │   ├── forms/               # Formulários
│   │   │   ├── LoginForm.js     # Form login
│   │   │   ├── RegisterForm.js  # Form cadastro
│   │   │   ├── EssayForm.js     # Form envio redação
│   │   │   ├── SubscriptionForm.js # Form assinatura
│   │   │   ├── ContactForm.js   # Form contato
│   │   │   └── PaymentForm.js   # Form pagamento
│   │   │
│   │   ├── dashboard/           # Componentes dashboard
│   │   │   ├── AdminDashboard.js    # Dashboard admin
│   │   │   ├── UserDashboard.js     # Dashboard usuário
│   │   │   ├── Metrics.js           # Métricas
│   │   │   ├── Chart.js             # Gráficos
│   │   │   ├── EssayList.js         # Lista redações
│   │   │   ├── UserList.js          # Lista usuários
│   │   │   └── RevenueChart.js      # Gráfico receita
│   │   │
│   │   ├── essay/               # Componentes redação
│   │   │   ├── EssayViewer.js   # Visualizar redação
│   │   │   ├── EssayUpload.js   # Upload redação
│   │   │   ├── EssayGrade.js    # Nota redação
│   │   │   └── EssayComments.js # Comentários
│   │   │
│   │   ├── payment/             # Componentes pagamento
│   │   │   ├── PlanCard.js      # Card plano
│   │   │   ├── PaymentMethod.js # Método pagamento
│   │   │   ├── OrderSummary.js  # Resumo pedido
│   │   │   └── Receipt.js       # Recibo
│   │   │
│   │   └── media/               # Componentes mídia
│   │       ├── VideoPlayer.js   # Player vídeo
│   │       ├── PDFViewer.js     # Visualizador PDF
│   │       ├── ImageGallery.js  # Galeria imagens
│   │       └── FileDownload.js  # Download arquivo
│   │
│   ├── pages/                   # Páginas da aplicação
│   │   ├── Home.js              # Página inicial
│   │   ├── Login.js             # Login
│   │   ├── Register.js          # Cadastro
│   │   ├── Subscription.js      # Assinaturas
│   │   ├── News.js              # Notícias ENEM
│   │   ├── Videos.js            # Vídeos
│   │   ├── Materials.js         # Materiais PDF
│   │   ├── Posts.js             # Posts blog
│   │   ├── Contact.js           # Contato
│   │   ├── About.js             # Sobre
│   │   ├── Privacy.js           # Política privacidade
│   │   ├── Terms.js             # Termos uso
│   │   │
│   │   ├── admin/               # Páginas admin
│   │   │   ├── AdminPanel.js    # Painel admin
│   │   │   ├── Dashboard.js     # Dashboard admin
│   │   │   ├── EssayManagement.js   # Gestão redações
│   │   │   ├── UserManagement.js    # Gestão usuários
│   │   │   ├── ContentManagement.js # Gestão conteúdo
│   │   │   ├── LayoutSettings.js    # Configurações layout
│   │   │   ├── PaymentManagement.js # Gestão pagamentos
│   │   │   └── Reports.js           # Relatórios
│   │   │
│   │   └── user/                # Páginas usuário
│   │       ├── UserPanel.js     # Painel usuário
│   │       ├── Dashboard.js     # Dashboard usuário
│   │       ├── MyEssays.js      # Minhas redações
│   │       ├── Messages.js      # Mensagens
│   │       ├── Profile.js       # Perfil
│   │       ├── Subscription.js  # Minha assinatura
│   │       └── Downloads.js     # Downloads
│   │
│   ├── services/                # Serviços
│   │   ├── api.js               # Configuração API
│   │   ├── auth.js              # Serviços autenticação
│   │   ├── essay.js             # Serviços redação
│   │   ├── payment.js           # Serviços pagamento
│   │   ├── user.js              # Serviços usuário
│   │   ├── admin.js             # Serviços admin
│   │   ├── storage.js           # Local storage
│   │   └── websocket.js         # WebSocket
│   │
│   ├── context/                 # Contextos React
│   │   ├── AuthContext.js       # Context autenticação
│   │   ├── CartContext.js       # Context carrinho
│   │   ├── ThemeContext.js      # Context tema
│   │   └── NotificationContext.js # Context notificações
│   │
│   ├── hooks/                   # Hooks customizados
│   │   ├── useAuth.js           # Hook autenticação
│   │   ├── useCart.js           # Hook carrinho
│   │   ├── useApi.js            # Hook API
│   │   ├── useLocalStorage.js   # Hook localStorage
│   │   ├── useWebSocket.js      # Hook WebSocket
│   │   └── useDebounce.js       # Hook debounce
│   │
│   ├── styles/                  # Estilos CSS
│   │   ├── globals.css          # Estilos globais
│   │   ├── variables.css        # Variáveis CSS
│   │   ├── components.css       # Estilos componentes
│   │   ├── responsive.css       # Media queries
│   │   ├── animations.css       # Animações
│   │   └── themes.css           # Temas cores
│   │
│   ├── utils/                   # Utilitários
│   │   ├── constants.js         # Constantes
│   │   ├── helpers.js           # Funções auxiliares
│   │   ├── validators.js        # Validadores
│   │   ├── formatters.js        # Formatadores
│   │   ├── dateHelpers.js       # Manipulação datas
│   │   └── errorHandlers.js     # Tratamento erros
│   │
│   ├── assets/                  # Assets
│   │   ├── images/              # Imagens
│   │   ├── icons/               # Ícones
│   │   └── fonts/               # Fontes
│   │
│   ├── App.js                   # Componente principal
│   ├── index.js                 # Ponto entrada
│   ├── routes.js                # Configuração rotas
│   └── setupTests.js            # Configuração testes
│
├── package.json
├── Dockerfile
├── .env.example
└── .gitignore
```

##  Estrutura do Banco de Dados

### Tabelas Principais

#### Users (Usuários)
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    phone VARCHAR(20),
    birth_date DATE,
    subscription_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    lgpd_consent BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login DATETIME,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);
```

#### Essays (Redações)
```sql
CREATE TABLE essays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    theme VARCHAR(200),
    file_path VARCHAR(500),
    status ENUM('pending', 'correcting', 'corrected', 'returned') DEFAULT 'pending',
    grade DECIMAL(4,2),
    feedback TEXT,
    corrected_file_path VARCHAR(500),
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    corrected_at DATETIME,
    week_submission INTEGER NOT NULL,
    year_submission INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### Subscriptions (Assinaturas)
```sql
CREATE TABLE subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_type ENUM('master', 'vip') NOT NULL,
    status ENUM('active', 'inactive', 'cancelled', 'expired') DEFAULT 'active',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    auto_renewal BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### Materials (Materiais PDF)
```sql
CREATE TABLE materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    category VARCHAR(100),
    is_free BOOLEAN DEFAULT TRUE,
    download_count INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

#### Posts (Posts/Notícias)
```sql
CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    featured_image VARCHAR(500),
    category VARCHAR(100),
    tags TEXT,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    views INTEGER DEFAULT 0,
    author_id INTEGER,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id)
);
```

#### Videos (Vídeos)
```sql
CREATE TABLE videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    youtube_url VARCHAR(500) NOT NULL,
    youtube_id VARCHAR(50) NOT NULL,
    thumbnail_url VARCHAR(500),
    duration INTEGER,
    category VARCHAR(100),
    views INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

#### Payments (Pagamentos)
```sql
CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    subscription_id INTEGER,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    transaction_id VARCHAR(100),
    gateway_response TEXT,
    paid_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);
```

#### Messages (Mensagens)
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    subject VARCHAR(200),
    content TEXT NOT NULL,
    essay_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (recipient_id) REFERENCES users(id),
    FOREIGN KEY (essay_id) REFERENCES essays(id)
);
```

#### Cart_Items (Itens do Carrinho)
```sql
CREATE TABLE cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_type ENUM('master', 'vip') NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### Site_Settings (Configurações do Site)
```sql
CREATE TABLE site_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    updated_by INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);
```

##  Configurações Principais

### Backend - package.json
```json
{
  "name": "1001-dicas-redacao-backend",
  "version": "1.0.0",
  "description": "Backend para sistema de correção de redações",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "migrate": "node src/migrations/migrate.js",
    "seed": "node src/migrations/seed.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "dependencies": {
    "express": "^4.18.2",
    "sqlite3": "^5.1.6",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.8.1",
    "joi": "^17.9.2",
    "nodemailer": "^6.9.4",
    "axios": "^1.4.0",
    "moment": "^2.29.4",
    "winston": "^3.10.0",
    "express-validator": "^7.0.1",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1",
    "express-fileupload": "^1.4.0",
    "pdf-lib": "^1.17.1",
    "sharp": "^0.32.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.1",
    "supertest": "^6.3.3",
    "eslint": "^8.45.0",
    "prettier": "^3.0.0"
  }
}
```

### Frontend - package.json
```json
{
  "name": "1001-dicas-redacao-frontend",
  "version": "1.0.0",
  "description": "Frontend para sistema de correção de redações",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.14.2",
    "axios": "^1.4.0",
    "react-query": "^3.39.3",
    "react-hook-form": "^7.45.2",
    "react-chartjs-2": "^5.2.0",
    "chart.js": "^4.3.3",
    "react-pdf": "^7.3.3",
    "react-dropzone": "^14.2.3",
    "react-toastify": "^9.1.3",
    "react-modal": "^3.16.1",
    "react-carousel": "^4.3.0",
    "react-icons": "^4.10.1",
    "moment": "^2.29.4",
    "lodash": "^4.17.21",
    "socket.io-client": "^4.7.2"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix"
  },
  "devDependencies": {
    "react-scripts": "5.0.1",
    "@testing-library/jest-dom": "^5.17.0",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^13.5.0",
    "eslint": "^8.45.0",
    "prettier": "^3.0.0"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
```

### Docker Compose
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/data/database.sqlite
      - JWT_SECRET=${JWT_SECRET}
      - EMAIL_USER=${EMAIL_USER}
      - EMAIL_PASS=${EMAIL_PASS}
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    depends_on:
      - frontend
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_URL=http://backend:3001
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  data:
  uploads:
```

##  Esquema de Cores e Estilos

### CSS Variables (variables.css)
```css
:root {
  /* Cores Principais */
  --primary-white: #ffffff;
  --primary-green: #a8e6a3;
  --light-green: #c8f5c3;
  --dark-green: #7fd97a;
  --hover-orange: #ffb84d;
  --light-orange: #ffd699;
  
  /* Cores de Estado */
  --success: #28a745;
  --warning: #ffc107;
  --error: #dc3545;
  --info: #17a2b8;
  
  /* Cores Neutras */
  --gray-light: #f8f9fa;
  --gray-medium: #e9ecef;
  --gray-dark: #6c757d;
  --black-soft: #343a40;
  
  /* Gradientes */
  --gradient-primary: linear-gradient(135deg, var(--light-green) 0%, var(--primary-green) 100%);
  --gradient-hover: linear-gradient(135deg, var(--light-orange) 0%, var(--hover-orange) 100%);
  
  /* Sombras */
  --shadow-light: 0 2px 4px rgba(0,0,0,0.1);
  --shadow-medium: 0 4px 8px rgba(0,0,0,0.15);
  --shadow-heavy: 0 8px 16px rgba(0,0,0,0.2);
  
  /* Bordas */
  --border-radius: 8px;
  --border-radius-large: 12px;
  --border-width: 1px;
  
  /* Espaçamentos */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-xxl: 3rem;
  
  /* Tipografia */
  --font-family-primary: 'Inter', 'Roboto', sans-serif;
  --font-family-heading: 'Poppins', 'Inter', sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-xxl: 1.5rem;
  --font-size-xxxl: 2rem;
  
  /* Transições */
  --transition-fast: 0.2s ease;
  --transition-medium: 0.3s ease;
  --transition-slow: 0.5s ease;
}
```

### Componentes Base (components.css)
```css
/* Botões */
.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--border-radius);
  font-family: var(--font-family-primary);
  font-size: var(--font-size-md);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-medium);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  min-height: 44px;
}

.btn-primary {
  background: var(--gradient-primary);
  color: white;
  box-shadow: var(--shadow-light);
}

.btn-primary:hover {
  background: var(--gradient-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.btn-secondary {
  background: var(--primary-white);
  color: var(--primary-green);
  border: var(--border-width) solid var(--primary-green);
}

.btn-secondary:hover {
  background: var(--primary-green);
  color: white;
}

/* Cards */
.card {
  background: var(--primary-white);
  border-radius: var(--border-radius-large);
  box-shadow: var(--shadow-light);
  padding: var(--spacing-lg);
  transition: all var(--transition-medium);
  border: var(--border-width) solid var(--gray-medium);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-heavy);
  border-color: var(--primary-green);
}

.card-header {
  border-bottom: var(--border-width) solid var(--gray-medium);
  padding-bottom: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.card-title {
  font-family: var(--font-family-heading);
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--black-soft);
  margin: 0;
}

/* Formulários */
.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-label {
  display: block;
  font-weight: 500;
  color: var(--black-soft);
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.form-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: var(--border-width) solid var(--gray-medium);
  border-radius: var(--border-radius);
  font-size: var(--font-size-md);
  transition: all var(--transition-fast);
  background: var(--primary-white);
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-green);
  box-shadow: 0 0 0 3px rgba(168, 230, 163, 0.2);
}

.form-input:invalid {
  border-color: var(--error);
}

/* Container responsivo */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

@media (max-width: 768px) {
  .container {
    padding: 0 var(--spacing-md);
  }
}

/* Grid system */
.row {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -var(--spacing-sm);
}

.col {
  flex: 1;
  padding: 0 var(--spacing-sm);
}

.col-12 { flex: 0 0 100%; }
.col-6 { flex: 0 0 50%; }
.col-4 { flex: 0 0 33.333333%; }
.col-3 { flex: 0 0 25%; }

@media (max-width: 768px) {
  .col-6, .col-4, .col-3 {
    flex: 0 0 100%;
  }
}
```

##  Middlewares de Segurança

### auth.js (Middleware de Autenticação)
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token de acesso requerido' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Token inválido' 
    });
  }
};

module.exports = auth;
```

### lgpd.js (Compliance LGPD)
```javascript
const lgpdCompliance = (req, res, next) => {
  // Log de auditoria para LGPD
  const auditLog = {
    userId: req.user?.id,
    action: req.method,
    endpoint: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date(),
    dataAccessed: req.method === 'GET' ? req.path : null,
    dataModified: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? req.body : null
  };

  // Salvar log de auditoria (implementar conforme necessário)
  console.log('LGPD Audit Log:', auditLog);

  // Verificar consentimento LGPD para novos usuários
  if (req.path === '/api/auth/register' && !req.body.lgpdConsent) {
    return res.status(400).json({
      success: false,
      message: 'Consentimento LGPD é obrigatório para criar conta'
    });
  }

  next();
};

module.exports = lgpdCompliance;
```

##  Componentes React Principais

### AuthContext.js
```javascript
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: true
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authService.verifyToken(token)
        .then(user => {
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user, token }
          });
        })
        .catch(() => {
          localStorage.removeItem('token');
          dispatch({ type: 'SET_LOADING', payload: false });
        });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      localStorage.setItem('token', response.token);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: response
      });
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

```

##  Funcionalidades

### Para Usuários
- **Cadastro e Login** com autenticação JWT
- **Planos de Assinatura** (Master e VIP)
- **Envio de Redações** para correção
- **Dashboard Pessoal** com métricas de desempenho
- **Download de Materiais** PDF gratuitos
- **Acesso a Vídeos** educacionais
- **Leitura de Posts** e notícias do ENEM
- **Carrinho de Compras** com expiração automática (24h)

### Para Administradores
- **Painel Administrativo** completo
- **Correção de Redações** com sistema de notas
- **Gerenciamento de Conteúdo** (posts, vídeos, materiais)
- **Personalização de Layout** (cores, imagens)
- **Dashboard com Métricas** financeiras e de desempenho
- **Sistema de Mensagens** com usuários
- **Controle de Usuários** e assinaturas

##  Instalação e Configuração

### Pré-requisitos
- Node.js 16+
- Docker e Docker Compose
- Git

### Instalação Local

1. Clone o repositório:
```bash
git clone https://github.com/CaiqueRNeves/1001_Dicas_De_Redacao.git
cd 1001_Dicas_De_Redacao
```

2. Configure as variáveis de ambiente:
```bash
# Backend
cp backend/.env.example backend/.env
# Edite o arquivo .env com suas configurações

# Frontend
cp frontend/.env.example frontend/.env
```

3. Instale as dependências:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

4. Execute as migrations:
```bash
cd backend
npm run migrate
```

5. Inicie os serviços:
```bash
# Backend (porta 3001)
cd backend
npm run dev

# Frontend (porta 3000)
cd frontend
npm start
```

### Instalação com Docker

1. Clone o repositório:
```bash
git clone https://github.com/CaiqueRNeves/1001_Dicas_De_Redacao.git
cd 1001_Dicas_De_Redacao
```

2. Configure as variáveis de ambiente nos arquivos `.env`

3. Execute com Docker Compose:
```bash
docker-compose up -d
```

##  Scripts Disponíveis

### Backend
- `npm start` - Inicia o servidor em produção
- `npm run dev` - Inicia o servidor em desenvolvimento
- `npm run migrate` - Executa as migrations
- `npm test` - Executa os testes
- `npm run seed` - Popula o banco com dados iniciais

### Frontend
- `npm start` - Inicia o servidor de desenvolvimento
- `npm run build` - Gera build de produção
- `npm test` - Executa os testes
- `npm run eject` - Ejeta as configurações do Create React App

##  Segurança e LGPD

O sistema implementa as seguintes medidas de segurança:

- **Criptografia de senhas** com bcrypt
- **Autenticação JWT** com tokens seguros
- **Validação rigorosa** de entrada de dados
- **Headers de segurança** configurados
- **Compliance com LGPD**:
  - Consentimento explícito para coleta de dados
  - Direito ao esquecimento
  - Portabilidade de dados
  - Logs de auditoria

##  Integração de Pagamentos

O sistema suporta os seguintes métodos de pagamento:
- PIX
- Cartão de Crédito/Débito
- Boleto Bancário

##  Responsividade

O frontend é totalmente responsivo, funcionando perfeitamente em:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (até 767px)

##  Deploy

### Ambiente de Produção
1. Configure as variáveis de ambiente para produção
2. Execute o build do frontend: `npm run build`
3. Use Docker Compose para orquestração dos serviços
4. Configure SSL/TLS para HTTPS
5. Configure backup automático do banco de dados

### Monitoramento
- Logs estruturados com Winston
- Métricas de performance
- Alertas de erro automáticos
- Backup automático diário

##  Suporte

Para dúvidas ou suporte:
- **Proprietária**: proftaynarasilva28@gmail.com
- **Desenvolvedor**: caiquerabelo2015@hotmail.com
