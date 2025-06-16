const path = require('path');
const fs = require('fs');
const { initDatabase, query, run, tableExists } = require('../config/database');
const logger = require('../utils/logger');

// Lista de migrations em ordem
const migrations = [
  '001_create_users',
  '002_create_essays',
  '003_create_subscriptions',
  '004_create_materials',
  '005_create_posts',
  '006_create_videos',
  '007_create_payments',
  '008_create_messages',
  '009_create_cart_items',
  '010_create_site_settings'
];

// Criar tabela de controle de migrations
const createMigrationsTable = async () => {
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    logger.info('Tabela de migrations criada');
  } catch (error) {
    logger.error('Erro ao criar tabela de migrations:', error);
    throw error;
  }
};

// Verificar se migration já foi executada
const isMigrationExecuted = async (migrationName) => {
  try {
    const result = await query(
      'SELECT 1 FROM migrations WHERE migration_name = ?',
      [migrationName]
    );
    return result.length > 0;
  } catch (error) {
    logger.error(`Erro ao verificar migration ${migrationName}:`, error);
    return false;
  }
};

// Marcar migration como executada
const markMigrationExecuted = async (migrationName) => {
  try {
    await run(
      'INSERT INTO migrations (migration_name) VALUES (?)',
      [migrationName]
    );
    logger.info(`Migration ${migrationName} marcada como executada`);
  } catch (error) {
    logger.error(`Erro ao marcar migration ${migrationName}:`, error);
    throw error;
  }
};

