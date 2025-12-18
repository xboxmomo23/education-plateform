"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const email_service_1 = require("../services/email.service");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
router.use((req, res, next) => {
    if (process.env.NODE_ENV === "production") {
        res.status(404).json({
            success: false,
            error: "Route non disponible",
            requestId: req.requestId,
        });
        return;
    }
    next();
});
router.post("/test-email", async (req, res) => {
    const to = typeof req.body?.to === "string" ? req.body.to.trim() : "";
    const requestId = req.requestId;
    if (!to || !emailRegex.test(to)) {
        res.status(400).json({
            success: false,
            error: "Adresse email invalide",
            requestId,
        });
        return;
    }
    (0, logger_1.logInfo)({
        context: "DEV",
        event: "dev.testEmail.request",
        requestId,
        to,
    });
    try {
        await (0, email_service_1.sendTestEmail)(to, requestId);
        res.status(200).json({
            success: true,
            requestId,
        });
    }
    catch (error) {
        (0, logger_1.logError)({
            context: "DEV",
            event: "dev.testEmail.error",
            requestId,
            msg: error instanceof Error ? error.message : "Erreur inconnue",
            stack: error instanceof Error ? error.stack : undefined,
        });
        res.status(500).json({
            success: false,
            error: "Impossible d'envoyer l'email de test",
            requestId,
        });
    }
});
exports.default = router;
//# sourceMappingURL=dev.routes.js.map