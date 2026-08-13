import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Button, Card, Spinner } from '../components/ui'

type Listing = {
  id: number
  title: string
  description: string
  price: number
  location: string
  condition: string
  year: number | null
  negotiable: boolean
  videoUrl: string | null
  images: unknown
  categorySlug: string
  status: string
  seller: { id: number; name: string } | null
}

export default function ListingEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState<Listing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: 0,
    location: '',
    condition: '',
    year: '' as string | number,
    negotiable: false,
    videoUrl: '',
    imagesText: '',
  })

  useEffect(() => {
    api<Listing>(`/api/admin/listings/${id}`)
      .then((data) => {
        setListing(data)
        const images = Array.isArray(data.images)
          ? data.images
              .map((img) =>
                typeof img === 'string'
                  ? img
                  : String((img as { url?: string }).url || ''),
              )
              .filter(Boolean)
          : []
        setForm({
          title: data.title,
          description: data.description,
          price: data.price,
          location: data.location,
          condition: data.condition,
          year: data.year ?? '',
          negotiable: data.negotiable,
          videoUrl: data.videoUrl ?? '',
          imagesText: images.join('\n'),
        })
      })
      .catch((e) => setError(e.message))
  }, [id])

  async function save() {
    setSaving(true)
    try {
      const images = form.imagesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((url) => ({ url }))
      await api(`/api/admin/listings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          price: Number(form.price),
          location: form.location,
          condition: form.condition,
          year: form.year === '' ? null : Number(form.year),
          negotiable: form.negotiable,
          videoUrl: form.videoUrl || null,
          images,
        }),
      })
      navigate(`/listings/${id}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (error) return <Card className="p-6 text-sm text-red-600">{error}</Card>
  if (!listing) return <Spinner />

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-semibold">Edit listing</h2>
          <p className="text-[12px] text-gray-400">
            Category / status / seller are read-only here · {listing.categorySlug} ·{' '}
            {listing.status}
            {listing.seller ? ` · ${listing.seller.name}` : ''}
          </p>
        </div>
        <Link to={`/listings/${id}`} className="text-[12px] font-semibold text-gray-600">
          Back
        </Link>
      </div>

      <Card className="space-y-3 p-5">
        {(
          [
            ['title', 'Title', 'text'],
            ['price', 'Price (UGX)', 'number'],
            ['location', 'Location', 'text'],
            ['condition', 'Condition', 'text'],
            ['year', 'Year', 'number'],
            ['videoUrl', 'Video URL', 'text'],
          ] as const
        ).map(([key, label, type]) => (
          <label key={key} className="block text-[12px] font-medium text-gray-600">
            {label}
            <input
              type={type}
              value={String(form[key] ?? '')}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  [key]: type === 'number' ? e.target.value : e.target.value,
                }))
              }
              className="mt-1 h-9 w-full rounded-xl border border-gray-200 px-3 text-[13px] outline-none focus:ring-2 focus:ring-gray-100"
            />
          </label>
        ))}

        <label className="flex items-center gap-2 text-[13px] text-gray-700">
          <input
            type="checkbox"
            checked={form.negotiable}
            onChange={(e) => setForm((f) => ({ ...f, negotiable: e.target.checked }))}
          />
          Negotiable
        </label>

        <label className="block text-[12px] font-medium text-gray-600">
          Description
          <textarea
            rows={6}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-gray-100"
          />
        </label>

        <label className="block text-[12px] font-medium text-gray-600">
          Images (one URL per line — first is primary)
          <textarea
            rows={5}
            value={form.imagesText}
            onChange={(e) => setForm((f) => ({ ...f, imagesText: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 font-mono text-[12px] outline-none focus:ring-2 focus:ring-gray-100"
          />
        </label>

        <div className="flex gap-2 pt-2">
          <Button disabled={saving} onClick={() => void save()}>
            Save changes
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/listings/${id}`)}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  )
}
