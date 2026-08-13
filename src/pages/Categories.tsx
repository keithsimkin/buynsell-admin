import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Badge, Button, Card, EmptyState, Spinner } from '../components/ui'

type Category = {
  slug: string
  name: string
  icon: string
  subcategories: string[]
}

export default function Categories() {
  const [items, setItems] = useState<Category[]>([])
  const [selected, setSelected] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [subs, setSubs] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await api<{ items: Category[] }>('/api/admin/categories')
      setItems(data.items)
      if (!selected && data.items[0]) select(data.items[0])
    } finally {
      setLoading(false)
    }
  }

  function select(cat: Category) {
    setSelected(cat)
    setName(cat.name)
    setIcon(cat.icon)
    setSubs((cat.subcategories || []).join('\n'))
  }

  useEffect(() => {
    void load()
  }, [])

  async function save() {
    if (!selected) return
    setBusy(true)
    try {
      await api(`/api/admin/categories/${selected.slug}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          icon,
          subcategories: subs
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <Card>
        <div className="border-b border-gray-50 px-4 py-3 text-[14px] font-semibold">
          Categories ({items.length})
        </div>
        <ul className="max-h-[70vh] overflow-y-auto divide-y divide-gray-50">
          {items.map((c) => (
            <li key={c.slug}>
              <button
                type="button"
                onClick={() => select(c)}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] hover:bg-gray-50 ${
                  selected?.slug === c.slug ? 'bg-bn-lime/40' : ''
                }`}
              >
                <span>{c.icon}</span>
                <span className="truncate font-medium">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-3 p-5">
        {!selected ? (
          <EmptyState title="Select a category" />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-semibold">{selected.name}</h3>
                <p className="text-[12px] text-gray-400">{selected.slug}</p>
              </div>
              <Badge tone="blue">{selected.subcategories?.length ?? 0} subs</Badge>
            </div>
            <label className="block text-[12px] font-medium text-gray-600">
              Name
              <input
                className="mt-1 h-9 w-full rounded-xl border border-gray-200 px-3 text-[13px]"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block text-[12px] font-medium text-gray-600">
              Icon
              <input
                className="mt-1 h-9 w-full rounded-xl border border-gray-200 px-3 text-[13px]"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
              />
            </label>
            <label className="block text-[12px] font-medium text-gray-600">
              Subcategories (one per line)
              <textarea
                rows={10}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px]"
                value={subs}
                onChange={(e) => setSubs(e.target.value)}
              />
            </label>
            <Button disabled={busy} onClick={() => void save()}>
              Save category
            </Button>
          </>
        )}
      </Card>
    </div>
  )
}
