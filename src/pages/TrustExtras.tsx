import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, DEFAULT_PAGE_SIZE, formatDate, parsePage, parsePageSize } from '../lib/api'
import { Badge, Button, Card, EmptyState, Pagination, Spinner } from '../components/ui'

export default function Notifications() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePage(searchParams.get('page'))
  const pageSize = parsePageSize(searchParams.get('limit'), DEFAULT_PAGE_SIZE)
  const eventKey = searchParams.get('eventKey') ?? ''
  const [query, setQuery] = useState(eventKey)
  const [items, setItems] = useState<
    {
      id: number
      eventKey: string
      userId: number | null
      userName: string | null
      userEmail: string | null
      source: string | null
      deliveryMode: string | null
      createdAt: string
    }[]
  >([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) })
    if (eventKey) params.set('eventKey', eventKey)
    api<{ items: typeof items; total: number }>(`/api/admin/notifications?${params}`)
      .then((d) => {
        setItems(d.items)
        setTotal(d.total)
      })
      .finally(() => setLoading(false))
  }, [page, pageSize, eventKey])

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex gap-2 p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const params = new URLSearchParams()
              if (query.trim()) params.set('eventKey', query.trim())
              setSearchParams(params)
            }
          }}
          placeholder="Filter by event key…"
          className="h-9 flex-1 rounded-full border border-gray-200 px-3 text-[13px]"
        />
        <Button
          onClick={() => {
            const params = new URLSearchParams()
            if (query.trim()) params.set('eventKey', query.trim())
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
          <EmptyState title="No notifications" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-2.5 font-medium">User</th>
                  <th className="px-3 py-2.5 font-medium">Event</th>
                  <th className="px-3 py-2.5 font-medium">Source</th>
                  <th className="px-3 py-2.5 font-medium">Delivery</th>
                  <th className="px-5 py-2.5 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {items.map((n) => (
                  <tr key={n.id} className="border-b border-gray-50">
                    <td className="px-5 py-3">
                      {n.userId ? (
                        <Link to={`/users/${n.userId}`} className="font-medium hover:underline">
                          {n.userName || `User #${n.userId}`}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone="blue">{n.eventKey}</Badge>
                    </td>
                    <td className="px-3 py-3 text-gray-500">{n.source || '—'}</td>
                    <td className="px-3 py-3 text-gray-500">{n.deliveryMode || '—'}</td>
                    <td className="px-5 py-3 text-gray-400">{formatDate(n.createdAt)}</td>
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

export function MobileSessions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePage(searchParams.get('page'))
  const pageSize = parsePageSize(searchParams.get('limit'), DEFAULT_PAGE_SIZE)
  const activeOnly = searchParams.get('activeOnly') === 'true'
  const [items, setItems] = useState<
    {
      id: number
      sessionId: string
      userId: number | null
      userName: string | null
      userEmail: string | null
      userAgent: string | null
      lastUsedAt: string | null
      expiresAt: string | null
      revokedAt: string | null
      createdAt: string
    }[]
  >([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) })
    if (activeOnly) params.set('activeOnly', 'true')
    const data = await api<{ items: typeof items; total: number }>(
      `/api/admin/mobile-sessions?${params}`,
    )
    setItems(data.items)
    setTotal(data.total)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [page, pageSize, activeOnly])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSearchParams({})}
          className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold ${
            !activeOnly ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ activeOnly: 'true' })}
          className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold ${
            activeOnly ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white'
          }`}
        >
          Active only
        </button>
      </div>
      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState title="No mobile sessions" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-2.5 font-medium">User</th>
                  <th className="px-3 py-2.5 font-medium">Session</th>
                  <th className="px-3 py-2.5 font-medium">User agent</th>
                  <th className="px-3 py-2.5 font-medium">Last used</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="px-5 py-3">
                      {s.userId ? (
                        <Link to={`/users/${s.userId}`} className="font-medium hover:underline">
                          {s.userName || `User #${s.userId}`}
                        </Link>
                      ) : (
                        '—'
                      )}
                      <p className="text-[11px] text-gray-400">{s.userEmail}</p>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px]">
                      {String(s.sessionId).slice(0, 12)}…
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-3 text-[11px] text-gray-500">
                      {s.userAgent || '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-400">{formatDate(s.lastUsedAt)}</td>
                    <td className="px-3 py-3">
                      <Badge tone={s.revokedAt ? 'red' : 'green'}>
                        {s.revokedAt ? 'revoked' : 'active'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      {!s.revokedAt && (
                        <Button
                          variant="danger"
                          onClick={() => {
                            if (!confirm('Revoke this mobile session?')) return
                            void api(`/api/admin/mobile-sessions/${s.id}/revoke`, {
                              method: 'POST',
                            }).then(load)
                          }}
                        >
                          Revoke
                        </Button>
                      )}
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

export function FeatureRequests() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePage(searchParams.get('page'))
  const pageSize = parsePageSize(searchParams.get('limit'), DEFAULT_PAGE_SIZE)
  const status = searchParams.get('status') ?? ''
  const [items, setItems] = useState<
    {
      id: number
      title: string
      description: string | null
      status: string
      votes: number
      author_name: string | null
      author_id: number | null
      created_at: string
    }[]
  >([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) })
    if (status) params.set('status', status)
    const data = await api<{ items: typeof items; total: number }>(
      `/api/admin/feature-requests?${params}`,
    )
    setItems(data.items)
    setTotal(data.total)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [page, pageSize, status])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {['', 'pending', 'planned', 'in_progress', 'done', 'rejected'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setSearchParams(s ? { status: s } : {})}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold capitalize ${
              status === s ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white'
            }`}
          >
            {(s || 'all').replace('_', ' ')}
          </button>
        ))}
      </div>
      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState title="No feature requests" />
        ) : (
          <ul className="divide-y divide-gray-50">
            {items.map((f) => (
              <li key={f.id} className="flex items-start justify-between gap-4 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold">{f.title}</p>
                    <Badge tone="blue">{f.votes} votes</Badge>
                  </div>
                  <p className="mt-1 text-[12px] text-gray-500">{f.description || 'No description'}</p>
                  <p className="mt-2 text-[11px] text-gray-400">
                    {f.author_id ? (
                      <Link to={`/users/${f.author_id}`} className="hover:underline">
                        {f.author_name || `User #${f.author_id}`}
                      </Link>
                    ) : (
                      f.author_name || 'Anonymous'
                    )}{' '}
                    · {formatDate(f.created_at)}
                  </p>
                </div>
                <select
                  className="h-9 rounded-xl border border-gray-200 px-2 text-[12px]"
                  value={f.status}
                  onChange={(e) =>
                    void api(`/api/admin/feature-requests/${f.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ status: e.target.value }),
                    }).then(load)
                  }
                >
                  {['pending', 'planned', 'in_progress', 'done', 'rejected'].map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
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

export function SafetyReports() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePage(searchParams.get('page'))
  const pageSize = parsePageSize(searchParams.get('limit'), DEFAULT_PAGE_SIZE)
  const status = searchParams.get('status') || 'pending'
  const [items, setItems] = useState<
    {
      id: number
      category: string | null
      description: string | null
      status: string
      createdAt: string
      email: string | null
      reporter: { id: number; name: string; email: string } | null
    }[]
  >([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const data = await api<{ items: typeof items; total: number }>(
      `/api/admin/safety-reports?status=${status}&page=${page}&limit=${pageSize}`,
    )
    setItems(data.items)
    setTotal(data.total)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [page, pageSize, status])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {['pending', 'resolved', 'dismissed'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSearchParams(s === 'pending' ? {} : { status: s })}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold capitalize ${
              status === s ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState title="No safety reports" detail="Inbox is clear for this filter." />
        ) : (
          <ul className="divide-y divide-gray-50">
            {items.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-[14px] font-semibold">{r.category || 'Safety report'}</p>
                  <p className="mt-1 text-[12px] text-gray-500">{r.description || 'No details'}</p>
                  <p className="mt-2 text-[11px] text-gray-400">
                    Reporter:{' '}
                    {r.reporter ? (
                      <Link to={`/users/${r.reporter.id}`} className="hover:underline">
                        {r.reporter.name}
                      </Link>
                    ) : (
                      r.email || '—'
                    )}{' '}
                    · {formatDate(r.createdAt)}
                  </p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        void api(`/api/admin/safety-reports/${r.id}/review`, {
                          method: 'POST',
                          body: JSON.stringify({ status: 'resolved' }),
                        }).then(load)
                      }
                    >
                      Resolve
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() =>
                        void api(`/api/admin/safety-reports/${r.id}/review`, {
                          method: 'POST',
                          body: JSON.stringify({ status: 'dismissed' }),
                        }).then(load)
                      }
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
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

export function Feedback() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePage(searchParams.get('page'))
  const pageSize = parsePageSize(searchParams.get('limit'), DEFAULT_PAGE_SIZE)
  const [items, setItems] = useState<
    {
      id: number
      rating: number | null
      comment: string | null
      status: string
      createdAt: string
      sellerId: number | null
      sellerName: string | null
      reviewerId: number | null
      reviewerName: string | null
    }[]
  >([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const data = await api<{ items: typeof items; total: number }>(
      `/api/admin/feedback?page=${page}&limit=${pageSize}`,
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
        <EmptyState title="No seller feedback yet" />
      ) : (
        <ul className="divide-y divide-gray-50">
          {items.map((f) => (
            <li key={f.id} className="flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone="blue">{f.rating ?? '—'}★</Badge>
                  <span className="text-[13px] text-gray-500">
                    {f.reviewerId ? (
                      <Link to={`/users/${f.reviewerId}`} className="hover:underline">
                        {f.reviewerName ?? 'Reviewer'}
                      </Link>
                    ) : (
                      'Reviewer'
                    )}{' '}
                    →{' '}
                    {f.sellerId ? (
                      <Link to={`/users/${f.sellerId}`} className="hover:underline">
                        {f.sellerName ?? 'Seller'}
                      </Link>
                    ) : (
                      'Seller'
                    )}
                  </span>
                </div>
                <p className="mt-2 text-[13px]">{f.comment || 'No comment'}</p>
                <p className="mt-1 text-[11px] text-gray-400">{formatDate(f.createdAt)}</p>
              </div>
              <select
                className="h-9 rounded-xl border border-gray-200 px-2 text-[12px]"
                value={f.status}
                onChange={(e) =>
                  void api(`/api/admin/feedback/${f.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: e.target.value }),
                  }).then(load)
                }
              >
                {['published', 'hidden', 'removed'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
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
