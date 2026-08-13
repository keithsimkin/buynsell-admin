import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, DEFAULT_PAGE_SIZE, formatDate, formatUgx, parsePage, parsePageSize } from '../lib/api'
import { Badge, Button, Card, EmptyState, Pagination, Spinner, statusTone } from '../components/ui'

type Plan = {
  id: number
  slug: string
  displayName: string
  tierCode: string
  family: string
  priceUgx: number
  isFree: boolean
  active: boolean
  topPlusPromotions: number
}

export default function PricingPlans() {
  const [items, setItems] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [includeInactive, setIncludeInactive] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await api<{ items: Plan[] }>(
        `/api/admin/pricing/plans?includeInactive=${includeInactive}`,
      )
      setItems(data.items)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [includeInactive])

  async function toggleActive(plan: Plan) {
    setBusyId(plan.id)
    try {
      await api(`/api/admin/pricing/plans/${plan.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !plan.active }),
      })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center justify-between p-3">
        <label className="flex items-center gap-2 text-[12px] text-gray-600">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Show inactive plans
        </label>
        <span className="text-[12px] text-gray-400">{items.length} plans</span>
      </Card>
      <Card>
        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="p-5 text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <EmptyState title="No plans" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-2.5 font-medium">Plan</th>
                  <th className="px-3 py-2.5 font-medium">Family</th>
                  <th className="px-3 py-2.5 font-medium">Tier</th>
                  <th className="px-3 py-2.5 font-medium">Price</th>
                  <th className="px-3 py-2.5 font-medium">TOP+</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium">{p.displayName}</p>
                      <p className="text-[11px] text-gray-400">{p.slug}</p>
                    </td>
                    <td className="px-3 py-3">{p.family}</td>
                    <td className="px-3 py-3">{p.tierCode}</td>
                    <td className="px-3 py-3">{formatUgx(p.priceUgx)}</td>
                    <td className="px-3 py-3">{p.topPlusPromotions}</td>
                    <td className="px-3 py-3">
                      <Badge tone={p.active ? 'lime' : 'gray'}>
                        {p.active ? 'active' : 'inactive'}
                      </Badge>
                      {p.isFree ? <Badge tone="blue">free</Badge> : null}
                    </td>
                    <td className="px-5 py-3">
                      <Button
                        variant="secondary"
                        disabled={busyId === p.id}
                        onClick={() => void toggleActive(p)}
                      >
                        {p.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export function PlanAssignments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') || 'active'
  const page = parsePage(searchParams.get('page'))
  const pageSize = parsePageSize(searchParams.get('limit'), DEFAULT_PAGE_SIZE)
  const [items, setItems] = useState<
    {
      id: number
      sellerId: number
      sellerName: string | null
      sellerEmail: string | null
      status: string
      isBaseline: boolean
      planName: string
      planSlug: string
      priceUgx: number
      family: string
      nextBillingDate: string | null
      createdAt: string
      notes: string | null
    }[]
  >([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api<{ items: typeof items; total: number }>(
      `/api/admin/pricing/assignments?status=${status}&page=${page}&limit=${pageSize}`,
    )
      .then((data) => {
        setItems(data.items)
        setTotal(data.total)
      })
      .catch((e) => alert(e.message))
      .finally(() => setLoading(false))
  }, [status, page, pageSize])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {['active', 'ended', 'all'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSearchParams(s === 'active' ? {} : { status: s })}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold capitalize ${
              status === s ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <Card>
        <div className="flex justify-between border-b border-gray-50 px-5 py-3">
          <h3 className="text-[14px] font-semibold">Plan assignments</h3>
          <span className="text-[12px] text-gray-400">{total}</span>
        </div>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState title="No assignments" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-2.5 font-medium">Seller</th>
                  <th className="px-3 py-2.5 font-medium">Plan</th>
                  <th className="px-3 py-2.5 font-medium">Family</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Next billing</th>
                  <th className="px-5 py-2.5 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50">
                    <td className="px-5 py-3">
                      <Link to={`/users/${a.sellerId}`} className="font-medium hover:underline">
                        {a.sellerName ?? `User #${a.sellerId}`}
                      </Link>
                      <p className="text-[11px] text-gray-400">{a.sellerEmail}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium">{a.planName}</p>
                      <p className="text-[11px] text-gray-400">
                        {a.planSlug} · {formatUgx(a.priceUgx)}
                      </p>
                    </td>
                    <td className="px-3 py-3">{a.family}</td>
                    <td className="px-3 py-3">
                      <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                      {a.isBaseline ? <Badge tone="blue">baseline</Badge> : null}
                    </td>
                    <td className="px-3 py-3 text-gray-500">{formatDate(a.nextBillingDate)}</td>
                    <td className="px-5 py-3 text-gray-400">{formatDate(a.createdAt)}</td>
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