// Executar uma migration específica
const executeMigration = async (migrationName) => {
  try {
    const migrationPath = path.join(__dirname, `${migrationName}.js`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migration = require(migrationPath);
    
    if (typeof migration.up !== 'function') {
      throw new Error(`Migration ${migrationName} must export an 'up' function`);
    }

    logger.info(`Executando migration: ${migrationName}`);
    await migration.up();
    await markMigrationExecuted(migrationName);
    logger.info(`Migration ${migrationName} executada com sucesso`);
    
    return true;
  } catch (error) {
    logger.error(`Erro ao executar migration ${migrationName}:`, error);
    throw error;
  }
};

// Reverter uma migration específica
const rollbackMigration = async (migrationName) => {
  try {
    const migrationPath = path.join(__dirname, `${migrationName}.js`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migration = require(migrationPath);
    
    if (typeof migration.down !== 'function') {
      throw new Error(`Migration ${migrationName} must export a 'down' function`);
    }

    logger.info(`Revertendo migration: ${migrationName}`);
    await migration.down();
    
    // Remover da tabela de migrations
    await run(
      'DELETE FROM migrations WHERE migration_name = ?',
      [migrationName]
    );
    
    logger.info(`Migration ${migrationName} revertida com sucesso`);
    return true;
  } catch (error) {
    logger.error(`Erro ao reverter migration ${migrationName}:`, error);
    throw error;
  }
};

// Executar todas as migrations pendentes
const runMigrations = async () => {
  try {
    logger.info('Iniciando processo de migrations');
    
    // Inicializar banco de dados
    await initDatabase();
    
    // Criar tabela de controle
    await createMigrationsTable();
    
    let executedCount = 0;
    
    for (const migrationName of migrations) {
      const isExecuted = await isMigrationExecuted(migrationName);
      
      if (!isExecuted) {
        await executeMigration(migrationName);
        executedCount++;
      } else {
        logger.info(`Migration ${migrationName} já foi executada`);
      }
    }
    
    if (executedCount > 0) {
      logger.info(`${executedCount} migrations executadas com sucesso`);
    } else {
      logger.info('Todas as migrations já estão atualizadas');
    }
    
    return true;
  } catch (error) {
    logger.error('Erro no processo de migrations:', error);
    throw error;
  }
};

// Reverter todas as migrations
const rollbackAllMigrations = async () => {
  try {
    logger.info('Iniciando rollback de todas as migrations');
    
    await initDatabase();
    
    // Verificar se tabela de migrations existe
    const migrationsTableExists = await tableExists('migrations');
    if (!migrationsTableExists) {
      logger.info('Tabela de migrations não existe');
      return;
    }
    
    // Obter migrations executadas em ordem reversa
    const executedMigrations = await query(
      'SELECT migration_name FROM migrations ORDER BY id DESC'
    );
    
    let rolledBackCount = 0;
    
    for (const row of executedMigrations) {
      await rollbackMigration(row.migration_name);
      rolledBackCount++;
    }
    
    logger.info(`${rolledBackCount} migrations revertidas com sucesso`);
    return true;
  } catch (error) {
    logger.error('Erro no rollback das migrations:', error);
    throw error;
  }
};

// Obter status das migrations
const getMigrationStatus = async () => {
  try {
    await initDatabase();
    
    const migrationsTableExists = await tableExists('migrations');
    if (!migrationsTableExists) {
      return {
        total: migrations.length,
        executed: 0,
        pending: migrations.length,
        migrations: migrations.map(name => ({ name, executed: false }))
      };
    }
    
    const executedMigrations = await query(
      'SELECT migration_name, executed_at FROM migrations ORDER BY id'
    );
    
    const executedNames = new Set(executedMigrations.map(m => m.migration_name));
    
    const status = migrations.map(name => ({
      name,
      executed: executedNames.has(name),
      executed_at: executedMigrations.find(m => m.migration_name === name)?.executed_at
    }));
    
    return {
      total: migrations.length,
      executed: executedNames.size,
      pending: migrations.length - executedNames.size,
      migrations: status
    };
  } catch (error) {
    logger.error('Erro ao obter status das migrations:', error);
    throw error;
  }
};

// Executar migration específica pelo nome
const runSpecificMigration = async (migrationName) => {
  try {
    if (!migrations.includes(migrationName)) {
      throw new Error(`Migration ${migrationName} não encontrada`);
    }
    
    await initDatabase();
    await createMigrationsTable();
    
    const isExecuted = await isMigrationExecuted(migrationName);
    if (isExecuted) {
      logger.info(`Migration ${migrationName} já foi executada`);
      return false;
    }
    
    await executeMigration(migrationName);
    logger.info(`Migration ${migrationName} executada com sucesso`);
    return true;
  } catch (error) {
    logger.error(`Erro ao executar migration específica ${migrationName}:`, error);
    throw error;
  }
};

// Verificar integridade do banco
const checkDatabaseIntegrity = async () => {
  try {
    await initDatabase();
    
    const checks = [];
    
    // Verificar se todas as tabelas existem
    for (const migrationName of migrations) {
      const tableName = migrationName.split('_').slice(2).join('_');
      const exists = await tableExists(tableName);
      checks.push({
        migration: migrationName,
        table: tableName,
        exists
      });
    }
    
    // Verificar integridade referencial
    const foreignKeyCheck = await query('PRAGMA foreign_key_check');
    
    return {
      tables: checks,
      foreign_key_errors: foreignKeyCheck,
      integrity_ok: checks.every(c => c.exists) && foreignKeyCheck.length === 0
    };
  } catch (error) {
    logger.error('Erro ao verificar integridade do banco:', error);
    throw error;
  }
};

// Interface de linha de comando
const runCLI = async () => {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'up':
      case 'migrate':
        await runMigrations();
        break;
        
      case 'down':
      case 'rollback':
        const migrationName = args[1];
        if (migrationName) {
          await rollbackMigration(migrationName);
        } else {
          await rollbackAllMigrations();
        }
        break;
        
      case 'status':
        const status = await getMigrationStatus();
        console.log('\n=== Status das Migrations ===');
        console.log(`Total: ${status.total}`);
        console.log(`Executadas: ${status.executed}`);
        console.log(`Pendentes: ${status.pending}\n`);
        
        status.migrations.forEach(m => {
          const symbol = m.executed ? '✓' : '✗';
          const date = m.executed_at ? ` (${m.executed_at})` : '';
          console.log(`${symbol} ${m.name}${date}`);
        });
        break;
        
      case 'run':
        const specificMigration = args[1];
        if (!specificMigration) {
          throw new Error('Nome da migration é obrigatório');
        }
        await runSpecificMigration(specificMigration);
        break;
        
      case 'check':
        const integrity = await checkDatabaseIntegrity();
        console.log('\n=== Verificação de Integridade ===');
        console.log(`Status: ${integrity.integrity_ok ? 'OK' : 'ERRO'}\n`);
        
        integrity.tables.forEach(t => {
          const symbol = t.exists ? '✓' : '✗';
          console.log(`${symbol} Tabela ${t.table} (${t.migration})`);
        });
        
        if (integrity.foreign_key_errors.length > 0) {
          console.log('\nErros de chave estrangeira:');
          integrity.foreign_key_errors.forEach(err => console.log(err));
        }
        break;
        
      default:
        console.log(`
Uso: node migrate.js <comando> [opções]

Comandos:
  up, migrate           Executar todas as migrations pendentes
  down, rollback [nome] Reverter migration específica ou todas
  status                Mostrar status das migrations
  run <nome>            Executar migration específica
  check                 Verificar integridade do banco

Exemplos:
  node migrate.js up
  node migrate.js down 001_create_users
  node migrate.js status
  node migrate.js run 001_create_users
  node migrate.js check
        `);
        break;
    }
  } catch (error) {
    logger.error('Erro na execução do comando:', error);
    process.exit(1);
  }
};

// Exportar funções para uso programático
module.exports = {
  runMigrations,
  rollbackAllMigrations,
  rollbackMigration,
  getMigrationStatus,
  runSpecificMigration,
  checkDatabaseIntegrity,
  executeMigration,
  migrations
};

// Executar CLI se chamado diretamente
if (require.main === module) {
  runCLI()
    .then(() => {
      logger.info('Comando executado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Erro na execução:', error);
      process.exit(1);
    });
}