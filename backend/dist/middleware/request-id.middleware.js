"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = requestIdMiddleware;
const crypto_1 = __importDefault(require("crypto"));
const REQUEST_ID_HEADER = "x-request-id";
function requestIdMiddleware(req, res, next) {
    const incomingHeader = req.header(REQUEST_ID_HEADER);
    const requestId = incomingHeader && incomingHeader.trim().length > 0
        ? incomingHeader.trim()
        : crypto_1.default.randomUUID();
    req.requestId = requestId;
    res.locals.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
}
//# sourceMappingURL=request-id.middleware.js.map