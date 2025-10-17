import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuration du pool de connexions PostgreSQL
const poolConfig: PoolConfig = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'edupilot',
  min: parseInt(process.env.PGPOOL_MIN || '2'),
  max: parseInt(process.env.PGPOOL_MAX || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Créer le pool de connexions
export const pool = new Pool(poolConfig);

// Gestion des erreurs du pool
pool.on('error', (err: Error) => {
  console.error('❌ Erreur inattendue du pool PostgreSQL:', err);
  process.exit(-1);
});

// Fonction pour tester la connexion
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Connexion PostgreSQL établie:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion PostgreSQL:', error);
    return false;
  }
}

// Fonction utilitaire pour exécuter des requêtes
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Requête exécutée', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('❌ Erreur de requête', { text, error });
    throw error;
  }
}

// Fonction pour obtenir un client avec transaction
export async function getClient() {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  // Wrapper pour gérer les transactions automatiquement
  const wrappedClient = {
    query,
    release,
    beginTransaction: () => client.query('BEGIN'),
    commit: () => client.query('COMMIT'),
    rollback: () => client.query('ROLLBACK'),
  };

  return wrappedClient;
}

export default pool;