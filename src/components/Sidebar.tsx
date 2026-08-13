import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  BarChart3,
  Activity,
  Package2,
  ClipboardList,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Users,
  BadgeCheck,
  UserCog,
  CreditCard,
  Tags,
  FolderTree,
  ScrollText,
  Mail,
  Bell,
  Smartphone,
  Lightbulb,
  MessageSquareWarning,
  Star,
  Wrench,
  ChevronDown,
} from 'lucide-react'

type NavItem = {
  to: string
  icon: typeof LayoutDashboard
  label: string
  end?: boolean
}

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/system-health', icon: Activity, label: 'System Health' },
      { to: '/audit', icon: ScrollText, label: 'Audit log' },
      { to: '/tools', icon: Wrench, label: 'Super tools' },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { to: '/listings', icon: Package2, label: 'Inventory' },
      { to: '/listings?status=inreview', icon: ClipboardList, label: 'Moderation queue' },
      { to: '/categories', icon: FolderTree, label: 'Categories' },
    ],
  },
  {
    label: 'Trust & Safety',
    items: [
      { to: '/reports/listings', icon: ShieldAlert, label: 'Listing reports' },
      { to: '/reports/conversations', icon: ShieldCheck, label: 'Conversation reports' },
      { to: '/reports/safety', icon: Shield, label: 'Safety reports' },
      { to: '/feedback', icon: MessageSquareWarning, label: 'Seller feedback' },
      { to: '/id-verification', icon: BadgeCheck, label: 'ID verification' },
    ],
  },
  {
    label: 'Accounts',
    items: [
      { to: '/users', icon: Users, label: 'All accounts' },
      { to: '/users?role=admin', icon: UserCog, label: 'Admins' },
      { to: '/users?hasActivePaidPlan=true', icon: Star, label: 'Paid sellers' },
      { to: '/sessions', icon: Smartphone, label: 'Mobile sessions' },
    ],
  },
  {
    label: 'Commercial',
    items: [
      { to: '/pricing/plans', icon: CreditCard, label: 'Pricing plans' },
      { to: '/pricing/assignments', icon: Tags, label: 'Plan assignments' },
    ],
  },
  {
    label: 'Delivery & Product',
    items: [
      { to: '/outbox/email', icon: Mail, label: 'Email outbox' },
      { to: '/outbox/push', icon: Bell, label: 'Push outbox' },
      { to: '/notifications', icon: Bell, label: 'Notifications' },
      { to: '/feature-requests', icon: Lightbulb, label: 'Feature requests' },
    ],
  },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-1">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <rect x="3" y="3" width="10" height="10" rx="2.5" fill="#111827" />
        <rect x="15" y="3" width="10" height="10" rx="2.5" fill="#b8f04a" />
        <rect x="3" y="15" width="10" height="10" rx="2.5" fill="#b8f04a" />
        <rect x="15" y="15" width="10" height="10" rx="2.5" fill="#111827" />
      </svg>
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[16px] font-semibold tracking-tight text-gray-900">
            Buynsell
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
          Super admin
        </p>
      </div>
    </div>
  )
}

function navActive(to: string, pathname: string, search: string, end?: boolean) {
  const [path, query = ''] = to.split('?')
  const pathMatch = end ? pathname === path : pathname === path || pathname.startsWith(`${path}/`)
  if (!pathMatch) return false
  if (!query) {
    // Prefer exact bare links when a sibling uses the same path with filters
    return true
  }
  const want = new URLSearchParams(query)
  const have = new URLSearchParams(search)
  for (const [k, v] of want.entries()) {
    if (have.get(k) !== v) return false
  }
  return true
}

export default function Sidebar() {
  const { pathname, search } = useLocation()

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col border-r border-gray-200/80 bg-white">
      <div className="px-3 pb-3 pt-5">
        <Logo />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-gray-400">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = navActive(item.to, pathname, search, item.end)
                // When multiple items share a path, only highlight the best filter match
                const siblings = group.items.filter((g) => g.to.split('?')[0] === item.to.split('?')[0])
                const best =
                  siblings.length <= 1
                    ? isActive
                    : siblings
                        .filter((g) => navActive(g.to, pathname, search, g.end))
                        .sort((a, b) => b.to.length - a.to.length)[0]?.to === item.to
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={() =>
                        `flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors ${
                          best
                            ? 'bg-bn-lime text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`
                      }
                    >
                      <Icon
                        className={`h-[16px] w-[16px] shrink-0 ${
                          best ? 'text-gray-800' : 'text-gray-400'
                        }`}
                        strokeWidth={1.75}
                      />
                      <span className="flex-1 text-left">{item.label}</span>
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
