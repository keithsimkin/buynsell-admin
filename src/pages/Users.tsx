import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, DEFAULT_PAGE_SIZE, formatDate, parsePage, parsePageSize } from '../lib/api'
import { Badge, Button, Card, EmptyState, Pagination, Spinner, statusTone } from '../components/ui'

type User = {
  id: number
  name: string
  email: string | null
  role: string
  accountState: string
  businessName: string | null
  phoneVerified: boolean
  hasVerifiedBadge: boolean
  listingCount: number
  activeListingCount: number
  joinedAt: string | null
}

export default function Users() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const role = searchParams.get('role') ?? ''
  const accountState = searchParams.get('accountState') ?? ''
  const hasVerifiedBadge = searchParams.get('hasVerifiedBadge') ?? ''
  const hasActivePaidPlan = searchParams.get('hasActivePaidPlan') === 'true'
  const page = parsePage(searchParams.get('page'))
  const pageSize = parsePageSize(searchParams.get('limit'), DEFAULT_PAGE_SIZE)
  const urlQuery = searchParams.get('query') ?? ''
  const [query, setQuery] = useState(urlQuery)
  const [items, setItems] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        page: String(page),
      })
      if (urlQuery.trim()) params.set('query', urlQuery.trim())
      if (role) params.set('role', role)
      if (accountState) params.set('accountState', accountState)
      if (hasVerifiedBadge) params.set('hasVerifiedBadge', hasVerifiedBadge)
      if (hasActivePaidPlan) params.set('hasActivePaidPlan', 'true')
      const data = await api<{ items: User[]; total: number }>(`/api/admin/users?${params}`)
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
  }, [role, accountState, hasVerifiedBadge, hasActivePaidPlan, page, pageSize, urlQuery])

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') patchParams({ query: query.trim() || null })
          }}
          placeholder="Search name, email, phone…"
          className="h-9 min-w-[200px] flex-1 rounded-full border border-gray-200 px-3 text-[13px] outline-none"
        />
        <select
          value={role}
          onChange={(e) => patchParams({ role: e.target.value || null })}
          className="h-9 rounded-full border border-gray-200 px-3 text-[12px]"
        >
          <option value="">All roles</option>
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <select
          value={accountState}
          onChange={(e) => patchParams({ accountState: e.target.value || null })}
          className="h-9 rounded-full border border-gray-200 px-3 text-[12px]"
        >
          <option value="">All states</option>
          <option value="active">active</option>
          <option value="restricted">restricted</option>
          <option value="suspended">suspended</option>
          <option value="watchlist">watchlist (restricted + suspended)</option>
        </select>
        <select
          value={hasVerifiedBadge}
          onChange={(e) => patchParams({ hasVerifiedBadge: e.target.value || null })}
          className="h-9 rounded-full border border-gray-200 px-3 text-[12px]"
        >
          <option value="">Badge: any</option>
          <option value="true">Verified badge</option>
          <option value="false">No badge</option>
        </select>
        <label className="flex items-center gap-1.5 text-[12px] text-gray-600">
          <input
            type="checkbox"
            checked={hasActivePaidPlan}
            onChange={(e) =>
              patchParams({ hasActivePaidPlan: e.target.checked ? 'true' : null })
            }
          />
          Paid plan
        </label>
        <Button onClick={() => patchParams({ query: query.trim() || null })}>Search</Button>
        {(role || accountState || hasVerifiedBadge || hasActivePaidPlan || query || page > 1) && (
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
          <h3 className="text-[14px] font-semibold">Accounts directory</h3>
          <span className="text-[12px] text-gray-400">{total} users</span>
        </div>
        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="p-5 text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <EmptyState title="No accounts found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-2.5 font-medium">Account</th>
                  <th className="px-3 py-2.5 font-medium">Role</th>
                  <th className="px-3 py-2.5 font-medium">State</th>
                  <th className="px-3 py-2.5 font-medium">Business</th>
                  <th className="px-3 py-2.5 font-medium">Phone</th>
                  <th className="px-3 py-2.5 font-medium">Listings</th>
                  <th className="px-5 py-2.5 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr
                    key={u.id}
                    className="cursor-pointer border-b border-gray-50 hover:bg-bn-yellow/25"
                    onClick={() => navigate(`/users/${u.id}`)}
                  >
                    <td className="px-5 py-3">
                      <Link
                        to={`/users/${u.id}`}
                        className="font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {u.name}
                      </Link>
                      <p className="text-[11px] text-gray-400">{u.email}</p>
                      {u.hasVerifiedBadge && <Badge tone="blue">Verified</Badge>}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={statusTone(u.role)}>{u.role}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={statusTone(u.accountState)}>{u.accountState}</Badge>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{u.businessName || '—'}</td>
                    <td className="px-3 py-3">
                      {u.phoneVerified ? (
                        <Badge tone="lime">Verified</Badge>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {u.activeListingCount}/{u.listingCount}
                    </td>
                    <td className="px-5 py-3 text-gray-400">{formatDate(u.joinedAt)}</td>
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
