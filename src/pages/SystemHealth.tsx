import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Badge, Card, Spinner, statusTone } from '../components/ui'

type Health = {
  backend: { ok: boolean; timestamp: string }
  database: { ok: boolean }
  cookies: { configured: boolean; warnings: string[] }
  convex: { configured: boolean }
}

function Ready({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Card className="flex items-center justify-between p-4">
      <span className="text-[13px] font-medium text-gray-800">{label}</span>
      <Badge tone={ok ? 'lime' : 'red'}>{ok ? 'Ready' : 'Down'}</Badge>
    </Card>
  )
}

export default function SystemHealth() {
  const [data, setData] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Health>('/api/admin/system/health')
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <Card className="p-6 text-sm text-red-600">{error}</Card>
  if (!data) return <Spinner />

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Ready ok={data.backend.ok} label="Backend API" />
        <Ready ok={data.database.ok} label="Database" />
        <Ready ok={data.cookies.configured} label="Cookie secret" />
        <Ready ok={data.convex.configured} label="Convex" />
      </div>
      <Card>
        <div className="border-b border-gray-50 px-5 py-3">
          <h3 className="text-[14px] font-semibold">Cookie / auth warnings</h3>
        </div>
        {data.cookies.warnings.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-gray-400">No warnings</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {data.cookies.warnings.map((w) => (
              <li key={w} className="flex items-start gap-2 px-5 py-3 text-[13px] text-amber-800">
                <Badge tone={statusTone('pending')}>warn</Badge>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-[12px] text-gray-400">Checked at {data.backend.timestamp}</p>
    </div>
  )
}
