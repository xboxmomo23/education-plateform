import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { generalLimiter, helmetConfig } from './middleware/security.middleware';
import { authenticate } from './middleware/auth.middleware';
import authRoutes from './routes/auth.routes';
import gradeRoutes from './routes/grade.routes';
import termRoutes from './routes/term.routes';
import studentRoutes from './routes/student.routes';
import courseRoutes from './routes/course.routes';
import reportCardRoutes from './routes/reportCard.routes';
import { getAllClasses } from './controllers/class.controller';
import timetableRoutes from './routes/timetable.routes';
import timetableInstanceRoutes from './routes/timetable-instance.routes';
import establishmentRoutes from './routes/establishment.routes';
import attendanceRoutes from './routes/attendance.routes';
import superAdminRoutes from './routes/super-admin.routes';
import adminRoutes from './routes/admin.routes';
import assignmentRoutes from './routes/assignment.routes';
import messageRoutes from './routes/message.routes';  // ✨ NOUVEAU: Routes de messagerie
import parentRoutes from './routes/parent.routes';
import parentMessagesRoutes from './routes/parent-messages.routes';
import parentAttendanceRoutes from './routes/parent-attendance.routes';
import parentDashboardRoutes from './routes/parent-dashboard.routes';
import staffRoutes from './routes/staff.routes';
import staffAbsencesRoutes from './routes/staff-absences.routes';
import dashboardStaffRoutes from './routes/dashboard-staff.routes';
import teacherRoutes from './routes/teacher.routes';
import auditRoutes from './routes/audit.routes';
import { demoReadOnlyGuard, demoDataMiddleware } from './middleware/demo.middleware';



// Charger les variables d'environnement
dotenv.config();

const app = express();

// =========================
// Middlewares Globaux
// =========================

// Sécurité HTTP headers
app.use(helmetConfig);

// CORS - Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Parser JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Demo mode guard
app.use(demoReadOnlyGuard);
app.use(demoDataMiddleware);

// Logging des requêtes
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting global
app.use('/api/', generalLimiter);

// =========================
// Routes
// =========================

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'EduPilot API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Routes d'API
app.use('/api/auth', authRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/terms', termRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/report-cards', reportCardRoutes);

// Routes spécifiques AVANT les générales
app.use('/api/timetable/instances', timetableInstanceRoutes);  // ← Spécifique en premier
app.use('/api/timetable', timetableRoutes);  // ← Général à la fin

app.use('/api/establishment', establishmentRoutes);

app.use('/api/attendance', attendanceRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/admin', adminRoutes);

// Routes des devoirs
app.use('/api/assignments', assignmentRoutes);

// ✨ NOUVEAU : Routes de messagerie
app.use('/api/messages', messageRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/parent', parentMessagesRoutes);
app.use('/api/parent', parentAttendanceRoutes);
app.use('/api/parent', parentDashboardRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/dashboard/staff', dashboardStaffRoutes);
app.use('/api/staff/absences', staffAbsencesRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin/audit', auditRoutes);


// Route classes
app.get('/api/classes', authenticate, getAllClasses);


// Route 404
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
    path: req.originalUrl,
  });
});

// =========================
// Gestion des Erreurs Globale
// =========================

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

app.use((err: ErrorWithStatus, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Erreur globale:', err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Erreur serveur interne';

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});


export default app;
