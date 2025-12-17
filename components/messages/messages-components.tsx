"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Mail,
  MailOpen,
  Send,
  Reply,
  Trash2,
  User,
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
} from 'lucide-react'
import {
  messagesApi,
  InboxMessage,
  SendMessagePayload,
  MessageTarget,
  RecipientsResponse,
  RecipientTeacher,
  RecipientStaff,
  RecipientStudent,
  RecipientClass,
  isMessageUnread,
  formatMessageDate,
  formatMessageDateFull,
  getRoleLabel,
  truncateText,
} from '@/lib/api/messages'
import { useI18n } from "@/components/providers/i18n-provider"

// =========================
// TYPES PROPS
// =========================

interface MessagesListProps {
  messages: InboxMessage[];
  loading: boolean;
  onMessageClick: (message: InboxMessage) => void;
  onRefresh: () => void;
  selectedMessageId?: string;
}

interface MessageDetailProps {
  message: InboxMessage | null;
  onClose: () => void;
  onReply: (message: InboxMessage) => void;
  onDelete: (messageId: string) => void;
}

interface ComposeMessageProps {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
  replyTo?: InboxMessage | null;
  userRole: 'student' | 'teacher' | 'staff' | 'admin';
}

// =========================
// COMPOSANT: MessagesList
// =========================

