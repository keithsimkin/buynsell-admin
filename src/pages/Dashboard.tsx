import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  Package,
  ShieldAlert,
  Users,
  Zap,
  Activity,
  ChevronRight,
} from 'lucide-react'
import { api, formatDate } from '../lib/api'
import { Badge, Card, Spinner, statusTone } from '../components/ui'

type Summary = {
  counts: {
    totalListings: number
    activeListings: number
    draftListings: number
    listingsInReview: number
    rejectedListings: number
    featuredListings: number
    pendingListingReports: number
    pendingConversationReports: number | null
    pendingIdVerifications: number
    restrictedAccounts: number
    totalUsers: number
    activePaidPlans: number
  }
  listingCountsByStatus: { status: string; total: number }[]
  accountCounts: {
    admins: number
    verifiedPhones: number
    verifiedBadges: number
    businessProfiles: number
  }
  queues: {
    inReview: {
      id: number
      title: string
      priceLabel: string
      createdAt: string
      seller: { id: number; name: string } | null
    }[]
    idVerification: {
      id: number
      userId: number
      fullName: string | null
      userName: string | null
      submittedAt: string
    }[]
    restrictedAccounts: {
      id: number
      name: string
      email: string | null
      accountState: string
      restrictionReason: string | null
    }[]
    featured: {
      id: number
      title: string
      priceLabel: string
      seller: { id: number; name: string } | null
    }[]
  }
  dependencyStatus: {
    database: string
    convexReports: string
    pricing: string
  }
  warnings: string[]
  recentAuditLogs: {
    id: number
    action: string
    targetType: string
    targetId: string | null
    createdAt: string
    adminUser: { id: number; name: string; email: string } | null
  }[]
  pricing: { totalAssignments: number; activeAssignments: number }
}

function auditHref(targetType: string, targetId: string | null) {
  if (!targetId) return null
  if (targetType === 'listing') return `/listings/${targetId}`
  if (targetType === 'user') return `/users/${targetId}`
  if (targetType === 'id_verification') return '/id-verification'
  if (targetType === 'listing_report') return '/reports/listings'
  return null
}

function actionLabel(action: string) {
  return action.replace(/_/g, ' ')
}

