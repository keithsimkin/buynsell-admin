const BASE = ''

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  const payload = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, payload?.message ?? payload?.error ?? res.statusText)
  }
  return payload as T
}

export function formatDate(value?: string | Date | null) {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-UG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatUgx(n?: number | null) {
  return `UGX ${Number(n || 0).toLocaleString('en-UG')}`
}

export const DEFAULT_PAGE_SIZE = 20

export function parsePage(value: string | null | undefined, fallback = 1) {
  const n = Number(value || fallback)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

export function parsePageSize(value: string | null | undefined, fallback = DEFAULT_PAGE_SIZE) {
  const n = Number(value || fallback)
  if (![10, 20, 50, 100].includes(n)) return fallback
  return n
}

export function totalPages(total: number, pageSize = DEFAULT_PAGE_SIZE) {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize))
}

export function pageWindow(total: number, page: number, pageSize = DEFAULT_PAGE_SIZE) {
  if (total <= 0) return { from: 0, to: 0 }
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return { from, to }
}
