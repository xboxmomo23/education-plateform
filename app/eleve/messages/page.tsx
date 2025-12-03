"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { MessagesInbox } from "@/components/messages/messages-components"

export default function StudentMessagesPage() {
  return (
    <DashboardLayout requiredRole="student">
      <MessagesInbox userRole="student" />
    </DashboardLayout>
  )
}
