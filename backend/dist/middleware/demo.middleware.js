"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoReadOnlyGuard = demoReadOnlyGuard;
exports.demoDataMiddleware = demoDataMiddleware;
const demo_1 = require("../config/demo");
const sampleData_1 = require("../demo/sampleData");
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const ALLOWED_MUTATION_PATHS = [/^\/api\/auth\//];
function demoReadOnlyGuard(req, res, next) {
    if (!demo_1.DEMO_MODE) {
        return next();
    }
    if (SAFE_METHODS.includes(req.method.toUpperCase())) {
        return next();
    }
    if (ALLOWED_MUTATION_PATHS.some((regex) => regex.test(req.originalUrl || req.path))) {
        return next();
    }
    return res.status(403).json({
        success: false,
        error: 'Mode démonstration actif : opérations d’écriture désactivées.',
    });
}
function demoDataMiddleware(req, res, next) {
    if (!demo_1.DEMO_MODE || req.method.toUpperCase() !== 'GET') {
        return next();
    }
    const match = sampleData_1.demoResponses.find((entry) => entry.method === req.method && entry.pattern.test(req.originalUrl || req.path));
    if (!match) {
        return next();
    }
    const body = match.body;
    const responseBody = typeof body === 'function' ? body(req) : body;
    return res.json(responseBody);
}
//# sourceMappingURL=demo.middleware.js.map