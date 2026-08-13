import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, DEFAULT_PAGE_SIZE, formatDate, parsePage, parsePageSize } from '../lib/api'
import { Badge, Button, Card, EmptyState, Pagination, Spinner, statusTone } from '../components/ui'

type Listing = {
  id: number
  title: string
  status: string
  categorySlug: string
  featuredActive: boolean
  verified: boolean
  reportCount: number
  createdAt: string
  priceLabel: string
  seller: { id: number; name: string; hasVerifiedBadge: boolean } | null
}

export default function Inventory() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? ''
  const featuredOnly = searchParams.get('featuredOnly') === 'true'
  const reportedOnly = searchParams.get('reportedOnly') === 'true'
  const page = parsePage(searchParams.get('page'))
  const pageSize = parsePageSize(searchParams.get('limit'), DEFAULT_PAGE_SIZE)
  const urlQuery = searchParams.get('query') ?? ''
  const [query, setQuery] = useState(urlQuery)
  const [items, setItems] = useState<Listing[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    setQuery(urlQuery)
  }, [urlQuery])

  function patchParams(next: Record<string, string | null>, resetPage = true) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(next)) {
      if (value == null || value === '') params.delete(key)
      else params.set(key, value)
    }
    if (resetPage && !('page' in next)) params.delete('page')
    setSearchParams(params)
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        page: String(page),
      })
      if (status) params.set('status', status)
      if (urlQuery.trim()) params.set('query', urlQuery.trim())
      if (featuredOnly) params.set('featuredOnly', 'true')
      if (reportedOnly) params.set('reportedOnly', 'true')
      const data = await api<{ items: Listing[]; total: number }>(
        `/api/admin/listings?${params}`,
      )
      setItems(data.items)
      setTotal(data.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [status, featuredOnly, reportedOnly, page, pageSize, urlQuery])

  async function toggleBoost(listing: Listing) {
    setBusyId(listing.id)
    try {
      if (listing.featuredActive) {
        await api(`/api/admin/listings/${listing.id}/boost`, { method: 'DELETE' })
      } else {
        await api(`/api/admin/listings/${listing.id}/boost`, { method: 'POST' })
      }
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Boost failed')
    } finally {
      setBusyId(null)
    }
  }

  async function moveToDraft(id: number) {
    setBusyId(id)
    try {
      await api(`/api/admin/listings/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: 'draft' }),
      })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Status update failed')
    } finally {
      setBusyId(null)
    }
  }

  const filterLabel = [
    status && `status:${status}`,
    featuredOnly && 'TOP+',
    reportedOnly && 'reported',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              patchParams({ query: query.trim() || null })
            }
          }}
          placeholder="Search title, description, seller…"
          className="h-9 min-w-[220px] flex-1 rounded-full border border-gray-200 px-3 text-[13px] outline-none focus:ring-2 focus:ring-gray-100"
        />
        <select
          value={status}
          onChange={(e) => patchParams({ status: e.target.value || null })}
          className="h-9 rounded-full border border-gray-200 bg-white px-3 text-[12px]"
        >
          <option value="">All statuses</option>
          <option value="active">active</option>
          <option value="inreview">inreview</option>
          <option value="draft">draft</option>
          <option value="rejected">rejected</option>
        </select>
        <label className="flex items-center gap-1.5 text-[12px] text-gray-600">
          <input
            type="checkbox"
            checked={featuredOnly}
            onChange={(e) =>
              patchParams({ featuredOnly: e.target.checked ? 'true' : null })
            }
          />
          Featured only
        </label>
        <label className="flex items-center gap-1.5 text-[12px] text-gray-600">
          <input
            type="checkbox"
            checked={reportedOnly}
            onChange={(e) =>
              patchParams({ reportedOnly: e.target.checked ? 'true' : null })
            }
          />
          Reported only
        </label>
        <Button onClick={() => patchParams({ query: query.trim() || null })}>Search</Button>
        {(status || featuredOnly || reportedOnly || query || page > 1) && (
          <Button
            variant="ghost"
            onClick={() => {
              setQuery('')
              setSearchParams({})
            }}
          >
            Clear
          </Button>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3">
          <div>
            <h3 className="text-[14px] font-semibold">Marketplace inventory</h3>
            {filterLabel ? (
              <p className="text-[11px] text-gray-400">Filtered · {filterLabel}</p>
            ) : null}
          </div>
          <span className="text-[12px] text-gray-400">{total} listings</span>
        </div>
        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="p-5 text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <EmptyState title="No listings match" detail="Try clearing filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-2.5 font-medium">Listing</th>
                  <th className="px-3 py-2.5 font-medium">Seller</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-3 py-2.5 font-medium">Flags</th>
                  <th className="px-3 py-2.5 font-medium">Reports</th>
                  <th className="px-3 py-2.5 font-medium">Created</th>
                  <th className="px-5 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="px-5 py-3">
                      <Link
                        to={`/listings/${item.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {item.title}
                      </Link>
                      <p className="text-[11px] text-gray-400">
                        #{item.id} · {item.priceLabel}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      {item.seller ? (
                        <Link
                          to={`/users/${item.seller.id}`}
                          className="text-gray-700 hover:underline"
                        >
                          {item.seller.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{item.categorySlug}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.featuredActive && <Badge tone="green">TOP+</Badge>}
                        {item.verified && <Badge tone="blue">Verified</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-3">{item.reportCount}</td>
                    <td className="px-3 py-3 text-gray-400">{formatDate(item.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          variant="secondary"
                          disabled={busyId === item.id}
                          onClick={() => void toggleBoost(item)}
                        >
                          {item.featuredActive ? 'Remove TOP+' : 'Apply TOP+'}
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={busyId === item.id || item.status === 'draft'}
                          onClick={() => void moveToDraft(item.id)}
                        >
                          Draft
                        </Button>
                        <Link
                          to={`/listings/${item.id}`}
                          className="inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-100"
                        >
                          Open
                        </Link>
                      </div>
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
          onPageChange={(p) => patchParams({ page: p <= 1 ? null : String(p) }, false)}
          onPageSizeChange={(size) =>
            patchParams({
              limit: size === DEFAULT_PAGE_SIZE ? null : String(size),
              page: null,
            })
          }
        />
      </Card>
    </div>
  )
}
