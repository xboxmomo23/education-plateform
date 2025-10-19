"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.testConnection = testConnection;
exports.query = query;
exports.getClient = getClient;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Configuration du pool de connexions PostgreSQL
const poolConfig = {
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
exports.pool = new pg_1.Pool(poolConfig);
// Gestion des erreurs du pool
exports.pool.on('error', (err) => {
    console.error('❌ Erreur inattendue du pool PostgreSQL:', err);
    process.exit(-1);
});
// Fonction pour tester la connexion
async function testConnection() {
    try {
        const client = await exports.pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Connexion PostgreSQL établie:', result.rows[0].now);
        return true;
    }
    catch (error) {
        console.error('❌ Erreur de connexion PostgreSQL:', error);
        return false;
    }
}
// Fonction utilitaire pour exécuter des requêtes
async function query(text, params) {
    const start = Date.now();
    try {
        const result = await exports.pool.query(text, params);
        const duration = Date.now() - start;
        console.log('📊 Requête exécutée', { text, duration, rows: result.rowCount });
        return result;
    }
    catch (error) {
        console.error('❌ Erreur de requête', { text, error });
        throw error;
    }
}
// Fonction pour obtenir un client avec transaction
async function getClient() {
    const client = await exports.pool.connect();
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
exports.default = exports.pool;
//# sourceMappingURL=database.js.map