"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { MessagesInbox } from "@/components/messages/messages-components"

export default function TeacherMessagesPage() {
  return (
    <DashboardLayout requiredRole="teacher">
      <MessagesInbox userRole="teacher" />
    </DashboardLayout>
  )
}
