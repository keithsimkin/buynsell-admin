import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, DEFAULT_PAGE_SIZE, formatDate, parsePage, parsePageSize } from '../lib/api'
import { Badge, Button, Card, EmptyState, Pagination, Spinner, statusTone } from '../components/ui'

export default function AuditLog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePage(searchParams.get('page'))
  const pageSize = parsePageSize(searchParams.get('limit'), DEFAULT_PAGE_SIZE)
  const action = searchParams.get('action') ?? ''
  const [query, setQuery] = useState(action)
  const [items, setItems] = useState<
    {
      id: number
      action: string
      targetType: string
      targetId: string | null
      createdAt: string
      adminUser: { id: number; name: string } | null
    }[]
  >([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) })
    if (action) params.set('action', action)
    api<{ items: typeof items; total: number }>(`/api/admin/audit?${params}`)
      .then((d) => {
        setItems(d.items)
        setTotal(d.total)
      })
      .finally(() => setLoading(false))
  }, [page, pageSize, action])

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex gap-2 p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const params = new URLSearchParams()
              if (query.trim()) params.set('action', query.trim())
              setSearchParams(params)
            }
          }}
          placeholder="Filter by action…"
          className="h-9 flex-1 rounded-full border border-gray-200 px-3 text-[13px]"
        />
        <Button
          onClick={() => {
            const params = new URLSearchParams()
            if (query.trim()) params.set('action', query.trim())
            setSearchParams(params)
          }}
        >
          Search
        </Button>
      </Card>
      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState title="No audit events" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-2.5 font-medium">Action</th>
                  <th className="px-3 py-2.5 font-medium">Target</th>
                  <th className="px-3 py-2.5 font-medium">Admin</th>
                  <th className="px-5 py-2.5 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => {
                  const href =
                    a.targetType === 'listing' && a.targetId
                      ? `/listings/${a.targetId}`
                      : a.targetType === 'user' && a.targetId
                        ? `/users/${a.targetId}`
                        : null
                  return (
                    <tr key={a.id} className="border-b border-gray-50">
                      <td className="px-5 py-3 font-medium capitalize">
                        {a.action.replace(/_/g, ' ')}
                      </td>
                      <td className="px-3 py-3">
                        {href ? (
                          <Link to={href} className="hover:underline">
                            {a.targetType} #{a.targetId}
                          </Link>
                        ) : (
                          `${a.targetType}${a.targetId ? ` #${a.targetId}` : ''}`
                        )}
                      </td>
                      <td className="px-3 py-3">{a.adminUser?.name ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-400">{formatDate(a.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(p) => {
            const params = new URLSearchParams(searchParams)
            if (p <= 1) params.delete('page')
            else params.set('page', String(p))
            setSearchParams(params)
          }}
          onPageSizeChange={(size) => {
            const params = new URLSearchParams(searchParams)
            params.delete('page')
            if (size === DEFAULT_PAGE_SIZE) params.delete('limit')
            else params.set('limit', String(size))
            setSearchParams(params)
          }}
        />
      </Card>
    </div>
  )
}

export function EmailOutbox() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') || ''
  const page = parsePage(searchParams.get('page'))
  const pageSize = parsePageSize(searchParams.get('limit'), DEFAULT_PAGE_SIZE)
  const [items, setItems] = useState<
    {
      id: number
      templateKey: string
      recipient: string
      status: string
      attemptCount: number
      lastError: string | null
      createdAt: string
    }[]
  >([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) })
    if (status) params.set('status', status)
    const data = await api<{ items: typeof items; total: number }>(
      `/api/admin/outbox/email?${params}`,
    )
    setItems(data.items)
    setTotal(data.total)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [status, page, pageSize])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {['', 'pending', 'sent', 'failed', 'error'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setSearchParams(s ? { status: s } : {})}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold capitalize ${
              status === s ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white'
            }`}
          >
            {s || 'all'}
          </button>
        ))}
      </div>
      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState title="No email jobs" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-2.5 font-medium">Template</th>
                  <th className="px-3 py-2.5 font-medium">Recipient</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Attempts</th>
                  <th className="px-3 py-2.5 font-medium">Error</th>
                  <th className="px-5 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50">
                    <td className="px-5 py-3 font-medium">{row.templateKey}</td>
                    <td className="px-3 py-3">{row.recipient}</td>
                    <td className="px-3 py-3">
                      <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                    </td>
                    <td className="px-3 py-3">{row.attemptCount}</td>
                    <td className="max-w-[220px] truncate px-3 py-3 text-[11px] text-red-600">
                      {row.lastError || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          void api(`/api/admin/outbox/email/${row.id}/retry`, {
                            method: 'POST',
                          }).then(load)
                        }
                      >
                        Retry
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(p) => {
            const params = new URLSearchParams(searchParams)
            if (p <= 1) params.delete('page')
            else params.set('page', String(p))
            setSearchParams(params)
          }}
          onPageSizeChange={(size) => {
            const params = new URLSearchParams(searchParams)
            params.delete('page')
            if (size === DEFAULT_PAGE_SIZE) params.delete('limit')
            else params.set('limit', String(size))
            setSearchParams(params)
          }}
        />
      </Card>
    </div>
  )
}

export function PushOutbox() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePage(searchParams.get('page'))
  const pageSize = parsePageSize(searchParams.get('limit'), DEFAULT_PAGE_SIZE)
  const [items, setItems] = useState<
    {
      id: number
      deviceId: number
      status: string
      attemptCount: number
      lastError: string | null
      createdAt: string
    }[]
  >([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const data = await api<{ items: typeof items; total: number }>(
      `/api/admin/outbox/push?page=${page}&limit=${pageSize}`,
    )
    setItems(data.items)
    setTotal(data.total)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [page, pageSize])

  return (
    <Card>
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState title="No push jobs" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="px-5 py-2.5 font-medium">ID</th>
                <th className="px-3 py-2.5 font-medium">Device</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Attempts</th>
                <th className="px-5 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className="px-5 py-3">#{row.id}</td>
                  <td className="px-3 py-3">{row.deviceId}</td>
                  <td className="px-3 py-3">
                    <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                  </td>
                  <td className="px-3 py-3">{row.attemptCount}</td>
                  <td className="px-5 py-3">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        void api(`/api/admin/outbox/push/${row.id}/retry`, {
                          method: 'POST',
                        }).then(load)
                      }
                    >
                      Retry
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => {
          const params = new URLSearchParams(searchParams)
          if (p <= 1) params.delete('page')
          else params.set('page', String(p))
          setSearchParams(params)
        }}
        onPageSizeChange={(size) => {
          const params = new URLSearchParams(searchParams)
          params.delete('page')
          if (size === DEFAULT_PAGE_SIZE) params.delete('limit')
          else params.set('limit', String(size))
          setSearchParams(params)
        }}
      />
    </Card>
  )
}