export function MessagesList({
  messages,
  loading,
  onMessageClick,
  onRefresh,
  selectedMessageId,
}: MessagesListProps) {
  const { t } = useI18n()
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        {t("common.states.loading")}
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <p className="text-muted-foreground">{t("common.states.empty")}</p>
        <Button variant="outline" onClick={onRefresh} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("common.actions.refresh")}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {messages.map((message) => {
        const unread = isMessageUnread(message)
        const isSelected = selectedMessageId === message.id

        return (
          <div
            key={message.id}
            onClick={() => onMessageClick(message)}
            className={`
              p-4 rounded-lg border cursor-pointer transition-all
              ${unread ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-200'}
              ${isSelected ? 'ring-2 ring-primary' : ''}
              hover:shadow-md
            `}
          >
            <div className="flex items-start gap-3">
              {/* Icône lu/non lu */}
              <div className="flex-shrink-0 mt-1">
                {unread ? (
                  <Mail className="h-5 w-5 text-blue-600" />
                ) : (
                  <MailOpen className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                {/* Ligne 1: Expéditeur + Date */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${unread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {message.sender_name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {getRoleLabel(message.sender_role)}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatMessageDate(message.created_at)}
                  </span>
                </div>

                {/* Ligne 2: Sujet */}
                <h4 className={`text-sm ${unread ? 'font-semibold' : 'font-medium'} text-gray-900 truncate`}>
                  {message.subject}
                </h4>

                {/* Ligne 3: Aperçu du corps */}
                <p className="text-sm text-gray-500 truncate mt-1">
                  {truncateText(message.body, 80)}
                </p>
              </div>

              {/* Badge non lu */}
              {unread && (
                <Badge className="bg-blue-600 text-white flex-shrink-0">
                  Nouveau
                </Badge>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// =========================
// COMPOSANT: MessageDetail
// =========================

export function MessageDetail({
  message,
  onClose,
  onReply,
  onDelete,
}: MessageDetailProps) {
  if (!message) return null

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{message.subject}</CardTitle>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span className="font-medium text-gray-700">{message.sender_name}</span>
                <Badge variant="outline" className="text-xs ml-1">
                  {getRoleLabel(message.sender_role)}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{formatMessageDateFull(message.created_at)}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto py-6">
        <div className="prose prose-sm max-w-none">
          {message.body.split('\n').map((paragraph, idx) => (
            <p key={idx} className="mb-2">
              {paragraph}
            </p>
          ))}
        </div>
      </CardContent>

      <div className="flex-shrink-0 border-t p-4 flex gap-2">
        <Button onClick={() => onReply(message)} className="flex-1">
          <Reply className="h-4 w-4 mr-2" />
          Répondre
        </Button>
        <Button
          variant="outline"
          onClick={() => onDelete(message.id)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}

// =========================
// COMPOSANT: ComposeMessage
// =========================

export function ComposeMessage({
  open,
  onClose,
  onSent,
  replyTo,
  userRole,
}: ComposeMessageProps) {
  const [recipients, setRecipients] = useState<RecipientsResponse | null>(null)
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()

  // Formulaire
  const [targetType, setTargetType] = useState<string>('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  // Charger les destinataires possibles
  useEffect(() => {
    if (open && !recipients) {
      loadRecipients()
    }
  }, [open])

  // Pré-remplir pour une réponse
  useEffect(() => {
    if (replyTo) {
      setTargetType('user')
      setSelectedUsers([replyTo.sender_id])
      setSubject(`Re: ${replyTo.subject}`)
      setBody(`\n\n---\nMessage original de ${replyTo.sender_name} :\n${replyTo.body}`)
    } else {
      resetForm()
    }
  }, [replyTo])

  const loadRecipients = async () => {
    try {
      setLoadingRecipients(true)
      const response = await messagesApi.getRecipients()
      if (response.success) {
        setRecipients(response.data)
      }
    } catch (err) {
      console.error('Erreur chargement destinataires:', err)
    } finally {
      setLoadingRecipients(false)
    }
  }

  const resetForm = () => {
    setTargetType('')
    setSelectedUsers([])
    setSelectedClass('')
    setSubject('')
    setBody('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const buildTarget = (): MessageTarget | null => {
    switch (targetType) {
      case 'user':
        if (selectedUsers.length === 0) return null
        return { type: 'user', userIds: selectedUsers }
      case 'class':
        if (!selectedClass) return null
        return { type: 'class', classId: selectedClass }
      case 'all_students':
        return { type: 'all_students' }
      case 'all_teachers':
        return { type: 'all_teachers' }
      default:
        return null
    }
  }

  const handleSend = async () => {
    setError(null)

    if (!subject.trim()) {
      setError('Le sujet est obligatoire')
      return
    }
    if (!body.trim()) {
      setError('Le message est obligatoire')
      return
    }

    const target = buildTarget()
    if (!target) {
      setError('Veuillez sélectionner un destinataire')
      return
    }

    try {
      setSending(true)

      const payload: SendMessagePayload = {
        subject: subject.trim(),
        body: body.trim(),
        target,
        parentMessageId: replyTo?.id || null,
      }

      const response = await messagesApi.sendMessage(payload)

      if (response.success) {
        handleClose()
        onSent()
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi')
    } finally {
      setSending(false)
    }
  }

  // Options de type de destinataire selon le rôle
  const getTargetOptions = () => {
    const options: { value: string; label: string }[] = []

    options.push({ value: 'user', label: 'Personne(s) spécifique(s)' })

    if (userRole === 'teacher' || userRole === 'staff' || userRole === 'admin') {
      options.push({ value: 'class', label: 'Une classe entière' })
    }

    if ((userRole === 'staff' || userRole === 'admin') && recipients?.canSendToAllStudents) {
      options.push({ value: 'all_students', label: 'Tous les élèves' })
    }

    if ((userRole === 'staff' || userRole === 'admin') && recipients?.canSendToAllTeachers) {
      options.push({ value: 'all_teachers', label: 'Tous les professeurs' })
    }

    return options
  }

  // Fusionner tous les utilisateurs pour la sélection individuelle
  const getAllUsers = (): { id: string; name: string; detail: string }[] => {
    const users: { id: string; name: string; detail: string }[] = []

    if (recipients?.teachers) {
      recipients.teachers.forEach(t => {
        users.push({
          id: t.id,
          name: t.full_name,
          detail: t.subject_name ? `Prof. - ${t.subject_name}` : 'Professeur',
        })
      })
    }

    if (recipients?.staff) {
      recipients.staff.forEach(s => {
        users.push({
          id: s.id,
          name: s.full_name,
          detail: s.department || 'Personnel',
        })
      })
    }

    if (recipients?.students) {
      recipients.students.forEach(s => {
        users.push({
          id: s.id,
          name: s.full_name,
          detail: `Élève - ${s.class_label}`,
        })
      })
    }

    return users
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {replyTo ? 'Répondre au message' : 'Nouveau message'}
          </DialogTitle>
          <DialogDescription>
            {replyTo
              ? `Réponse à ${replyTo.sender_name}`
              : 'Composez votre message'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Type de destinataire */}
          {!replyTo && (
            <div className="space-y-2">
              <Label>Type de destinataire</Label>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir le type de destinataire" />
                </SelectTrigger>
                <SelectContent>
                  {getTargetOptions().map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sélection utilisateur(s) */}
          {targetType === 'user' && !replyTo && (
            <div className="space-y-2">
              <Label>Destinataire(s)</Label>
              {loadingRecipients ? (
                <div className="text-sm text-muted-foreground">Chargement...</div>
              ) : (
                <Select
                  value={selectedUsers[0] || ''}
                  onValueChange={(val) => setSelectedUsers([val])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un destinataire" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllUsers().map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <span>{user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({user.detail})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Sélection classe */}
          {targetType === 'class' && (
            <div className="space-y-2">
              <Label>Classe</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {recipients?.classes?.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      <div className="flex items-center gap-2">
                        <span>{cls.label}</span>
                        <span className="text-xs text-muted-foreground">
                          ({cls.student_count} élèves)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Indicateur envoi groupé */}
          {(targetType === 'all_students' || targetType === 'all_teachers') && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Users className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-amber-800">
                {targetType === 'all_students'
                  ? 'Le message sera envoyé à tous les élèves de l\'établissement'
                  : 'Le message sera envoyé à tous les professeurs de l\'établissement'
                }
              </span>
            </div>
          )}

          {/* Sujet */}
          <div className="space-y-2">
            <Label htmlFor="subject">Sujet</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet du message"
              maxLength={200}
            />
          </div>

          {/* Corps du message */}
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Écrivez votre message..."
              rows={8}
              maxLength={10000}
            />
          </div>

          {/* Erreur */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {t("common.states.loading")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t("common.actions.send")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =========================
// COMPOSANT: MessagesInbox (Page complète)
// =========================

interface MessagesInboxProps {
  userRole: 'student' | 'teacher' | 'staff' | 'admin';
}

export function MessagesInbox({ userRole }: MessagesInboxProps) {
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [replyTo, setReplyTo] = useState<InboxMessage | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const { t } = useI18n()

  // Charger les messages au montage
  useEffect(() => {
    loadMessages()
  }, [filter])

  const loadMessages = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await messagesApi.getInbox({
        onlyUnread: filter === 'unread',
      })

      if (response.success) {
        setMessages(response.data)
      }
    } catch (err: any) {
      console.error('Erreur chargement messages:', err)
      setError(err.message || 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleMessageClick = async (message: InboxMessage) => {
    setSelectedMessage(message)

    // Marquer comme lu si non lu
    if (isMessageUnread(message)) {
      try {
        await messagesApi.markAsRead(message.id)
        // Mettre à jour localement
        setMessages(prev =>
          prev.map(m =>
            m.id === message.id ? { ...m, read_at: new Date().toISOString() } : m
          )
        )
      } catch (err) {
        console.error('Erreur marquage lu:', err)
      }
    }
  }

  const handleReply = (message: InboxMessage) => {
    setReplyTo(message)
    setComposeOpen(true)
  }

  const handleDelete = async (messageId: string) => {
    if (!confirm('Supprimer ce message ?')) return

    try {
      await messagesApi.deleteMessage(messageId)
      setMessages(prev => prev.filter(m => m.id !== messageId))
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null)
      }
    } catch (err) {
      console.error('Erreur suppression:', err)
    }
  }

  const handleComposeSent = () => {
    setReplyTo(null)
    loadMessages()
  }

  const handleComposeClose = () => {
    setComposeOpen(false)
    setReplyTo(null)
  }

  const unreadCount = messages.filter(isMessageUnread).length

  return (
    <div className="container mx-auto p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Messages
          </h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0
              ? `${unreadCount} message${unreadCount > 1 ? 's' : ''} non lu${unreadCount > 1 ? 's' : ''}`
              : 'Tous les messages sont lus'
            }
          </p>
        </div>

        <Button onClick={() => setComposeOpen(true)}>
          <Send className="h-4 w-4 mr-2" />
          Nouveau message
        </Button>
      </div>

      {/* Filtres */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Afficher :</span>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Tous
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Non lus
                {unreadCount > 0 && (
                  <Badge className="ml-2 bg-blue-600">{unreadCount}</Badge>
                )}
              </Button>
            </div>

            <Button variant="ghost" size="sm" onClick={loadMessages} className="ml-auto">
              <RefreshCw className="h-4 w-4 mr-1" />
              {t("common.actions.refresh")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contenu principal */}
      {error ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <p className="text-red-600">{error}</p>
          <Button variant="outline" onClick={loadMessages} className="mt-4">
            Réessayer
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Liste des messages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Boîte de réception</CardTitle>
            </CardHeader>
            <CardContent>
              <MessagesList
                messages={messages}
                loading={loading}
                onMessageClick={handleMessageClick}
                onRefresh={loadMessages}
                selectedMessageId={selectedMessage?.id}
              />
            </CardContent>
          </Card>

          {/* Détail du message */}
          {selectedMessage ? (
            <MessageDetail
              message={selectedMessage}
              onClose={() => setSelectedMessage(null)}
              onReply={handleReply}
              onDelete={handleDelete}
            />
          ) : (
            <Card className="flex items-center justify-center">
              <CardContent className="text-center py-12">
                <MailOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-muted-foreground">
                  Sélectionnez un message pour le lire
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modal de composition */}
      <ComposeMessage
        open={composeOpen}
        onClose={handleComposeClose}
        onSent={handleComposeSent}
        replyTo={replyTo}
        userRole={userRole}
      />
    </div>
  )
}