function TileLink({
  to,
  label,
  value,
  hint,
  pulse = false,
}: {
  to: string
  label: string
  value: string | number
  hint: string
  pulse?: boolean
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-[118px] flex-col justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium text-gray-500">{label}</p>
        <ChevronRight className="h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-600" />
      </div>
      <div>
        <p className="text-[28px] font-semibold tracking-tight text-gray-900">{value}</p>
        <p className={`mt-1 text-[11px] ${pulse ? 'font-semibold text-amber-700' : 'text-gray-400'}`}>
          {hint}
        </p>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Summary>('/api/admin/dashboard/summary')
      .then(setSummary)
      .catch((e) => setError(e.message))
  }, [])

  const attention = useMemo(() => {
    if (!summary) return []
    return [
      {
        key: 'review',
        count: summary.counts.listingsInReview,
        label: 'Listings waiting for review',
        to: '/listings?status=inreview',
        tone: 'orange' as const,
      },
      {
        key: 'id',
        count: summary.counts.pendingIdVerifications,
        label: 'ID checks to decide',
        to: '/id-verification',
        tone: 'blue' as const,
      },
      {
        key: 'reports',
        count: summary.counts.pendingListingReports,
        label: 'Listing reports open',
        to: '/reports/listings',
        tone: 'red' as const,
      },
      {
        key: 'accounts',
        count: summary.counts.restrictedAccounts,
        label: 'Restricted / suspended accounts',
        to: '/users?accountState=watchlist',
        tone: 'gray' as const,
      },
    ].filter((item) => item.count > 0)
  }, [summary])

  if (error) {
    return (
      <Card className="p-6 text-sm text-red-600">
        Failed to load dashboard: {error}. Is the API running on :8787?
      </Card>
    )
  }

  if (!summary) return <Spinner />

  const needsYou =
    summary.counts.listingsInReview +
    summary.counts.pendingIdVerifications +
    summary.counts.pendingListingReports

  return (
    <div className="flex flex-col gap-5">
      {/* Workboard header */}
      <section className="relative overflow-hidden rounded-3xl bg-bn-dark px-5 py-6 text-white sm:px-7">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #b8f04a 0%, transparent 70%)' }}
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
              Moderator workboard
            </p>
            <h2 className="mt-2 text-[28px] font-semibold tracking-tight sm:text-[32px]">
              {needsYou > 0
                ? `${needsYou} item${needsYou === 1 ? '' : 's'} need you`
                : 'Inbox is clear — keep the marketplace humming'}
            </h2>
            <p className="mt-2 text-[14px] text-white/65">
              Click anything on this page to jump straight into the queue, listing, or account.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/listings?status=inreview"
              className="inline-flex items-center gap-1.5 rounded-full bg-bn-lime px-4 py-2 text-[12px] font-semibold text-gray-900 transition hover:bg-bn-lime-dark"
            >
              Review queue <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/id-verification"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-white/10"
            >
              ID checks
            </Link>
            <Link
              to="/listings"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-white/10"
            >
              Full inventory
            </Link>
          </div>
        </div>

        {attention.length > 0 && (
          <div className="relative mt-5 flex flex-wrap gap-2">
            {attention.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-white/20"
              >
                <Badge tone={item.tone}>{item.count}</Badge>
                <span>{item.label}</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Clickable metric tiles */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TileLink
          to="/listings?status=inreview"
          label="Needs review"
          value={summary.counts.listingsInReview}
          hint="Open moderation queue"
          pulse={summary.counts.listingsInReview > 0}
        />
        <TileLink
          to="/listings?status=active"
          label="Live inventory"
          value={summary.counts.activeListings}
          hint={`${summary.counts.totalListings} total listings`}
        />
        <TileLink
          to="/id-verification"
          label="ID queue"
          value={summary.counts.pendingIdVerifications}
          hint="Pending document reviews"
          pulse={summary.counts.pendingIdVerifications > 0}
        />
        <TileLink
          to="/users?hasActivePaidPlan=true"
          label="Paid sellers"
          value={summary.counts.activePaidPlans}
          hint={`${summary.counts.totalUsers} accounts total`}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TileLink
          to="/listings?status=draft"
          label="Drafts"
          value={summary.counts.draftListings}
          hint="Seller inventory not live"
        />
        <TileLink
          to="/listings?status=rejected"
          label="Rejected"
          value={summary.counts.rejectedListings}
          hint="Recently turned down"
        />
        <TileLink
          to="/listings?featuredOnly=true"
          label="TOP+ live"
          value={summary.counts.featuredListings}
          hint="Boosted listings"
        />
        <TileLink
          to="/reports/listings"
          label="Trust reports"
          value={summary.counts.pendingListingReports}
          hint="Listing complaints"
          pulse={summary.counts.pendingListingReports > 0}
        />
      </section>

      {/* Action queues */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-amber-600" />
              <h3 className="text-[14px] font-semibold">Review now</h3>
            </div>
            <Link
              to="/listings?status=inreview"
              className="text-[12px] font-semibold text-gray-500 hover:text-gray-900"
            >
              View all →
            </Link>
          </div>
          {summary.queues.inReview.length === 0 ? (
            <p className="px-5 py-8 text-[13px] text-gray-400">No listings waiting in review.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {summary.queues.inReview.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/listings/${item.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-amber-50/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-gray-900">{item.title}</p>
                      <p className="text-[11px] text-gray-400">
                        {item.priceLabel}
                        {item.seller ? ` · ${item.seller.name}` : ''} · {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <Badge tone="orange">Review</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-sky-600" />
              <h3 className="text-[14px] font-semibold">ID verification</h3>
            </div>
            <Link
              to="/id-verification"
              className="text-[12px] font-semibold text-gray-500 hover:text-gray-900"
            >
              Open queue →
            </Link>
          </div>
          {summary.queues.idVerification.length === 0 ? (
            <p className="px-5 py-8 text-[13px] text-gray-400">No pending ID submissions.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {summary.queues.idVerification.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-sky-50/50"
                >
                  <Link to="/id-verification" className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-gray-900">
                      {item.userName || item.fullName || `User #${item.userId}`}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Submitted {formatDate(item.submittedAt)}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/users/${item.userId}`}
                      className="text-[11px] font-semibold text-gray-500 hover:text-gray-900"
                    >
                      Account
                    </Link>
                    <Link to="/id-verification">
                      <Badge tone="blue">Pending</Badge>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Status navigator */}
        <Card>
          <div className="border-b border-gray-50 px-5 py-3.5">
            <h3 className="text-[14px] font-semibold">Browse by status</h3>
            <p className="text-[11px] text-gray-400">Tap a status to open filtered inventory</p>
          </div>
          <ul className="divide-y divide-gray-50">
            {summary.listingCountsByStatus.map((row) => (
              <li key={row.status}>
                <Link
                  to={`/listings?status=${encodeURIComponent(row.status)}`}
                  className="flex items-center justify-between px-5 py-3 transition hover:bg-gray-50"
                >
                  <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-gray-800">
                    {row.total}
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        {/* Account shortcuts */}
        <Card>
          <div className="border-b border-gray-50 px-5 py-3.5">
            <h3 className="text-[14px] font-semibold">Account shortcuts</h3>
            <p className="text-[11px] text-gray-400">Filtered CRM views</p>
          </div>
          <ul className="divide-y divide-gray-50 text-[13px]">
            {(
              [
                ['Admins', summary.accountCounts.admins, '/users?role=admin'],
                [
                  'Verified badges',
                  summary.accountCounts.verifiedBadges,
                  '/users?hasVerifiedBadge=true',
                ],
                ['Paid plans', summary.counts.activePaidPlans, '/users?hasActivePaidPlan=true'],
                [
                  'Restricted / suspended',
                  summary.counts.restrictedAccounts,
                  '/users?accountState=watchlist',
                ],
                ['All accounts', summary.counts.totalUsers, '/users'],
              ] as const
            ).map(([label, value, to]) => (
              <li key={label}>
                <Link
                  to={to}
                  className="flex items-center justify-between px-5 py-3 transition hover:bg-gray-50"
                >
                  <span className="text-gray-600">{label}</span>
                  <span className="flex items-center gap-2 font-semibold text-gray-900">
                    {value}
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        {/* Restricted accounts preview */}
        <Card>
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              <h3 className="text-[14px] font-semibold">Watchlist</h3>
            </div>
            <Link
              to="/users?accountState=watchlist"
              className="text-[12px] font-semibold text-gray-500 hover:text-gray-900"
            >
              All →
            </Link>
          </div>
          {summary.queues.restrictedAccounts.length === 0 ? (
            <p className="px-5 py-8 text-[13px] text-gray-400">No restricted accounts.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {summary.queues.restrictedAccounts.map((u) => (
                <li key={u.id}>
                  <Link
                    to={`/users/${u.id}`}
                    className="block px-5 py-3 transition hover:bg-red-50/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-medium">{u.name}</p>
                      <Badge tone={statusTone(u.accountState)}>{u.accountState}</Badge>
                    </div>
                    <p className="truncate text-[11px] text-gray-400">
                      {u.restrictionReason || u.email || 'Open workspace'}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Featured + destinations */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-600" />
              <h3 className="text-[14px] font-semibold">TOP+ right now</h3>
            </div>
            <Link
              to="/listings?featuredOnly=true"
              className="text-[12px] font-semibold text-gray-500 hover:text-gray-900"
            >
              Manage boosts →
            </Link>
          </div>
          {summary.queues.featured.length === 0 ? (
            <p className="px-5 py-8 text-[13px] text-gray-400">No active TOP+ boosts.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {summary.queues.featured.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/listings/${item.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-violet-50/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{item.title}</p>
                      <p className="text-[11px] text-gray-400">
                        {item.priceLabel}
                        {item.seller ? ` · ${item.seller.name}` : ''}
                      </p>
                    </div>
                    <Badge tone="green">TOP+</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-white p-5 lg:col-span-2">
          <h3 className="text-[14px] font-semibold">Jump anywhere</h3>
          <p className="mt-1 text-[12px] text-gray-400">Common destinations for daily ops</p>
          <div className="mt-4 grid grid-cols-1 gap-2">
            {(
              [
                ['Inventory', '/listings', Package],
                ['Accounts', '/users', Users],
                ['Listing reports', '/reports/listings', ShieldAlert],
                ['Analytics', '/analytics', Activity],
                ['System health', '/system-health', Activity],
                ['ID verification', '/id-verification', BadgeCheck],
              ] as const
            ).map(([label, to, Icon]) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-[13px] font-medium transition hover:border-gray-200 hover:bg-bn-lime/30"
              >
                <Icon className="h-4 w-4 text-gray-500" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
              </Link>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-[11px] text-gray-500">
            <Link to="/system-health" className="font-semibold text-gray-800 hover:underline">
              Dependencies
            </Link>
            : DB {summary.dependencyStatus.database} · Pricing {summary.dependencyStatus.pricing} ·
            Convex {summary.dependencyStatus.convexReports}
          </div>
        </Card>
      </section>

      {summary.warnings.length > 0 && (
        <Link
          to="/system-health"
          className="block rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-[12px] text-amber-900 transition hover:bg-amber-50"
        >
          <span className="font-semibold">System notes · </span>
          {summary.warnings[0]}
          {summary.warnings.length > 1 ? ` (+${summary.warnings.length - 1} more)` : ''}
        </Link>
      )}

      {/* Clickable audit trail */}
      <Card>
        <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
          <h3 className="text-[14px] font-semibold">Recent admin actions</h3>
          <span className="text-[11px] text-gray-400">Click a row to open the target</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="px-5 py-2.5 font-medium">Action</th>
                <th className="px-3 py-2.5 font-medium">Target</th>
                <th className="px-3 py-2.5 font-medium">Admin</th>
                <th className="px-5 py-2.5 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentAuditLogs.map((log) => {
                const href = auditHref(log.targetType, log.targetId)
                return (
                  <tr
                    key={log.id}
                    className={`border-b border-gray-50 last:border-0 ${
                      href ? 'cursor-pointer hover:bg-bn-lime/20' : ''
                    }`}
                    onClick={() => {
                      if (href) navigate(href)
                    }}
                  >
                    <td className="px-5 py-3 font-medium capitalize text-gray-900">
                      {href ? (
                        <Link to={href} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                          {actionLabel(log.action)}
                        </Link>
                      ) : (
                        actionLabel(log.action)
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {log.targetType}
                      {log.targetId ? ` #${log.targetId}` : ''}
                    </td>
                    <td className="px-3 py-3 text-gray-600">{log.adminUser?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-400">{formatDate(log.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
