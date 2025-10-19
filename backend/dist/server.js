"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const database_1 = require("./config/database");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PORT = process.env.PORT || 4000;
// =========================
// Démarrage du Serveur
// =========================
async function startServer() {
    try {
        // 1. Tester la connexion à la base de données
        console.log('🔌 Connexion à PostgreSQL...');
        const dbConnected = await (0, database_1.testConnection)();
        if (!dbConnected) {
            console.error('❌ Impossible de se connecter à la base de données');
            process.exit(1);
        }
        // 2. Démarrer le serveur Express
        const server = app_1.default.listen(PORT, () => {
            console.log('');
            console.log('✅ ========================================');
            console.log(`✅  EduPilot Backend Server Running`);
            console.log('✅ ========================================');
            console.log(`📍  URL: http://localhost:${PORT}`);
            console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🗄️   Database: ${process.env.PGDATABASE}`);
            console.log('✅ ========================================');
            console.log('');
        });
        // Gestion de l'arrêt gracieux
        process.on('SIGTERM', () => {
            console.log('👋 SIGTERM reçu, fermeture du serveur...');
            server.close(() => {
                console.log('✅ Serveur fermé proprement');
                process.exit(0);
            });
        });
        process.on('SIGINT', () => {
            console.log('\n👋 SIGINT reçu, fermeture du serveur...');
            server.close(() => {
                console.log('✅ Serveur fermé proprement');
                process.exit(0);
            });
        });
    }
    catch (error) {
        console.error('❌ Erreur fatale au démarrage:', error);
        process.exit(1);
    }
}
// Lancer le serveur
startServer();
//# sourceMappingURL=server.js.map