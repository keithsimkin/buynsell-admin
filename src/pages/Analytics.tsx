import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { api } from '../lib/api'
import { Card, Spinner } from '../components/ui'

type Overview = {
  marketplace: {
    totalListings: number
    activeListings: number
    totalReports: number
    pendingReports: number
  }
  users: { role: string; total: number }[]
}

export default function Analytics() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Overview>('/api/admin/analytics/overview')
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <Card className="p-6 text-sm text-red-600">{error}</Card>
  if (!data) return <Spinner />

  const cards = [
    {
      label: 'Listings (all)',
      value: data.marketplace.totalListings,
      to: '/listings',
      hint: 'Open inventory',
    },
    {
      label: 'Listings (active)',
      value: data.marketplace.activeListings,
      to: '/listings?status=active',
      hint: 'Live marketplace',
    },
    {
      label: 'Reports (all)',
      value: data.marketplace.totalReports,
      to: '/reports/listings?status=resolved',
      hint: 'Trust history',
    },
    {
      label: 'Reports (pending)',
      value: data.marketplace.pendingReports,
      to: '/reports/listings',
      hint: 'Needs attention',
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="block">
            <Card className="h-full p-4 transition hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md">
              <div className="flex items-start justify-between">
                <p className="text-[12px] text-gray-400">{c.label}</p>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </div>
              <p className="mt-1 text-[22px] font-semibold">{c.value}</p>
              <p className="mt-1 text-[11px] font-medium text-gray-500">{c.hint}</p>
            </Card>
          </Link>
        ))}
      </div>
      <Card>
        <div className="border-b border-gray-50 px-5 py-3">
          <h3 className="text-[14px] font-semibold">Users by role</h3>
          <p className="text-[11px] text-gray-400">Click a role to open filtered accounts</p>
        </div>
        <ul className="divide-y divide-gray-50">
          {data.users.map((u) => (
            <li key={u.role}>
              <Link
                to={`/users?role=${encodeURIComponent(u.role)}`}
                className="flex items-center justify-between px-5 py-3 text-[13px] transition hover:bg-bn-lime/20"
              >
                <span className="capitalize text-gray-600">{u.role}</span>
                <span className="flex items-center gap-2 font-semibold">
                  {u.total}
                  <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
