"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { MessagesInbox } from "@/components/messages/messages-components"

export default function StaffMessagesPage() {
  return (
    <DashboardLayout requiredRole="staff">
      <MessagesInbox userRole="staff" />
    </DashboardLayout>
  )
}
