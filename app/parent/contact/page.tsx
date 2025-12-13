"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Mail,
  MailOpen,
  RefreshCw,
  AlertCircle,
  Send,
  Reply,
  User,
} from "lucide-react"
import { useParentChild } from "@/components/parent/ParentChildContext"
import {
  parentMessagesApi,
  type ParentThreadSummary,
  type ParentThreadMessage,
  type ParentContactsResponse,
} from "@/lib/api/parent-messages"
import {
  formatMessageDate,
  formatMessageDateFull,
  getRoleLabel,
  truncateText,
} from "@/lib/api/messages"
import type { SendMessagePayload } from "@/lib/api/messages"

type FilterOption = "all" | "unread"

export default function ParentContactPage() {
  const { selectedChild } = useParentChild()
  const studentId = selectedChild?.id

  const [threads, setThreads] = useState<ParentThreadSummary[]>([])
  const [threadsLoading, setThreadsLoading] = useState(true)
  const [threadsError, setThreadsError] = useState<string | null>(null)
  const [selectedThread, setSelectedThread] = useState<ParentThreadSummary | null>(null)
  const [threadMessages, setThreadMessages] = useState<ParentThreadMessage[]>([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [filter, setFilter] = useState<FilterOption>("all")
  const [composeOpen, setComposeOpen] = useState(false)
  const [replyTo, setReplyTo] = useState<ParentThreadMessage | null>(null)
  const [contacts, setContacts] = useState<ParentContactsResponse | null>(null)
  const [contactsLoading, setContactsLoading] = useState(false)

  useEffect(() => {
    if (!studentId) return
    loadThreads()
    loadContacts()
  }, [studentId])

  const loadThreads = async () => {
    if (!studentId) return
    try {
      setThreadsLoading(true)
      setThreadsError(null)
      const response = await parentMessagesApi.getThreads(studentId)
      if (response.success) {
        setThreads(response.data)
      } else {
        setThreadsError(response.error || "Erreur lors du chargement")
      }
    } catch (err: any) {
      setThreadsError(err.message || "Erreur lors du chargement")
    } finally {
      setThreadsLoading(false)
    }
  }

  const loadThreadMessages = async (thread: ParentThreadSummary) => {
    if (!studentId) return
    try {
      setThreadLoading(true)
      const response = await parentMessagesApi.getThreadMessages(studentId, thread.thread_id)
      if (response.success) {
        setThreadMessages(response.data)
        setThreads(prev =>
          prev.map(t =>
            t.thread_id === thread.thread_id ? { ...t, unread_count: 0 } : t
          )
        )
      }
    } catch (err) {
      console.error("Erreur chargement conversation:", err)
    } finally {
      setThreadLoading(false)
    }
  }

  const loadContacts = async () => {
    if (!studentId) return
    try {
      setContactsLoading(true)
      const response = await parentMessagesApi.getContacts(studentId)
      if (response.success) {
        setContacts(response.data)
      }
    } catch (err) {
      console.error("Erreur chargement contacts:", err)
    } finally {
      setContactsLoading(false)
    }
  }

  const handleSelectThread = (thread: ParentThreadSummary) => {
    setSelectedThread(thread)
    loadThreadMessages(thread)
  }

  const handleReply = (message: ParentThreadMessage) => {
    setReplyTo(message)
    setComposeOpen(true)
  }

  const handleComposeClose = () => {
    setComposeOpen(false)
    setReplyTo(null)
  }

  const handleMessageSent = () => {
    handleComposeClose()
    loadThreads()
    if (selectedThread) {
      loadThreadMessages(selectedThread)
    }
  }

  const unreadCount = useMemo(
    () => threads.reduce((sum, thread) => sum + (thread.unread_count || 0), 0),
    [threads]
  )

  const filteredThreads = useMemo(() => {
    if (filter === "unread") {
      return threads.filter(thread => thread.unread_count > 0)
    }
    return threads
  }, [threads, filter])

  if (!child || !studentId) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6" />
          Messages parent
        </h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun enfant n’est associé à ce compte. Contactez l’établissement pour lier votre compte parent à un élève.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Messages concernant {child.full_name}
          </h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} message${unreadCount > 1 ? "s" : ""} non lu${unreadCount > 1 ? "s" : ""}`
              : "Tous les messages sont lus"}
          </p>
        </div>
        <Button onClick={() => setComposeOpen(true)}>
          <Send className="mr-2 h-4 w-4" />
          Nouveau message
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium">Afficher :</span>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              Tous
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("unread")}
            >
              Non lus
              {unreadCount > 0 && (
                <Badge className="ml-2 bg-blue-600">{unreadCount}</Badge>
              )}
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={loadThreads}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Actualiser
          </Button>
        </CardContent>
      </Card>

      {threadsError ? (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="text-red-600">{threadsError}</p>
          <Button variant="outline" className="mt-4" onClick={loadThreads}>
            Réessayer
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <ParentThreadList
                threads={filteredThreads}
                loading={threadsLoading}
                selectedThreadId={selectedThread?.thread_id || null}
                onSelect={handleSelectThread}
                onRefresh={loadThreads}
              />
            </CardContent>
          </Card>

          <ParentThreadDetail
            thread={selectedThread}
            messages={threadMessages}
            loading={threadLoading}
            onReply={handleReply}
            onRefresh={() => {
              if (selectedThread) {
                loadThreadMessages(selectedThread)
              }
            }}
          />
        </div>
      )}

      <ParentComposeDialog
        open={composeOpen}
        onClose={handleComposeClose}
        onSent={handleMessageSent}
        replyTo={replyTo}
        studentId={studentId}
        contacts={contacts}
        contactsLoading={contactsLoading}
        onRefreshContacts={loadContacts}
      />
    </div>
  )
}

interface ThreadListProps {
  threads: ParentThreadSummary[]
  loading: boolean
  selectedThreadId: string | null
  onSelect: (thread: ParentThreadSummary) => void
  onRefresh: () => void
}

function ParentThreadList({
  threads,
  loading,
  selectedThreadId,
  onSelect,
  onRefresh,
}: ThreadListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Chargement des conversations...
      </div>
    )
  }

  if (threads.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <p className="text-muted-foreground">Aucune conversation</p>
        <Button variant="outline" className="mt-4" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {threads.map(thread => {
        const unread = thread.unread_count > 0
        const isSelected = selectedThreadId === thread.thread_id

        return (
          <div
            key={thread.thread_id}
            onClick={() => onSelect(thread)}
            className={`cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md ${
              unread ? "border-blue-200 bg-blue-50/50" : "border-gray-200 bg-white"
            } ${isSelected ? "ring-2 ring-primary" : ""}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 flex-shrink-0">
                {unread ? (
                  <Mail className="h-5 w-5 text-blue-600" />
                ) : (
                  <MailOpen className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${unread ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                      {thread.last_sender_name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {getRoleLabel(thread.last_sender_role)}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatMessageDate(thread.last_message_at)}
                  </span>
                </div>
                <h4 className={`text-sm ${unread ? "font-semibold" : "font-medium"} text-gray-900 truncate`}>
                  {thread.subject}
                </h4>
                <p className="mt-1 text-sm text-gray-500 truncate">
                  {truncateText(thread.last_message_preview, 80)}
                </p>
              </div>
              {unread && (
                <Badge className="flex-shrink-0 bg-blue-600 text-white">
                  {thread.unread_count}
                </Badge>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface ThreadDetailProps {
  thread: ParentThreadSummary | null
  messages: ParentThreadMessage[]
  loading: boolean
  onReply: (message: ParentThreadMessage) => void
  onRefresh: () => void
}

function ParentThreadDetail({
  thread,
  messages,
  loading,
  onReply,
  onRefresh,
}: ThreadDetailProps) {
  if (!thread) {
    return (
      <Card className="flex items-center justify-center">
        <CardContent className="py-12 text-center text-muted-foreground">
          <MailOpen className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          Sélectionnez une conversation pour l’afficher
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{thread.subject}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {thread.message_count} message{thread.message_count > 1 ? "s" : ""}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center text-muted-foreground">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Chargement...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground">
            Aucun message dans cette conversation.
          </div>
        ) : (
          messages.map(message => (
            <div key={message.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-gray-700">
                  <User className="h-4 w-4" />
                  {message.sender_name}
                  <Badge variant="outline" className="text-xs">
                    {getRoleLabel(message.sender_role)}
                  </Badge>
                </div>
                <span>{formatMessageDateFull(message.created_at)}</span>
              </div>
              <div className="mt-3 whitespace-pre-line text-gray-800">{message.body}</div>
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => onReply(message)}>
                  <Reply className="mr-1 h-4 w-4" />
                  Répondre
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

interface ParentComposeDialogProps {
  open: boolean
  onClose: () => void
  onSent: () => void
  replyTo: ParentThreadMessage | null
  studentId: string
  contacts: ParentContactsResponse | null
  contactsLoading: boolean
  onRefreshContacts: () => void
}

function ParentComposeDialog({
  open,
  onClose,
  onSent,
  replyTo,
  studentId,
  contacts,
  contactsLoading,
  onRefreshContacts,
}: ParentComposeDialogProps) {
  const [selectedRecipient, setSelectedRecipient] = useState<string>("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (replyTo) {
      setSelectedRecipient(replyTo.sender_id)
      setSubject(`Re: ${replyTo.subject}`)
      setBody(`\n\n---\nMessage de ${replyTo.sender_name} :\n${replyTo.body}`)
      setError(null)
    } else if (!open) {
      resetForm()
    }
  }, [replyTo, open])

  const resetForm = () => {
    setSelectedRecipient("")
    setSubject("")
    setBody("")
    setError(null)
  }

  const usersOptions = useMemo(() => {
    const entries: { id: string; label: string }[] = []
    contacts?.teachers.forEach(teacher => {
      entries.push({
        id: teacher.id,
        label: teacher.subject_name ? `${teacher.full_name} (${teacher.subject_name})` : teacher.full_name,
      })
    })
    contacts?.staff.forEach(staff => {
      entries.push({
        id: staff.id,
        label: staff.department ? `${staff.full_name} (${staff.department})` : staff.full_name,
      })
    })
    return entries
  }, [contacts])

  const handleSend = async () => {
    setError(null)

    if (!subject.trim()) {
      setError("Le sujet est obligatoire")
      return
    }

    if (!body.trim()) {
      setError("Le message est obligatoire")
      return
    }

    const recipientId = replyTo?.sender_id || selectedRecipient
    if (!recipientId) {
      setError("Veuillez choisir un destinataire")
      return
    }

    const payload: SendMessagePayload = {
      subject: subject.trim(),
      body: body.trim(),
      target: {
        type: "user",
        userIds: [recipientId],
      },
      parentMessageId: replyTo?.id || null,
    }

    try {
      setSending(true)
      const response = await parentMessagesApi.sendMessage(studentId, payload)
      if (response.success) {
        resetForm()
        onSent()
      } else {
        setError(response.error || "Erreur lors de l'envoi")
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi")
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{replyTo ? "Répondre au message" : "Nouveau message"}</DialogTitle>
          <DialogDescription>
            {replyTo ? `Réponse à ${replyTo.sender_name}` : "Envoyer un message aux professeurs ou au staff"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!replyTo && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Destinataire</Label>
                <Button variant="link" className="px-0 text-xs" onClick={onRefreshContacts}>
                  Actualiser les contacts
                </Button>
              </div>
              {contactsLoading ? (
                <div className="text-sm text-muted-foreground">Chargement des contacts...</div>
              ) : (
                <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un destinataire" />
                  </SelectTrigger>
                  <SelectContent>
                    {usersOptions.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Aucun contact disponible.
                      </div>
                    ) : (
                      usersOptions.map(option => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Sujet</Label>
            <Textarea
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              rows={1}
              placeholder="Entrez le sujet"
            />
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Écrivez votre message..."
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? "Envoi..." : "Envoyer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
