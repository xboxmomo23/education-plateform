"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeSSEClient = removeSSEClient;
exports.emitAttendanceUpdate = emitAttendanceUpdate;
exports.getConnectedClientsCount = getConnectedClientsCount;
exports.sseStreamHandler = sseStreamHandler;
// =========================
// GESTION DES CLIENTS SSE
// =========================
const clients = new Map();
/**
 * Retirer un client SSE
 */
function removeSSEClient(sessionId, clientId) {
    const sessionClients = clients.get(sessionId);
    if (!sessionClients)
        return;
    const filtered = sessionClients.filter((c) => c.id !== clientId);
    if (filtered.length === 0) {
        clients.delete(sessionId);
    }
    else {
        clients.set(sessionId, filtered);
    }
    console.log(`[SSE] Client ${clientId} déconnecté de la session ${sessionId}`);
}
/**
 * Émettre une mise à jour à tous les clients d'une session
 */
function emitAttendanceUpdate(sessionId, update) {
    const sessionClients = clients.get(sessionId);
    if (!sessionClients || sessionClients.length === 0) {
        return;
    }
    const message = {
        ...update,
        timestamp: update.timestamp || new Date(),
    };
    const data = `data: ${JSON.stringify(message)}\n\n`;
    // Envoyer à tous les clients sauf celui qui a fait la modification
    sessionClients.forEach((client) => {
        if (client.userId !== update.updatedBy) {
            try {
                client.res.write(data);
            }
            catch (error) {
                console.error(`[SSE] Erreur d'envoi au client ${client.id}:`, error);
                removeSSEClient(sessionId, client.id);
            }
        }
    });
    console.log(`[SSE] Mise à jour émise pour la session ${sessionId} (${sessionClients.length} clients)`);
}
/**
 * Ping périodique pour garder les connexions actives
 */
setInterval(() => {
    clients.forEach((sessionClients, sessionId) => {
        sessionClients.forEach((client) => {
            try {
                client.res.write(': ping\n\n');
            }
            catch (error) {
                console.error(`[SSE] Erreur de ping pour client ${client.id}:`, error);
                removeSSEClient(sessionId, client.id);
            }
        });
    });
}, 30000); // Ping toutes les 30 secondes
/**
 * Obtenir le nombre de clients connectés par session
 */
function getConnectedClientsCount(sessionId) {
    if (sessionId) {
        return clients.get(sessionId)?.length || 0;
    }
    let total = 0;
    clients.forEach((sessionClients) => {
        total += sessionClients.length;
    });
    return total;
}
/**
 * Handler SSE pour Express
 * GET /api/attendance/sessions/:id/stream
 */
function sseStreamHandler(req, res) {
    const { id: sessionId } = req.params;
    const { userId } = req.user;
    // Vérifier les permissions (déjà fait par le middleware)
    // Configurer SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    // Message initial de connexion
    res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);
    // Ajouter le client à la map
    const clientId = `${userId}-${Date.now()}`;
    const client = { id: clientId, userId, sessionId, res };
    const sessionClients = clients.get(sessionId) || [];
    sessionClients.push(client);
    clients.set(sessionId, sessionClients);
    console.log(`[SSE] Client ${clientId} connecté à la session ${sessionId}`);
    // Cleanup lors de la déconnexion
    req.on('close', () => {
        removeSSEClient(sessionId, clientId);
        res.end();
    });
}
//# sourceMappingURL=attendance.sse.js.map