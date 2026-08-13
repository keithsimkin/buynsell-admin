import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api, formatDate, formatUgx, parsePage, parsePageSize } from '../lib/api'
import { Badge, Button, Card, Pagination, Spinner, statusTone } from '../components/ui'

type Workspace = {
  user: {
    id: number
    name: string
    email: string | null
    phone: string | null
    whatsapp: string | null
    avatar: string | null
    firstName: string | null
    lastName: string | null
    phoneVerified: boolean
    role: string
    joinedAt: string | null
    businessName: string | null
    businessAddress: string | null
    taxId: string | null
    location: string | null
    gender: string | null
    language: string | null
    accountState: string
    restrictionReason: string | null
    walletBalanceUgx: number
    hasVerifiedBadge: boolean
    hasAnalytics: boolean
    hasApiAccess: boolean
    hasCustomBranding: boolean
    settings: Record<string, unknown>
    idVerificationStatus: string
  }
  inventory: {
    active: number
    draft: number
    review: number
    featured: number
    reported: number
  }
  pricing: {
    currentPlan: {
      assignmentId: number
      planId: number
      displayName: string
      tierCode: string
      topPlusPromotions: number
      priceUgx: number
      nextBillingDate: string | null
      isBaseline: boolean
      isFree: boolean
    } | null
    events: { id: number; event_type: string; created_at: string }[]
  }
  wallet: {
    balanceUgx: number
    transactions: {
      id: number
      amount_ugx: number
      transaction_type: string
      description: string | null
      created_at: string
    }[]
  }
  auditTrail: {
    id: number
    action: string
    createdAt: string
    adminName: string | null
  }[]
}

type ListingRow = {
  id: number
  title: string
  status: string
  featuredActive: boolean
  priceLabel: string
  createdAt: string
}

type Plan = {
  id: number
  slug: string
  displayName: string
  tierCode: string
  family: string
  priceUgx: number
  isFree: boolean
  topPlusPromotions: number
}

type ProfileForm = {
  name: string
  email: string
  phone: string
  whatsapp: string
  avatar: string
  firstName: string
  lastName: string
  location: string
  businessName: string
  businessAddress: string
  taxId: string
  gender: string
  language: string
  phoneVerified: boolean
}

function emptyProfile(): ProfileForm {
  return {
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    avatar: '',
    firstName: '',
    lastName: '',
    location: '',
    businessName: '',
    businessAddress: '',
    taxId: '',
    gender: '',
    language: 'en',
    phoneVerified: false,
  }
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block text-[12px] font-medium text-gray-600">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  )
}

const inputClass =
  'h-9 w-full rounded-xl border border-gray-200 px-3 text-[13px] outline-none focus:ring-2 focus:ring-gray-100'

