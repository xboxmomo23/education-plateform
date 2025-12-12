import { Request, Response } from 'express'
import pool from '../config/database'
import { MessageModel, type MessageTarget } from '../models/message.model'

async function getStudentEstablishmentId(studentId: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT establishment_id FROM users WHERE id = $1',
    [studentId]
  )
  return result.rows[0]?.establishment_id || null
}

export async function getParentThreadsHandler(req: Request, res: Response) {
  try {
    const { studentId } = req.params
    const establishmentId = await getStudentEstablishmentId(studentId)

    if (!establishmentId) {
      return res.status(404).json({
        success: false,
        error: "Impossible de déterminer l'établissement de cet élève",
      })
    }

    const threads = await MessageModel.getThreadsForParticipant(studentId, establishmentId)

    return res.json({
      success: true,
      data: threads,
    })
  } catch (error) {
    console.error('[ParentMessages] getParentThreadsHandler error:', error)
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des conversations',
    })
  }
}

export async function getParentThreadMessagesHandler(req: Request, res: Response) {
  try {
    const { studentId, threadId } = req.params
    const { markAsRead } = req.query

    const establishmentId = await getStudentEstablishmentId(studentId)

    if (!establishmentId) {
      return res.status(404).json({
        success: false,
        error: "Impossible de déterminer l'établissement de cet élève",
      })
    }

    const messages = await MessageModel.getThreadMessagesForParticipant(threadId, studentId, establishmentId)

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conversation introuvable ou inaccessible',
      })
    }

    if (markAsRead !== 'false') {
      const unreadMessages = messages.filter(
        (message) => message.sender_id !== studentId && !message.read_at
      )

      for (const unread of unreadMessages) {
        await MessageModel.markAsRead(unread.id, studentId, establishmentId)
      }
    }

    return res.json({
      success: true,
      data: messages,
    })
  } catch (error) {
    console.error('[ParentMessages] getParentThreadMessagesHandler error:', error)
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des messages de la conversation',
    })
  }
}

export async function sendParentMessageHandler(req: Request, res: Response) {
  try {
    const parentId = req.user!.userId
    const { studentId } = req.params
    const { subject, body, target, parentMessageId } = req.body as {
      subject: string
      body: string
      target: MessageTarget
      parentMessageId?: string | null
    }

    const establishmentId = await getStudentEstablishmentId(studentId)

    if (!establishmentId) {
      return res.status(404).json({
        success: false,
        error: "Impossible de déterminer l'établissement de cet élève",
      })
    }

    const result = await MessageModel.sendMessage({
      senderId: parentId,
      establishmentId,
      subject,
      body,
      parentMessageId: parentMessageId || null,
      target,
    })

    if (!result.recipientIds.includes(studentId)) {
      await MessageModel.addRecipients(result.message.id, [studentId])
    }

    return res.status(201).json({
      success: true,
      data: {
        message: result.message,
        recipientCount: result.recipientCount,
      },
    })
  } catch (error: any) {
    console.error('[ParentMessages] sendParentMessageHandler error:', error)

    if (error.message === 'Aucun destinataire trouvé') {
      return res.status(400).json({
        success: false,
        error: 'Aucun destinataire trouvé pour cette cible',
      })
    }

    return res.status(500).json({
      success: false,
      error: "Erreur lors de l'envoi du message",
    })
  }
}

export async function getParentContactsHandler(req: Request, res: Response) {
  try {
    const { studentId } = req.params

    const establishmentId = await getStudentEstablishmentId(studentId)

    if (!establishmentId) {
      return res.status(404).json({
        success: false,
        error: "Impossible de déterminer l'établissement de cet élève",
      })
    }

    const teachers = await MessageModel.getTeachersForStudent(studentId, establishmentId)
    const staff = await MessageModel.getStaffForEstablishment(establishmentId)

    return res.json({
      success: true,
      data: {
        teachers,
        staff,
      },
    })
  } catch (error) {
    console.error('[ParentMessages] getParentContactsHandler error:', error)
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des contacts',
    })
  }
}
