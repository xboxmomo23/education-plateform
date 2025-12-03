import { Request, Response } from 'express';
import pool from '../config/database';
import { AssignmentModel, AssignmentFilters, AssignmentStatus } from '../models/assignment.model';

// ============================================
// HANDLERS - ENSEIGNANTS (TEACHERS/STAFF)
// ============================================

/**
 * GET /api/assignments/teacher/courses
 * Récupérer les cours du professeur connecté
 * (Pour pouvoir créer des devoirs)
 */
export async function getTeacherCoursesHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;

    console.log('📚 Récupération cours prof - User:', userId);

    // Récupérer tous les cours où le prof est assigné
    const query = `
      SELECT 
        c.id as course_id,
        c.title,
        c.class_id,
        c.subject_id,
        c.teacher_id,
        c.establishment_id,
        s.name as subject_name,
        s.code as subject_code,
        s.color as subject_color,
        cl.label as class_label,
        cl.code as class_code,
        cl.level as class_level,
        u.full_name as teacher_name
      FROM courses c
      JOIN subjects s ON c.subject_id = s.id
      JOIN classes cl ON c.class_id = cl.id
      JOIN users u ON c.teacher_id = u.id
      WHERE c.teacher_id = $1
        AND c.active = true
      ORDER BY cl.level, cl.label, s.name
    `;

    const result = await pool.query(query, [userId]);

    console.log(`✅ ${result.rows.length} cours trouvés pour le professeur`);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('❌ Erreur getTeacherCoursesHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des cours',
    });
  }
}

/**
 * GET /api/assignments/teacher
 * Récupérer les devoirs d'un enseignant avec filtres
 */
export async function getTeacherAssignmentsHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const { courseId, classId, status, fromDueAt, toDueAt } = req.query;

    console.log('📝 Récupération devoirs prof - User:', userId);

    const filters: AssignmentFilters = {};

    if (courseId && typeof courseId === 'string') {
      filters.courseId = courseId;
    }
    if (classId && typeof classId === 'string') {
      filters.classId = classId;
    }
    if (status && typeof status === 'string' && ['draft', 'published', 'archived'].includes(status)) {
      filters.status = status as AssignmentStatus;
    }
    if (fromDueAt && typeof fromDueAt === 'string') {
      filters.fromDueAt = fromDueAt;
    }
    if (toDueAt && typeof toDueAt === 'string') {
      filters.toDueAt = toDueAt;
    }

    const assignments = await AssignmentModel.getByTeacher(userId, filters);

    console.log(`✅ ${assignments.length} devoirs trouvés`);

    return res.json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    console.error('❌ Erreur getTeacherAssignmentsHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des devoirs',
    });
  }
}

/**
 * POST /api/assignments/teacher
 * Créer un nouveau devoir
 */
export async function createAssignmentHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const { course_id, title, description, due_at, status, resource_url, max_points } = req.body;

    console.log('📝 Création devoir - User:', userId, '- Cours:', course_id);

    // Validation des champs obligatoires
    if (!course_id || !title || !due_at) {
      return res.status(400).json({
        success: false,
        error: 'Les champs course_id, title et due_at sont obligatoires',
      });
    }

    // Récupérer l'establishment_id de l'utilisateur
    const establishmentId = await AssignmentModel.getUserEstablishment(userId);

    if (!establishmentId) {
      return res.status(400).json({
        success: false,
        error: 'Établissement non trouvé pour cet utilisateur',
      });
    }

    // Vérifier que le cours appartient à ce prof et à cet établissement
    const isOwner = await AssignmentModel.verifyCourseOwnership(course_id, userId, establishmentId);

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Ce cours ne vous appartient pas ou n\'est pas actif',
      });
    }

    // Créer le devoir
    const assignment = await AssignmentModel.create({
      course_id,
      title,
      description,
      due_at,
      status: status || 'draft',
      resource_url,
      max_points,
      created_by: userId,
      establishment_id: establishmentId,
    });

    console.log('✅ Devoir créé:', assignment.id);

    return res.status(201).json({
      success: true,
      message: 'Devoir créé avec succès',
      data: assignment,
    });
  } catch (error: any) {
    console.error('❌ Erreur createAssignmentHandler:', error);

    if (error.message === 'Cours non trouvé') {
      return res.status(404).json({
        success: false,
        error: 'Cours non trouvé',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du devoir',
    });
  }
}

/**
 * PATCH /api/assignments/teacher/:id
 * Modifier un devoir existant
 */
