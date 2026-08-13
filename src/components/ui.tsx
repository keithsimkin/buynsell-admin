import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}
    >
      {children}
    </div>
  )
}

const tones: Record<string, string> = {
  green: 'bg-bn-lime/80 text-gray-900',
  lime: 'bg-lime-100 text-lime-800',
  red: 'bg-red-100 text-red-700',
  orange: 'bg-orange-100 text-orange-700',
  blue: 'bg-sky-100 text-sky-700',
  gray: 'bg-gray-100 text-gray-600',
  dark: 'bg-gray-900 text-white',
  purple: 'bg-violet-100 text-violet-700',
}

export function Badge({
  children,
  tone = 'gray',
}: {
  children: ReactNode
  tone?: keyof typeof tones
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone] ?? tones.gray}`}
    >
      {children}
    </span>
  )
}

export function statusTone(status?: string | null): keyof typeof tones {
  const s = (status || '').toLowerCase()
  if (['active', 'approved', 'resolved', 'ok'].includes(s)) return 'lime'
  if (['pending', 'inreview', 'in review', 'needs info', 'warned', 'restricted'].includes(s))
    return 'orange'
  if (['rejected', 'suspended', 'banned', 'dismissed', 'degraded'].includes(s)) return 'red'
  if (['draft', 'admin'].includes(s)) return 'blue'
  return 'gray'
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}) {
  const styles = {
    primary: 'bg-gray-900 text-white hover:bg-gray-800',
    secondary: 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-gray-600 hover:bg-gray-100',
  }
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-[18px] font-semibold tracking-tight text-gray-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[13px] text-gray-500">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  )
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-[14px] font-medium text-gray-800">{title}</p>
      {detail ? <p className="mt-1 text-[12px] text-gray-400">{detail}</p> : null}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
    </div>
  )
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
}) {
  const pages = Math.max(1, Math.ceil(Math.max(0, total) / pageSize))
  const safePage = Math.min(Math.max(1, page), pages)
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to = Math.min(total, safePage * pageSize)

  const buttons: number[] = []
  const window = 2
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - safePage) <= window) {
      buttons.push(i)
    }
  }
  const display: Array<number | '…'> = []
  for (const n of buttons) {
    if (display.length > 0) {
      const prev = display[display.length - 1]
      if (typeof prev === 'number' && n - prev > 1) display.push('…')
    }
    display.push(n)
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-50 px-4 py-3">
      <p className="text-[12px] text-gray-500">
        {total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange ? (
          <label className="flex items-center gap-1.5 text-[12px] text-gray-500">
            Rows
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-full border border-gray-200 bg-white px-2 text-[12px]"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Button
          variant="secondary"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Prev
        </Button>
        {display.map((item, idx) =>
          item === '…' ? (
            <span key={`e-${idx}`} className="px-1 text-[12px] text-gray-400">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2.5 text-[12px] font-semibold ${
                item === safePage
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item}
            </button>
          ),
        )}
        <Button
          variant="secondary"
          disabled={safePage >= pages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
