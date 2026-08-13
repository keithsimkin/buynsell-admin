import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, DEFAULT_PAGE_SIZE, formatDate, parsePage, parsePageSize } from '../lib/api'
import { Badge, Button, Card, EmptyState, Pagination, Spinner, statusTone } from '../components/ui'

type Doc = {
  id: number
  userId: number
  userName: string | null
  userEmail: string | null
  userPhone: string | null
  fullName: string | null
  documentType: string | null
  status: string
  submittedAt: string
  idFrontUrl: string
  idBackUrl: string
  selfieUrl: string
  reviewNotes: string | null
}

export default function IdVerification() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('status') as 'pending' | 'approved' | 'rejected') || 'pending'
  const page = parsePage(searchParams.get('page'))
  const pageSize = parsePageSize(searchParams.get('limit'), DEFAULT_PAGE_SIZE)
  const [docs, setDocs] = useState<Doc[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})

  async function load() {
    setLoading(true)
    try {
      const data = await api<{ documents: Doc[]; total: number }>(
        `/api/admin/id-verification?status=${tab}&limit=${pageSize}&page=${page}`,
      )
      setDocs(data.documents)
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
  }, [tab, page, pageSize])

  async function review(id: number, status: 'approved' | 'rejected') {
    try {
      await api(`/api/admin/id-verification/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ status, reviewNotes: notes[id] || null }),
      })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Review failed')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              const params = new URLSearchParams()
              if (s !== 'pending') params.set('status', s)
              if (pageSize !== DEFAULT_PAGE_SIZE) params.set('limit', String(pageSize))
              setSearchParams(params)
            }}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold capitalize ${
              tab === s ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3">
          <h3 className="text-[14px] font-semibold capitalize">{tab} verifications</h3>
          <span className="text-[12px] text-gray-400">{total}</span>
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="p-5 text-sm text-red-600">{error}</p>
        ) : docs.length === 0 ? (
          <EmptyState title={`No ${tab} verifications`} />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-2">
            {docs.map((d) => (
              <div key={d.id} className="rounded-2xl border border-gray-100 p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/users/${d.userId}`}
                      className="text-[15px] font-semibold hover:underline"
                    >
                      {d.userName ?? d.fullName ?? `User #${d.userId}`}
                    </Link>
                    <p className="text-[12px] text-gray-400">
                      {d.userEmail} · {d.userPhone || 'no phone'}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Submitted {formatDate(d.submittedAt)} · {d.documentType || 'ID'}
                    </p>
                  </div>
                  <Badge tone={statusTone(d.status)}>{d.status}</Badge>
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2">
                  {[
                    ['Front', d.idFrontUrl],
                    ['Back', d.idBackUrl],
                    ['Selfie', d.selfieUrl],
                  ].map(([label, url]) => (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-xl border border-gray-100"
                    >
                      <img src={url} alt={label} className="h-28 w-full object-cover" />
                      <p className="bg-gray-50 py-1 text-center text-[10px] font-medium text-gray-500">
                        {label}
                      </p>
                    </a>
                  ))}
                </div>

                {tab === 'pending' && (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      placeholder="Review notes…"
                      value={notes[d.id] ?? ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [d.id]: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px]"
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => void review(d.id, 'approved')}>Approve</Button>
                      <Button variant="danger" onClick={() => void review(d.id, 'rejected')}>
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
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
