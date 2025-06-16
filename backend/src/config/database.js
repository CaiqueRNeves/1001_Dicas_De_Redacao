const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/database.sqlite');

let db = null;

// Garantir que o diretório existe
const ensureDirectoryExists = async (filePath) => {
  const dirname = path.dirname(filePath);
  try {
    await fs.access(dirname);
  } catch (error) {
    await fs.mkdir(dirname, { recursive: true });
  }
};

// Inicializar conexão com o banco
const initDatabase = async () => {
  try {
    await ensureDirectoryExists(DATABASE_PATH);
    
    return new Promise((resolve, reject) => {
      db = new sqlite3.Database(DATABASE_PATH, (err) => {
        if (err) {
          logger.error('Erro ao conectar com o banco de dados:', err);
          reject(err);
        } else {
          logger.info('Conectado ao banco de dados SQLite');
          
          // Configurações do banco
          db.serialize(() => {
            db.run('PRAGMA foreign_keys = ON');
            db.run('PRAGMA journal_mode = WAL');
            db.run('PRAGMA synchronous = NORMAL');
            db.run('PRAGMA cache_size = 1000');
            db.run('PRAGMA temp_store = MEMORY');
          });
          
          resolve(db);
        }
      });
    });
  } catch (error) {
    logger.error('Erro ao inicializar banco de dados:', error);
    throw error;
  }
};

// Obter conexão do banco
const getDatabase = () => {
  if (!db) {
    throw new Error('Banco de dados não inicializado');
  }
  return db;
};

// Executar query
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.all(sql, params, (err, rows) => {
      if (err) {
        logger.error('Erro na query:', { sql, params, error: err.message });
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Executar query que retorna um único resultado
const queryOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.get(sql, params, (err, row) => {
      if (err) {
        logger.error('Erro na query:', { sql, params, error: err.message });
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Executar query de modificação (INSERT, UPDATE, DELETE)
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.run(sql, params, function(err) {
      if (err) {
        logger.error('Erro na query:', { sql, params, error: err.message });
        reject(err);
      } else {
        resolve({
          lastID: this.lastID,
          changes: this.changes
        });
      }
    });
  });
};

// Executar múltiplas queries em transação
const transaction = async (queries) => {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    database.serialize(() => {
      database.run('BEGIN TRANSACTION');
      
      const results = [];
      let completed = 0;
      let hasError = false;
      
      queries.forEach((queryObj, index) => {
        if (hasError) return;
        
        const { sql, params = [] } = queryObj;
        
        database.run(sql, params, function(err) {
          if (err && !hasError) {
            hasError = true;
            database.run('ROLLBACK');
            reject(err);
            return;
          }
          
          results[index] = {
            lastID: this.lastID,
            changes: this.changes
          };
          
          completed++;
          
          if (completed === queries.length && !hasError) {
            database.run('COMMIT', (err) => {
              if (err) {
                reject(err);
              } else {
                resolve(results);
              }
            });
          }
        });
      });
    });
  });
};

// Fechar conexão
const closeDatabase = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          logger.error('Erro ao fechar banco de dados:', err);
          reject(err);
        } else {
          logger.info('Conexão com banco de dados fechada');
          db = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
};

// Verificar se uma tabela existe
const tableExists = async (tableName) => {
  try {
    const result = await queryOne(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    return !!result;
  } catch (error) {
    return false;
  }
};

// Obter informações da tabela
const getTableInfo = async (tableName) => {
  try {
    return await query(`PRAGMA table_info(${tableName})`);
  } catch (error) {
    logger.error(`Erro ao obter informações da tabela ${tableName}:`, error);
    return [];
  }
};

// Backup do banco de dados
const backup = async (backupPath) => {
  try {
    const fs = require('fs').promises;
    await fs.copyFile(DATABASE_PATH, backupPath);
    logger.info(`Backup criado: ${backupPath}`);
    return true;
  } catch (error) {
    logger.error('Erro ao criar backup:', error);
    return false;
  }
};

module.exports = {
  initDatabase,
  getDatabase,
  query,
  queryOne,
  run,
  transaction,
  closeDatabase,
  tableExists,
  getTableInfo,
  backup,
  DATABASE_PATH
};