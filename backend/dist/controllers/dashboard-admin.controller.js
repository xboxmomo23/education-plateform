"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminDashboardKpisHandler = getAdminDashboardKpisHandler;
exports.getAdminPerformanceHandler = getAdminPerformanceHandler;
const dashboard_admin_model_1 = require("../models/dashboard-admin.model");
const term_model_1 = require("../models/term.model");
function resolveEstablishmentId(req) {
    const { role, establishmentId } = req.user || {};
    if (role === 'super_admin') {
        const scopedId = req.query.establishmentId || establishmentId || null;
        if (!scopedId) {
            return { establishmentId: null, error: 'establishmentId requis pour super_admin' };
        }
        return { establishmentId: scopedId };
    }
    if (!establishmentId) {
        return { establishmentId: null, error: 'Aucun établissement associé' };
    }
    return { establishmentId };
}
function getParisDate() {
    const now = new Date();
    const parisString = now.toLocaleString('en-US', { timeZone: 'Europe/Paris' });
    const parisDate = new Date(parisString);
    return parisDate.toISOString().split('T')[0];
}
async function getAdminDashboardKpisHandler(req, res) {
    try {
        const scope = resolveEstablishmentId(req);
        if (!scope.establishmentId) {
            return res.status(400).json({
                success: false,
                error: scope.error || 'Établissement requis',
            });
        }
        const date = getParisDate();
        const data = await (0, dashboard_admin_model_1.getAdminKpis)(scope.establishmentId, date);
        return res.json({
            success: true,
            data,
        });
    }
    catch (error) {
        console.error('[DashboardAdmin] getAdminDashboardKpisHandler error:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors du chargement des indicateurs admin',
        });
    }
}
async function getAdminPerformanceHandler(req, res) {
    try {
        const scope = resolveEstablishmentId(req);
        if (!scope.establishmentId) {
            return res.status(400).json({
                success: false,
                error: scope.error || 'Établissement requis',
            });
        }
        const termId = req.query.termId || null;
        const classId = req.query.classId === 'all' ? null : (req.query.classId || null);
        let periodLabel = 'Année complète';
        let periodFrom;
        let periodTo;
        if (termId) {
            const term = await (0, term_model_1.findTermById)(termId, scope.establishmentId);
            if (!term) {
                return res.status(404).json({
                    success: false,
                    error: 'Période introuvable pour cet établissement',
                });
            }
            periodLabel = term.name;
            periodFrom = term.start_date.toISOString();
            periodTo = term.end_date.toISOString();
        }
        const data = await (0, dashboard_admin_model_1.getAdminPerformanceMetrics)(scope.establishmentId, {
            termId,
            classId,
        });
        return res.json({
            success: true,
            data: {
                period: {
                    termId,
                    label: periodLabel,
                    from: periodFrom,
                    to: periodTo,
                },
                ...data,
            },
        });
    }
    catch (error) {
        console.error('[DashboardAdmin] getAdminPerformanceHandler error:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors du chargement des performances',
        });
    }
}
//# sourceMappingURL=dashboard-admin.controller.js.map