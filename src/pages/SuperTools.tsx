import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Badge, Button, Card, Spinner } from '../components/ui'

type ToolsOverview = {
  pendingEmail: number
  failedEmail: number
  pendingPush: number
  activeSessions: number
  featuredListings: number
  listingsInReview: number
}

type Admin = { id: number; name: string; email: string }

export default function SuperTools() {
  const [data, setData] = useState<ToolsOverview | null>(null)
  const [admins, setAdmins] = useState<Admin[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    const [overview, adminList] = await Promise.all([
      api<ToolsOverview>('/api/admin/tools/overview'),
      api<{ items: Admin[] }>('/api/admin/admins'),
    ])
    setData(overview)
    setAdmins(adminList.items)
  }

  useEffect(() => {
    void load()
  }, [])

  async function run(key: string, path: string) {
    if (!confirm(`Run ${key}? This is a powerful bulk action.`)) return
    setBusy(key)
    setMessage(null)
    try {
      const result = await api<{ success?: boolean; retried?: number; cleared?: number }>(path, {
        method: 'POST',
      })
      if (typeof result.retried === 'number') setMessage(`Retried ${result.retried} failed emails`)
      else if (typeof result.cleared === 'number')
        setMessage(`Cleared featured flag on ${result.cleared} listings`)
      else setMessage('Done')
      await load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  if (!data) return <Spinner />

  const tiles = [
    { label: 'In review', value: data.listingsInReview, to: '/listings?status=inreview' },
    { label: 'Featured', value: data.featuredListings, to: '/listings?featuredOnly=true' },
    { label: 'Failed email', value: data.failedEmail, to: '/outbox/email?status=failed' },
    { label: 'Pending email', value: data.pendingEmail, to: '/outbox/email?status=pending' },
    { label: 'Pending push', value: data.pendingPush, to: '/outbox/push' },
    { label: 'Active sessions', value: data.activeSessions, to: '/sessions?activeOnly=true' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {message && (
        <div className="rounded-2xl border border-bn-lime bg-bn-lime/30 px-4 py-3 text-[13px]">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <Link
            key={t.label}
            to={t.to}
            className="rounded-2xl border border-gray-100 bg-white p-4 transition hover:border-gray-300"
          >
            <p className="text-[11px] uppercase tracking-wider text-gray-400">{t.label}</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums">{t.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-5">
          <h3 className="text-[15px] font-semibold">Power actions</h3>
          <p className="text-[12px] text-gray-500">
            Super-admin bulk tools. Prefer targeted actions from inventory and accounts when possible.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy !== null}
              onClick={() => void run('retry-failed-email', '/api/admin/tools/retry-failed-email')}
            >
              {busy === 'retry-failed-email' ? 'Working…' : 'Retry all failed email'}
            </Button>
            <Button
              variant="danger"
              disabled={busy !== null}
              onClick={() => void run('clear-featured', '/api/admin/tools/clear-featured')}
            >
              {busy === 'clear-featured' ? 'Working…' : 'Clear all featured listings'}
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-[15px] font-semibold">Admin accounts</h3>
          <ul className="space-y-2">
            {admins.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2"
              >
                <div>
                  <Link to={`/users/${a.id}`} className="text-[13px] font-medium hover:underline">
                    {a.name}
                  </Link>
                  <p className="text-[11px] text-gray-400">{a.email}</p>
                </div>
                <Badge tone="purple">admin</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
