import { apiCall } from "./base"

export interface AuditLogItem {
  id: string
  created_at: string
  action: string
  actor_name: string | null
  actor_role: string | null
  actor_user_id: string | null
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, any>
  ip_address: string | null
  user_agent: string | null
}

export interface AuditLogResponse {
  items: AuditLogItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface AuditLogQueryParams {
  q?: string
  action?: string
  actorRole?: string
  entityType?: string
  entityId?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

function buildQuery(params: AuditLogQueryParams = {}) {
  const query = new URLSearchParams()
  if (params.q) query.set("q", params.q)
  if (params.action) query.set("action", params.action)
  if (params.actorRole) query.set("actorRole", params.actorRole)
  if (params.entityType) query.set("entityType", params.entityType)
  if (params.entityId) query.set("entityId", params.entityId)
  if (params.from) query.set("from", params.from)
  if (params.to) query.set("to", params.to)
  if (params.page && params.page > 1) query.set("page", String(params.page))
  if (params.limit && params.limit !== 50) query.set("limit", String(params.limit))
  const qs = query.toString()
  return qs ? `?${qs}` : ""
}

async function fetchBlob(endpoint: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || "Erreur export")
  }

  const blob = await response.blob()
  const disposition = response.headers.get("Content-Disposition")
  let filename: string | undefined
  if (disposition) {
    const match = /filename\*?=(?:UTF-8''|\")?([^;\n\"]+)/i.exec(disposition)
    if (match?.[1]) {
      filename = decodeURIComponent(match[1].replace(/\"/g, "").trim())
    }
  }

  return { blob, filename }
}

export const auditApi = {
  async getLogs(params: AuditLogQueryParams = {}, signal?: AbortSignal) {
    return apiCall<AuditLogResponse>(`/admin/audit${buildQuery(params)}` , { signal })
  },

  async exportCsv(params: AuditLogQueryParams = {}) {
    return fetchBlob(`/admin/audit/export.csv${buildQuery(params)}`)
  },
}
