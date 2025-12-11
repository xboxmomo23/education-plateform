import { Request, Response } from 'express';
import { getChildrenForParent } from '../models/parent.model';

export async function getParentChildrenHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'parent') {
      res.status(403).json({
        success: false,
        error: 'Accès réservé aux parents',
      });
      return;
    }

    const children = await getChildrenForParent(req.user.userId);
    res.status(200).json({
      success: true,
      data: children,
    });
  } catch (error) {
    console.error('[ParentController] getParentChildrenHandler error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des enfants',
    });
  }
}

export async function checkParentChildAccessHandler(req: Request, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    data: {
      ok: true,
      studentId: req.params.studentId,
    },
  });
}
