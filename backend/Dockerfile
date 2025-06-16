# Usar Node.js 18 LTS como base
FROM node:18-alpine

# Definir informações do mantenedor
LABEL maintainer="Caique Rabelo Neves <caiquerabelo2015@hotmail.com>"
LABEL description="Backend do sistema 1001 Dicas de Redação"
LABEL version="1.0.0"

# Instalar dependências do sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    curl \
    tzdata

# Definir timezone
ENV TZ=America/Sao_Paulo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && \
    npm cache clean --force

# Criar diretórios necessários
RUN mkdir -p uploads/{essays,materials,images,documents,carousel} && \
    mkdir -p logs && \
    mkdir -p data && \
    mkdir -p backups

# Copiar código da aplicação
COPY . .

# Definir permissões corretas
RUN chown -R nodejs:nodejs /app

# Mudar para usuário não-root
USER nodejs

# Expor porta da aplicação
EXPOSE 3001

# Definir variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/app/data/database.sqlite

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Volume para dados persistentes
VOLUME ["/app/data", "/app/uploads", "/app/logs", "/app/backups"]

# Comando para iniciar a aplicação
CMD ["npm", "start"]

# Multi-stage build para desenvolvimento
FROM node:18-alpine as development

WORKDIR /app

# Instalar todas as dependências (incluindo devDependencies)
COPY package*.json ./
RUN npm ci

# Instalar nodemon globalmente
RUN npm install -g nodemon

# Copiar código
COPY . .

# Criar diretórios
RUN mkdir -p uploads/{essays,materials,images,documents,carousel} && \
    mkdir -p logs && \
    mkdir -p data && \
    mkdir -p backups

# Expor porta
EXPOSE 3001

# Comando para desenvolvimento
CMD ["npm", "run", "dev"]

# Multi-stage build para testes
FROM development as test

# Executar testes
RUN npm test

# Multi-stage build para produção otimizada
FROM node:18-alpine as production

# Instalar dependências do sistema
RUN apk add --no-cache \
    sqlite \
    curl \
    tzdata

# Definir timezone
ENV TZ=America/Sao_Paulo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Criar usuário
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Copiar apenas arquivos necessários para produção
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar código da aplicação
COPY --chown=nodejs:nodejs . .

# Criar diretórios
RUN mkdir -p uploads/{essays,materials,images,documents,carousel} && \
    mkdir -p logs && \
    mkdir -p data && \
    mkdir -p backups && \
    chown -R nodejs:nodejs /app

USER nodejs

# Configurações de produção
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

VOLUME ["/app/data", "/app/uploads", "/app/logs", "/app/backups"]

CMD ["npm", "start"]