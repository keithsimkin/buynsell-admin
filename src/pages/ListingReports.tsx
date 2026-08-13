import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, DEFAULT_PAGE_SIZE, formatDate, parsePage, parsePageSize } from '../lib/api'
import { Badge, Button, Card, EmptyState, Pagination, Spinner, statusTone } from '../components/ui'

type Report = {
  id: string
  status: string
  reason: string
  details: string | null
  createdAt: string
  listingId: number
  listingTitle: string | null
  reporter: { id: number; name: string; email: string | null } | null
}

export default function ListingReports() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') || 'pending'
  const page = parsePage(searchParams.get('page'))
  const pageSize = parsePageSize(searchParams.get('limit'), DEFAULT_PAGE_SIZE)
  const [items, setItems] = useState<Report[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function setFilters(next: Record<string, string>) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v)
    }
    setSearchParams(params)
  }

  async function load() {
    setLoading(true)
    try {
      const data = await api<{ items: Report[]; total: number }>(
        `/api/admin/reports/listings?status=${status}&limit=${pageSize}&page=${page}`,
      )
      setItems(data.items)
      setTotal(data.total)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [status, page, pageSize])

  async function review(id: string, next: 'resolved' | 'dismissed') {
    try {
      await api(`/api/admin/reports/listings/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ status: next }),
      })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Review failed')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {['pending', 'resolved', 'dismissed'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() =>
              setFilters({
                ...(s === 'pending' ? {} : { status: s }),
                ...(pageSize !== DEFAULT_PAGE_SIZE ? { limit: String(pageSize) } : {}),
              })
            }
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold capitalize ${
              status === s ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3">
          <h3 className="text-[14px] font-semibold">Listing complaints</h3>
          <span className="text-[12px] text-gray-400">{total}</span>
        </div>
        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="p-5 text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <EmptyState
            title="No listing reports"
            detail="Queue is empty for this status — good for trust ops."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-2.5 font-medium">Listing</th>
                  <th className="px-3 py-2.5 font-medium">Reason</th>
                  <th className="px-3 py-2.5 font-medium">Reporter</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Created</th>
                  <th className="px-5 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="px-5 py-3">
                      <Link to={`/listings/${r.listingId}`} className="font-medium hover:underline">
                        {r.listingTitle ?? `Listing #${r.listingId}`}
                      </Link>
                      {r.details ? (
                        <p className="text-[11px] text-gray-400">{r.details}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">{r.reason}</td>
                    <td className="px-3 py-3">{r.reporter?.name ?? '—'}</td>
                    <td className="px-3 py-3">
                      <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                    </td>
                    <td className="px-3 py-3 text-gray-400">{formatDate(r.createdAt)}</td>
                    <td className="px-5 py-3">
                      {status === 'pending' && (
                        <div className="flex gap-1.5">
                          <Button onClick={() => void review(r.id, 'resolved')}>Resolve</Button>
                          <Button variant="secondary" onClick={() => void review(r.id, 'dismissed')}>
                            Dismiss
                          </Button>
                        </div>
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