export async function updateAssignmentHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const { id: assignmentId } = req.params;
    const { title, description, due_at, status, resource_url, max_points, course_id } = req.body;

    console.log('📝 Modification devoir:', assignmentId, '- User:', userId);

    // Vérifier que le devoir existe et appartient au prof
    const existingAssignment = await AssignmentModel.getById(assignmentId);

    if (!existingAssignment) {
      return res.status(404).json({
        success: false,
        error: 'Devoir non trouvé',
      });
    }

    if (existingAssignment.created_by !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à modifier ce devoir',
      });
    }

    // Si le course_id change, vérifier que le nouveau cours appartient au prof
    if (course_id && course_id !== existingAssignment.course_id) {
      const establishmentId = await AssignmentModel.getUserEstablishment(userId);
      if (!establishmentId) {
        return res.status(400).json({
          success: false,
          error: 'Établissement non trouvé',
        });
      }

      const isOwner = await AssignmentModel.verifyCourseOwnership(course_id, userId, establishmentId);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Le nouveau cours ne vous appartient pas',
        });
      }
    }

    // Construire les données de mise à jour
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (due_at !== undefined) updateData.due_at = due_at;
    if (status !== undefined) updateData.status = status;
    if (resource_url !== undefined) updateData.resource_url = resource_url;
    if (max_points !== undefined) updateData.max_points = max_points;
    if (course_id !== undefined) updateData.course_id = course_id;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune donnée à mettre à jour',
      });
    }

    // Mettre à jour le devoir
    const assignment = await AssignmentModel.updateByTeacher(assignmentId, userId, updateData);

    console.log('✅ Devoir mis à jour:', assignment.id);

    return res.json({
      success: true,
      message: 'Devoir mis à jour avec succès',
      data: assignment,
    });
  } catch (error: any) {
    console.error('❌ Erreur updateAssignmentHandler:', error);

    if (error.message === 'Devoir non trouvé ou non autorisé') {
      return res.status(403).json({
        success: false,
        error: 'Devoir non trouvé ou non autorisé',
      });
    }

    if (error.message === 'Nouveau cours non trouvé') {
      return res.status(404).json({
        success: false,
        error: 'Nouveau cours non trouvé',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du devoir',
    });
  }
}

/**
 * DELETE /api/assignments/teacher/:id
 * Supprimer (archiver) un devoir
 */
export async function deleteAssignmentHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const { id: assignmentId } = req.params;

    console.log('🗑️ Suppression devoir:', assignmentId, '- User:', userId);

    // Vérifier que le devoir existe et appartient au prof
    const existingAssignment = await AssignmentModel.getById(assignmentId);

    if (!existingAssignment) {
      return res.status(404).json({
        success: false,
        error: 'Devoir non trouvé',
      });
    }

    if (existingAssignment.created_by !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à supprimer ce devoir',
      });
    }

    // Archiver plutôt que supprimer
    await AssignmentModel.updateByTeacher(assignmentId, userId, { status: 'archived' });

    console.log('✅ Devoir archivé:', assignmentId);

    return res.json({
      success: true,
      message: 'Devoir archivé avec succès',
    });
  } catch (error) {
    console.error('❌ Erreur deleteAssignmentHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du devoir',
    });
  }
}

// ============================================
// HANDLERS - ÉLÈVES (STUDENTS)
// ============================================

/**
 * GET /api/assignments/student
 * Récupérer les devoirs pour un élève
 */
export async function getStudentAssignmentsHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const { subjectId, fromDueAt, toDueAt } = req.query;

    console.log('📚 Récupération devoirs élève - User:', userId);

    const filters: { subjectId?: string; fromDueAt?: string; toDueAt?: string } = {};

    if (subjectId && typeof subjectId === 'string') {
      filters.subjectId = subjectId;
    }
    if (fromDueAt && typeof fromDueAt === 'string') {
      filters.fromDueAt = fromDueAt;
    }
    if (toDueAt && typeof toDueAt === 'string') {
      filters.toDueAt = toDueAt;
    }

    const assignments = await AssignmentModel.getForStudent(userId, filters);

    console.log(`✅ ${assignments.length} devoirs trouvés pour l'élève`);

    return res.json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    console.error('❌ Erreur getStudentAssignmentsHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des devoirs',
    });
  }
}

/**
 * GET /api/assignments/student/:id
 * Récupérer un devoir spécifique pour un élève
 */
export async function getStudentAssignmentByIdHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const { id: assignmentId } = req.params;

    console.log('📚 Récupération devoir élève:', assignmentId, '- User:', userId);

    // Récupérer le devoir
    const assignment = await AssignmentModel.getById(assignmentId);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Devoir non trouvé',
      });
    }

    // Vérifier que l'élève a accès à ce devoir (même classe + publié)
    if (assignment.status !== 'published') {
      return res.status(403).json({
        success: false,
        error: 'Ce devoir n\'est pas accessible',
      });
    }

    // TODO: Vérifier que l'élève est dans la bonne classe
    // Pour simplifier, on retourne le devoir s'il est publié

    return res.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    console.error('❌ Erreur getStudentAssignmentByIdHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du devoir',
    });
  }
}