"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const security_middleware_1 = require("./middleware/security.middleware");
const auth_middleware_1 = require("./middleware/auth.middleware");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const grade_routes_1 = __importDefault(require("./routes/grade.routes"));
const term_routes_1 = __importDefault(require("./routes/term.routes"));
const student_routes_1 = __importDefault(require("./routes/student.routes"));
const course_routes_1 = __importDefault(require("./routes/course.routes"));
const reportCard_routes_1 = __importDefault(require("./routes/reportCard.routes"));
const class_controller_1 = require("./controllers/class.controller");
const timetable_routes_1 = __importDefault(require("./routes/timetable.routes"));
const timetable_instance_routes_1 = __importDefault(require("./routes/timetable-instance.routes"));
const establishment_routes_1 = __importDefault(require("./routes/establishment.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const super_admin_routes_1 = __importDefault(require("./routes/super-admin.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const assignment_routes_1 = __importDefault(require("./routes/assignment.routes"));
const message_routes_1 = __importDefault(require("./routes/message.routes")); // ✨ NOUVEAU: Routes de messagerie
const parent_routes_1 = __importDefault(require("./routes/parent.routes"));
// Charger les variables d'environnement
dotenv_1.default.config();
const app = (0, express_1.default)();
// =========================
// Middlewares Globaux
// =========================
// Sécurité HTTP headers
app.use(security_middleware_1.helmetConfig);
// CORS - Configuration
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use((0, cors_1.default)(corsOptions));
// Parser JSON
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Logging des requêtes
if (process.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined'));
}
// Rate limiting global
app.use('/api/', security_middleware_1.generalLimiter);
// =========================
// Routes
// =========================
// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'EduPilot API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});
// Routes d'API
app.use('/api/auth', auth_routes_1.default);
app.use('/api/grades', grade_routes_1.default);
app.use('/api/terms', term_routes_1.default);
app.use('/api/students', student_routes_1.default);
app.use('/api/courses', course_routes_1.default);
app.use('/api/report-cards', reportCard_routes_1.default);
// Routes spécifiques AVANT les générales
app.use('/api/timetable/instances', timetable_instance_routes_1.default); // ← Spécifique en premier
app.use('/api/timetable', timetable_routes_1.default); // ← Général à la fin
app.use('/api/establishment', establishment_routes_1.default);
app.use('/api/attendance', attendance_routes_1.default);
app.use('/api/super-admin', super_admin_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
// Routes des devoirs
app.use('/api/assignments', assignment_routes_1.default);
// ✨ NOUVEAU : Routes de messagerie
app.use('/api/messages', message_routes_1.default);
app.use('/api/parent', parent_routes_1.default);
// Route classes
app.get('/api/classes', auth_middleware_1.authenticate, class_controller_1.getAllClasses);
// Route 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route non trouvée',
        path: req.originalUrl,
    });
});
app.use((err, req, res, next) => {
    console.error('❌ Erreur globale:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Erreur serveur interne';
    res.status(status).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map