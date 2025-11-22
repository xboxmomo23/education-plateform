import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { generalLimiter, helmetConfig } from './middleware/security.middleware';
import authRoutes from './routes/auth.routes';
import gradeRoutes from './routes/grade.routes';
import courseRoutes from './routes/course.routes';
import timetableRoutes from './routes/timetable.routes';
//import attendanceRoutes from './routes/attendance.routes';

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
app.use('/api/courses', courseRoutes);
app.use('/api/timetable', timetableRoutes);
//app.use('/api/attendance', attendanceRoutes);

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