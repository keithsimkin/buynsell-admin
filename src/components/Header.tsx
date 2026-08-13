import { useLocation } from 'react-router-dom'

const titles: Record<string, string> = {
  '/': 'Workboard',
  '/analytics': 'Analytics',
  '/system-health': 'System health',
  '/audit': 'Audit log',
  '/tools': 'Super tools',
  '/listings': 'Inventory',
  '/categories': 'Categories',
  '/reports/listings': 'Listing reports',
  '/reports/conversations': 'Conversation reports',
  '/reports/safety': 'Safety reports',
  '/feedback': 'Seller feedback',
  '/users': 'Accounts',
  '/sessions': 'Mobile sessions',
  '/id-verification': 'ID verification',
  '/pricing/plans': 'Pricing plans',
  '/pricing/assignments': 'Plan assignments',
  '/outbox/email': 'Email outbox',
  '/outbox/push': 'Push outbox',
  '/notifications': 'Notifications',
  '/feature-requests': 'Feature requests',
}

function resolveTitle(pathname: string) {
  if (titles[pathname]) return titles[pathname]
  if (pathname.startsWith('/listings/') && pathname.endsWith('/edit')) return 'Edit listing'
  if (pathname.startsWith('/listings/')) return 'Listing review'
  if (pathname.startsWith('/users/')) return 'Account workspace'
  return 'Admin'
}

export default function Header() {
  const { pathname } = useLocation()
  const title = resolveTitle(pathname)

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-bn-border/70 bg-white/80 px-6 backdrop-blur-sm">
      <div>
        <h1 className="text-[15px] font-semibold tracking-tight text-bn-ink">{title}</h1>
        <p className="text-[12px] text-bn-muted">buynsell.ug · Neon-backed super admin</p>
      </div>
      <div className="rounded-full bg-bn-yellow px-3 py-1 text-[11px] font-semibold text-bn-ink">
        Live DB
      </div>
    </header>
  )
}
