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
    <div className="flex items-center gap-3 px-2 py-1">
      <img src="/logo.png" alt="Buynsell" className="h-8 w-auto shrink-0" />
      <div className="min-w-0 leading-tight">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-bn-muted">
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
    <aside className="flex h-screen w-[270px] shrink-0 flex-col border-r border-bn-border/70 bg-white">
      <div className="border-b border-bn-border/60 px-3 pb-3 pt-5">
        <Logo />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-3">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-bn-muted">
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
                            ? 'bg-bn-yellow text-bn-ink'
                            : 'text-bn-muted hover:bg-bn-yellow/20 hover:text-bn-ink'
                        }`
                      }
                    >
                      <Icon
                        className={`h-[16px] w-[16px] shrink-0 ${
                          best ? 'text-bn-ink' : 'text-neutral-400'
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
