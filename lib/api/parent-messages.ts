"use client"

import { apiCallWithAbort } from "./client"
import type { RecipientTeacher, RecipientStaff, SendMessagePayload } from "./messages"

export interface ParentThreadSummary {
  thread_id: string
  subject: string
  message_count: number
  unread_count: number
  last_message_at: string
  last_message_preview: string
  last_sender_id: string
  last_sender_name: string
  last_sender_role: string
}

export interface ParentThreadMessage {
  id: string
  subject: string
  body: string
  sender_id: string
  sender_name: string
  sender_role: string
  created_at: string
  thread_id: string
  read_at: string | null
}

export interface ParentContactsResponse {
  teachers: RecipientTeacher[]
  staff: RecipientStaff[]
}

function buildBase(studentId: string) {
  return `/parent/students/${studentId}`
}

export const parentMessagesApi = {
  getThreads(studentId: string) {
    return apiCallWithAbort<{ success: boolean; data: ParentThreadSummary[] }>(
      `${buildBase(studentId)}/messages/threads`
    )
  },

  getThreadMessages(studentId: string, threadId: string) {
    return apiCallWithAbort<{ success: boolean; data: ParentThreadMessage[] }>(
      `${buildBase(studentId)}/messages/threads/${threadId}`
    )
  },

  sendMessage(studentId: string, payload: SendMessagePayload) {
    return apiCallWithAbort<{ success: boolean; data: { message: ParentThreadMessage; recipientCount: number } }>(
      `${buildBase(studentId)}/messages`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    )
  },

  getContacts(studentId: string) {
    return apiCallWithAbort<{ success: boolean; data: ParentContactsResponse }>(
      `${buildBase(studentId)}/contacts`
    )
  },
}
