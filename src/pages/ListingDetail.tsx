import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, formatDate } from '../lib/api'
import { Badge, Button, Card, Spinner, statusTone } from '../components/ui'

type Listing = {
  id: number
  title: string
  status: string
  description: string
  priceLabel: string
  location: string
  categorySlug: string
  subcategory: string
  condition: string
  year: number | null
  negotiable: boolean
  images: unknown
  videoUrl: string | null
  moderationNote: string | null
  featuredActive: boolean
  verified: boolean
  createdAt: string
  seller: {
    id: number
    name: string
    email: string | null
    phone: string | null
    hasVerifiedBadge: boolean
  } | null
}

function imageUrls(images: unknown): string[] {
  if (!Array.isArray(images)) return []
  return images
    .map((img) => {
      if (typeof img === 'string') return img
      if (img && typeof img === 'object') {
        const o = img as Record<string, unknown>
        return String(o.url || o.src || o.original || o.webp || '')
      }
      return ''
    })
    .filter(Boolean)
}

export default function ListingDetail() {
  const { id } = useParams()
  const [listing, setListing] = useState<Listing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const data = await api<Listing>(`/api/admin/listings/${id}`)
      setListing(data)
      setNote(data.moderationNote ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  const images = useMemo(() => imageUrls(listing?.images), [listing])

  useEffect(() => {
    if (lightbox == null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowRight') setLightbox((i) => (i == null ? i : (i + 1) % images.length))
      if (e.key === 'ArrowLeft')
        setLightbox((i) => (i == null ? i : (i - 1 + images.length) % images.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, images.length])

  async function moderate(decision: 'approve' | 'reject') {
    setBusy(true)
    try {
      await api(`/api/admin/listings/${id}/moderation`, {
        method: 'POST',
        body: JSON.stringify({ decision, note }),
      })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Moderation failed')
    } finally {
      setBusy(false)
    }
  }

  if (error) return <Card className="p-6 text-sm text-red-600">{error}</Card>
  if (!listing) return <Spinner />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[18px] font-semibold text-gray-900">{listing.title}</h2>
          <p className="text-[12px] text-gray-400">
            #{listing.id} · {formatDate(listing.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/listings/${listing.id}/edit`}
            className="rounded-full border border-gray-200 px-3.5 py-1.5 text-[12px] font-semibold"
          >
            Edit
          </Link>
          <Badge tone={statusTone(listing.status)}>{listing.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="space-y-3 p-5 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-3">
            <div>
              <p className="text-[11px] text-gray-400">Price</p>
              <p className="font-semibold">{listing.priceLabel}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Location</p>
              <p className="font-semibold">{listing.location}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Category</p>
              <p className="font-semibold">
                {listing.categorySlug}
                {listing.subcategory ? ` / ${listing.subcategory}` : ''}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Condition</p>
              <p className="font-semibold">{listing.condition}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Year</p>
              <p className="font-semibold">{listing.year ?? '—'}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Negotiable</p>
              <p className="font-semibold">{listing.negotiable ? 'Yes' : 'No'}</p>
            </div>
          </div>
          <div>
            <p className="mb-1 text-[11px] text-gray-400">Description</p>
            <p className="whitespace-pre-wrap text-[13px] text-gray-700">{listing.description}</p>
          </div>
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setLightbox(i)}
                  className="overflow-hidden rounded-xl border border-gray-100"
                >
                  <img src={src} alt="" className="h-28 w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 text-[14px] font-semibold">Seller</h3>
            {listing.seller ? (
              <div className="space-y-1 text-[13px]">
                <Link to={`/users/${listing.seller.id}`} className="font-medium hover:underline">
                  {listing.seller.name}
                </Link>
                <p className="text-gray-500">{listing.seller.email}</p>
                <p className="text-gray-500">{listing.seller.phone ?? 'No phone'}</p>
                {listing.seller.hasVerifiedBadge && <Badge tone="blue">Verified badge</Badge>}
              </div>
            ) : (
              <p className="text-[13px] text-gray-400">No seller linked</p>
            )}
          </Card>

          <Card className="space-y-3 p-5">
            <h3 className="text-[14px] font-semibold">Moderation</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Moderation note…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-gray-100"
            />
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => void moderate('approve')}>
                Approve
              </Button>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => void moderate('reject')}
              >
                Reject
              </Button>
            </div>
            <p className="text-[11px] text-gray-400">
              Reprocess & watermark runs through the mono-repo image pipeline — use that backend for
              WebP watermark jobs.
            </p>
          </Card>
        </div>
      </div>

      {lightbox != null && images[lightbox] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[lightbox]}
              alt=""
              className="max-h-[80vh] max-w-full rounded-lg object-contain"
            />
            <div className="mt-3 flex items-center justify-between gap-3 text-white">
              <button type="button" onClick={() => setLightbox((i) => (i! - 1 + images.length) % images.length)}>
                ← Prev
              </button>
              <a href={images[lightbox]} target="_blank" rel="noreferrer" className="underline">
                Open original
              </a>
              <button type="button" onClick={() => setLightbox((i) => (i! + 1) % images.length)}>
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
