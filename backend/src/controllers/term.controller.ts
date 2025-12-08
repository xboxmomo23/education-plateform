import { Request, Response } from 'express';
import {
  createTerm,
  findTerms,
  findTermById,
  updateTerm,
  deleteTerm,
  getCurrentTerm,
} from '../models/term.model';

// =========================
// TERMS - Gestion des périodes
// =========================

/**
 * POST /api/terms
 * Crée une nouvelle période (trimestre/semestre)
 */
export async function createTermHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    // Seuls admin et staff peuvent créer des périodes
    if (!['admin', 'staff'].includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Accès refusé' });
      return;
    }

    const { academicYear, name, startDate, endDate, isCurrent } = req.body;

    // Validation
    if (!academicYear || !name || !startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'Données manquantes',
        required: ['academicYear', 'name', 'startDate', 'endDate'],
      });
      return;
    }

    // Validation des dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      res.status(400).json({
        success: false,
        error: 'La date de fin doit être postérieure à la date de début',
      });
      return;
    }

    const establishmentId = req.user.establishmentId;
    if (!establishmentId) {
      res.status(403).json({
        success: false,
        error: 'Aucun établissement associé à ce compte',
      });
      return;
    }

    const term = await createTerm({
      academicYear,
      name,
      startDate: start,
      endDate: end,
      isCurrent: isCurrent || false,
      establishmentId,
    });

    res.status(201).json({
      success: true,
      message: 'Période créée avec succès',
      data: {
        id: term.id,
        academicYear: term.academic_year,
        name: term.name,
        startDate: term.start_date,
        endDate: term.end_date,
        isCurrent: term.is_current,
        establishmentId: term.establishment_id,
      },
    });
  } catch (error) {
    console.error('Erreur création période:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la période',
    });
  }
}

/**
 * GET /api/terms
 * Liste les périodes de l'établissement
 */
export async function getTermsHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { academicYear } = req.query;

    const establishmentId = req.user.establishmentId;
    if (!establishmentId) {
      res.status(403).json({
        success: false,
        error: 'Aucun établissement associé à ce compte',
      });
      return;
    }

    const filters = {
      establishmentId,
      academicYear: academicYear ? parseInt(academicYear as string) : undefined,
    };

    const terms = await findTerms(filters);

    // Mapper vers camelCase
    const mappedTerms = terms.map(term => ({
      id: term.id,
      academicYear: term.academic_year,
      name: term.name,
      startDate: term.start_date,
      endDate: term.end_date,
      isCurrent: term.is_current,
      establishmentId: term.establishment_id,
    }));

    res.json({
      success: true,
      data: mappedTerms,
    });
  } catch (error) {
    console.error('Erreur récupération périodes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des périodes',
    });
  }
}

/**
 * GET /api/terms/current
 * Récupère la période courante
 */
export async function getCurrentTermHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const establishmentId = req.user.establishmentId;
    if (!establishmentId) {
      res.status(403).json({
        success: false,
        error: 'Aucun établissement associé à ce compte',
      });
      return;
    }
    const term = await getCurrentTerm(establishmentId);

    if (!term) {
      res.json({
        success: true,
        data: null,
        message: 'Aucune période courante définie',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: term.id,
        academicYear: term.academic_year,
        name: term.name,
        startDate: term.start_date,
        endDate: term.end_date,
        isCurrent: term.is_current,
        establishmentId: term.establishment_id,
      },
    });
  } catch (error) {
    console.error('Erreur récupération période courante:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la période courante',
    });
  }
}

/**
 * GET /api/terms/:id
 * Récupère une période par ID
 */
export async function getTermByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { id } = req.params;
    const establishmentId = req.user.establishmentId;
    if (!establishmentId) {
      res.status(403).json({
        success: false,
        error: 'Aucun établissement associé à ce compte',
      });
      return;
    }

    const term = await findTermById(id, establishmentId);

    if (!term) {
      res.status(404).json({
        success: false,
        error: 'Période non trouvée',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: term.id,
        academicYear: term.academic_year,
        name: term.name,
        startDate: term.start_date,
        endDate: term.end_date,
        isCurrent: term.is_current,
        establishmentId: term.establishment_id,
      },
    });
  } catch (error) {
    console.error('Erreur récupération période:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la période',
    });
  }
}

/**
 * PUT /api/terms/:id
 * Modifie une période
 */
export async function updateTermHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    if (!['admin', 'staff'].includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Accès refusé' });
      return;
    }

    const { id } = req.params;
    const { name, startDate, endDate, isCurrent } = req.body;
    const establishmentId = req.user.establishmentId;
    if (!establishmentId) {
      res.status(403).json({
        success: false,
        error: 'Aucun établissement associé à ce compte',
      });
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (isCurrent !== undefined) updateData.isCurrent = isCurrent;

    // Validation des dates si fournies
    if (updateData.startDate && updateData.endDate) {
      if (updateData.endDate <= updateData.startDate) {
        res.status(400).json({
          success: false,
          error: 'La date de fin doit être postérieure à la date de début',
        });
        return;
      }
    }

    const updatedTerm = await updateTerm(id, updateData, establishmentId);

    if (!updatedTerm) {
      res.status(404).json({
        success: false,
        error: 'Période non trouvée',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Période modifiée avec succès',
      data: {
        id: updatedTerm.id,
        academicYear: updatedTerm.academic_year,
        name: updatedTerm.name,
        startDate: updatedTerm.start_date,
        endDate: updatedTerm.end_date,
        isCurrent: updatedTerm.is_current,
        establishmentId: updatedTerm.establishment_id,
      },
    });
  } catch (error) {
    console.error('Erreur modification période:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la modification de la période',
    });
  }
}

/**
 * DELETE /api/terms/:id
 * Supprime une période
 */
export async function deleteTermHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    if (!['admin'].includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Seul un admin peut supprimer une période' });
      return;
    }

    const { id } = req.params;
    const establishmentId = req.user.establishmentId;
    if (!establishmentId) {
      res.status(403).json({
        success: false,
        error: 'Aucun établissement associé à ce compte',
      });
      return;
    }

    const deleted = await deleteTerm(id, establishmentId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Période non trouvée',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Période supprimée avec succès',
    });
  } catch (error) {
    console.error('Erreur suppression période:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la période',
    });
  }
}
