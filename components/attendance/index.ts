// ============================================
// COMPOSANTS ATTENDANCE - EXPORTS
// ============================================

// Composants principaux
export { AttendanceStatusSelector, CompactStatusSelector, StatusBadge } from './AttendanceStatusSelector'
export { AttendanceSessionHeader } from './AttendanceSessionHeader'
export { StudentRow, StudentCard } from './StudentRow'

// Types (réexportés depuis l'API)
export type { 
  AttendanceStatus,
  AttendanceSession,
  StudentForAttendance,
  TeacherWeekCourse,
  AttendanceRecord,
} from '@/lib/api/attendance'