export default function UserWorkspace() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const listingsPage = parsePage(searchParams.get('lp'))
  const listingsPageSize = parsePageSize(searchParams.get('ll'), 10)
  const [data, setData] = useState<Workspace | null>(null)
  const [listings, setListings] = useState<ListingRow[]>([])
  const [listingsTotal, setListingsTotal] = useState(0)
  const [plans, setPlans] = useState<Plan[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile())
  const [planSlug, setPlanSlug] = useState('')
  const [planNotes, setPlanNotes] = useState('')

  const planGroups = useMemo(() => {
    const map = new Map<string, Plan[]>()
    for (const plan of plans) {
      const key = plan.family || 'other'
      const list = map.get(key) ?? []
      list.push(plan)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [plans])

  async function load() {
    try {
      const ws = await api<Workspace>(`/api/admin/users/${id}/workspace`)
      setData(ws)
      setReason(ws.user.restrictionReason ?? '')
      setProfile({
        name: ws.user.name ?? '',
        email: ws.user.email ?? '',
        phone: ws.user.phone ?? '',
        whatsapp: ws.user.whatsapp ?? '',
        avatar: ws.user.avatar ?? '',
        firstName: ws.user.firstName ?? '',
        lastName: ws.user.lastName ?? '',
        location: ws.user.location ?? '',
        businessName: ws.user.businessName ?? '',
        businessAddress: ws.user.businessAddress ?? '',
        taxId: ws.user.taxId ?? '',
        gender: ws.user.gender ?? '',
        language: ws.user.language ?? 'en',
        phoneVerified: Boolean(ws.user.phoneVerified),
      })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  async function loadListings() {
    if (!id) return
    try {
      const res = await api<{ items: ListingRow[]; total: number }>(
        `/api/admin/listings?sellerId=${id}&page=${listingsPage}&limit=${listingsPageSize}`,
      )
      setListings(res.items)
      setListingsTotal(res.total)
    } catch {
      setListings([])
      setListingsTotal(0)
    }
  }

  useEffect(() => {
    void load()
    api<{ items: Plan[] }>('/api/admin/pricing/plans')
      .then((res) => {
        setPlans(res.items)
        setPlanSlug((current) => current || res.items.find((p) => !p.isFree)?.slug || res.items[0]?.slug || '')
      })
      .catch(() => setPlans([]))
  }, [id])

  useEffect(() => {
    void loadListings()
  }, [id, listingsPage, listingsPageSize])

  async function run(action: () => Promise<void>, success?: string) {
    setBusy(true)
    setMessage(null)
    try {
      await action()
      if (success) setMessage(success)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  async function patch(path: string, body: unknown) {
    await run(async () => {
      await api(`/api/admin/users/${id}/${path}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
    }, 'Updated')
  }

  async function saveProfile() {
    await run(async () => {
      await api(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(profile),
      })
    }, 'Profile saved')
  }

  async function sendPasswordReset() {
    if (!profile.email) {
      alert('User has no email on file')
      return
    }
    if (!confirm(`Send password reset link to ${profile.email}?`)) return
    await run(async () => {
      const res = await api<{ message: string }>(`/api/admin/users/${id}/password-reset`, {
        method: 'POST',
      })
      setMessage(res.message)
    })
  }

  async function assignPlan() {
    if (!planSlug) return
    if (!confirm(`Assign plan "${planSlug}" to this account?`)) return
    await run(async () => {
      await api(`/api/admin/users/${id}/plan`, {
        method: 'POST',
        body: JSON.stringify({ planSlug, notes: planNotes || null }),
      })
      setPlanNotes('')
    }, 'Plan updated')
  }

  if (error) return <Card className="p-6 text-sm text-red-600">{error}</Card>
  if (!data) return <Spinner />

  const u = data.user

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt=""
                className="h-14 w-14 rounded-2xl object-cover ring-1 ring-gray-100"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-[14px] font-semibold text-gray-500">
                {(u.name || '?').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-[20px] font-semibold">{u.name}</h2>
              <p className="text-[13px] text-gray-500">
                {u.email} · {u.phone || 'no phone'} · joined {formatDate(u.joinedAt)}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone={statusTone(u.role)}>{u.role}</Badge>
                <Badge tone={statusTone(u.accountState)}>{u.accountState}</Badge>
                <Badge tone={statusTone(u.idVerificationStatus)}>
                  ID: {u.idVerificationStatus}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={busy} onClick={() => void sendPasswordReset()}>
              Send reset password link
            </Button>
            <Link
              to="/users"
              className="inline-flex items-center rounded-full border border-gray-200 px-3.5 py-1.5 text-[12px] font-semibold text-gray-700"
            >
              Back
            </Link>
          </div>
        </div>
        {message ? (
          <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
            {message}
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-5 gap-2 text-center text-[12px]">
          {(
            [
              ['Active', data.inventory.active],
              ['Draft', data.inventory.draft],
              ['Review', data.inventory.review],
              ['Reported', data.inventory.reported],
              ['Featured', data.inventory.featured],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-xl bg-gray-50 px-3 py-2">
              <p className="text-[15px] font-semibold">{value}</p>
              <p className="text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold">Edit profile</h3>
            <Button disabled={busy} onClick={() => void saveProfile()}>
              Save profile
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Display name">
              <input
                className={inputClass}
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              />
            </Field>
            <Field label="Email">
              <input
                className={inputClass}
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              />
            </Field>
            <Field label="First name">
              <input
                className={inputClass}
                value={profile.firstName}
                onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
              />
            </Field>
            <Field label="Last name">
              <input
                className={inputClass}
                value={profile.lastName}
                onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
              />
            </Field>
            <Field label="Phone">
              <input
                className={inputClass}
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              />
            </Field>
            <Field label="WhatsApp">
              <input
                className={inputClass}
                value={profile.whatsapp}
                onChange={(e) => setProfile((p) => ({ ...p, whatsapp: e.target.value }))}
              />
            </Field>
            <Field label="Location">
              <input
                className={inputClass}
                value={profile.location}
                onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
              />
            </Field>
            <Field label="Gender">
              <input
                className={inputClass}
                value={profile.gender}
                onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}
              />
            </Field>
            <Field label="Business name">
              <input
                className={inputClass}
                value={profile.businessName}
                onChange={(e) => setProfile((p) => ({ ...p, businessName: e.target.value }))}
              />
            </Field>
            <Field label="Tax ID">
              <input
                className={inputClass}
                value={profile.taxId}
                onChange={(e) => setProfile((p) => ({ ...p, taxId: e.target.value }))}
              />
            </Field>
            <Field label="Business address">
              <input
                className={inputClass}
                value={profile.businessAddress}
                onChange={(e) => setProfile((p) => ({ ...p, businessAddress: e.target.value }))}
              />
            </Field>
            <Field label="Language">
              <input
                className={inputClass}
                value={profile.language}
                onChange={(e) => setProfile((p) => ({ ...p, language: e.target.value }))}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-gray-700">
            <input
              type="checkbox"
              checked={profile.phoneVerified}
              onChange={(e) => setProfile((p) => ({ ...p, phoneVerified: e.target.checked }))}
            />
            Phone verified
          </label>
        </Card>

        <Card className="space-y-3 p-5">
          <h3 className="text-[14px] font-semibold">Profile photo / file URL</h3>
          <p className="text-[12px] text-gray-400">
            Paste an image URL (S3 or CDN). Direct file upload to storage can be added later; this
            writes the avatar field in the database now.
          </p>
          <Field label="Avatar URL">
            <input
              className={inputClass}
              value={profile.avatar}
              onChange={(e) => setProfile((p) => ({ ...p, avatar: e.target.value }))}
              placeholder="https://…"
            />
          </Field>
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt="Avatar preview"
              className="h-28 w-28 rounded-2xl object-cover ring-1 ring-gray-100"
            />
          ) : null}
          <div className="flex gap-2">
            <Button disabled={busy} onClick={() => void saveProfile()}>
              Save photo URL
            </Button>
            <Button
              variant="ghost"
              disabled={busy || !profile.avatar}
              onClick={() => setProfile((p) => ({ ...p, avatar: '' }))}
            >
              Clear
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-5">
          <h3 className="text-[14px] font-semibold">Role & account state</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || u.role === 'user'}
              onClick={() => void patch('role', { role: 'user' })}
            >
              Set user
            </Button>
            <Button
              variant="secondary"
              disabled={busy || u.role === 'admin'}
              onClick={() => void patch('role', { role: 'admin' })}
            >
              Set admin
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['active', 'restricted', 'suspended'] as const).map((state) => (
              <Button
                key={state}
                variant={u.accountState === state ? 'primary' : 'secondary'}
                disabled={busy}
                onClick={() =>
                  void patch('account-state', {
                    accountState: state,
                    restrictionReason: reason,
                  })
                }
              >
                {state}
              </Button>
            ))}
          </div>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Restriction reason"
            className={inputClass}
          />
        </Card>

        <Card className="space-y-3 p-5">
          <h3 className="text-[14px] font-semibold">Capabilities & settings</h3>
          {(
            [
              ['hasVerifiedBadge', 'Verified badge', u.hasVerifiedBadge],
              ['hasAnalytics', 'Analytics', u.hasAnalytics],
              ['hasApiAccess', 'API access', u.hasApiAccess],
              ['hasCustomBranding', 'Custom branding', u.hasCustomBranding],
            ] as const
          ).map(([key, label, value]) => (
            <label key={key} className="flex items-center justify-between text-[13px]">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={value}
                disabled={busy}
                onChange={(e) => void patch('capabilities', { [key]: e.target.checked })}
              />
            </label>
          ))}
          <label className="flex items-center justify-between text-[13px]">
            <span>Disable chats</span>
            <input
              type="checkbox"
              checked={Boolean(u.settings?.disableChats)}
              disabled={busy}
              onChange={(e) => void patch('settings', { disableChats: e.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between text-[13px]">
            <span>Disable feedback</span>
            <input
              type="checkbox"
              checked={Boolean(u.settings?.disableFeedback)}
              disabled={busy}
              onChange={(e) => void patch('settings', { disableFeedback: e.target.checked })}
            />
          </label>
        </Card>
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-semibold">Plan</h3>
            {data.pricing.currentPlan ? (
              <p className="mt-1 text-[13px] text-gray-600">
                Current: <span className="font-semibold">{data.pricing.currentPlan.displayName}</span>
                {' · '}
                {formatUgx(data.pricing.currentPlan.priceUgx)}
                {' · TOP+ '}
                {data.pricing.currentPlan.topPlusPromotions}
                {' · Next billing '}
                {formatDate(data.pricing.currentPlan.nextBillingDate)}
              </p>
            ) : (
              <p className="mt-1 text-[13px] text-gray-400">No active assignment</p>
            )}
          </div>
          <p className="text-[12px] text-gray-500">Wallet: {formatUgx(data.wallet.balanceUgx)}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_auto]">
          <Field label="Assign / change plan">
            <select
              className={inputClass}
              value={planSlug}
              onChange={(e) => setPlanSlug(e.target.value)}
            >
              {planGroups.map(([family, items]) => (
                <optgroup key={family} label={family}>
                  {items.map((plan) => (
                    <option key={plan.slug} value={plan.slug}>
                      {plan.displayName} · {formatUgx(plan.priceUgx)}
                      {plan.isFree ? ' (free)' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <input
              className={inputClass}
              value={planNotes}
              onChange={(e) => setPlanNotes(e.target.value)}
              placeholder="Optional operator note"
            />
          </Field>
          <div className="flex items-end">
            <Button disabled={busy || !planSlug} onClick={() => void assignPlan()}>
              Apply plan
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3">
            <h3 className="text-[14px] font-semibold">Listings</h3>
            <span className="text-[12px] text-gray-400">{listingsTotal}</span>
          </div>
          <ul className="divide-y divide-gray-50">
            {listings.map((l) => (
              <li key={l.id} className="flex items-center justify-between px-5 py-2.5 text-[13px]">
                <Link to={`/listings/${l.id}`} className="hover:underline">
                  {l.title}
                </Link>
                <Badge tone={statusTone(l.status)}>{l.status}</Badge>
              </li>
            ))}
            {listings.length === 0 && (
              <li className="px-5 py-4 text-[12px] text-gray-400">No listings</li>
            )}
          </ul>
          <Pagination
            page={listingsPage}
            pageSize={listingsPageSize}
            total={listingsTotal}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={(p) => {
              const params = new URLSearchParams(searchParams)
              if (p <= 1) params.delete('lp')
              else params.set('lp', String(p))
              setSearchParams(params)
            }}
            onPageSizeChange={(size) => {
              const params = new URLSearchParams(searchParams)
              params.delete('lp')
              if (size === 10) params.delete('ll')
              else params.set('ll', String(size))
              setSearchParams(params)
            }}
          />
        </Card>

        <Card>
          <div className="border-b border-gray-50 px-5 py-3">
            <h3 className="text-[14px] font-semibold">Account audit trail</h3>
          </div>
          <ul className="divide-y divide-gray-50">
            {data.auditTrail.map((a) => (
              <li key={a.id} className="flex justify-between px-5 py-2.5 text-[13px]">
                <span>
                  {a.action} · {a.adminName ?? 'admin'}
                </span>
                <span className="text-gray-400">{formatDate(a.createdAt)}</span>
              </li>
            ))}
            {data.auditTrail.length === 0 && (
              <li className="px-5 py-4 text-[12px] text-gray-400">No account-scoped audit events</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  )
}
