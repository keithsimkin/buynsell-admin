import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { audit, getAdminActorId, pool, query } from './db.mjs'
import { registerSuperAdminRoutes } from './superadmin-routes.mjs'

const app = new Hono()
const port = Number(process.env.PORT || 8787)

app.use('*', cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))

app.get('/api/health', (c) => c.json({ ok: true, service: 'buynsell-admin-api' }))

function pageParams(c, fallbackLimit = 20) {
  const page = Math.max(1, Number(c.req.query('page') || 1))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || fallbackLimit)))
  return { page, limit, offset: (page - 1) * limit }
}

function boolParam(value) {
  if (value == null || value === '') return null
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false
  return null
}

function formatUgx(n) {
  return `UGX ${Number(n || 0).toLocaleString('en-UG')}`
}

/* ---------- Dashboard ---------- */
app.get('/api/admin/dashboard/summary', async (c) => {
  const dependencyStatus = {
    database: 'ok',
    convexReports: 'degraded',
    pricing: 'ok',
  }
  const warnings = [
    'Conversation reports live in Convex — not wired in this local admin API yet.',
  ]

  const [
    listingSummary,
    listingCountsByStatus,
    pendingListingReports,
    userSummary,
    activePaidPlans,
    totalAssignments,
    recentAudit,
    queueInReview,
    queueIdVerification,
    queueSuspended,
    queueFeatured,
    pendingIdCount,
    restrictedCount,
  ] = await Promise.all([
    query(`
      select
        count(*)::int as total_listings,
        count(*) filter (where status = 'active')::int as active_listings,
        count(*) filter (where status = 'draft')::int as draft_listings,
        count(*) filter (where status = 'inreview')::int as listings_in_review,
        count(*) filter (where status = 'rejected')::int as rejected_listings,
        count(*) filter (where featured_active = true)::int as featured_listings
      from listings
    `),
    query(`
      select coalesce(status, 'unknown') as status, count(*)::int as total
      from listings
      group by status
      order by total desc
    `),
    query(`select count(*)::int as total from listing_reports where status = 'pending'`),
    query(`
      select
        count(*)::int as total_users,
        count(*) filter (where role = 'admin')::int as admins,
        count(*) filter (where phone_verified = true)::int as verified_phones,
        count(*) filter (where has_verified_badge = true)::int as verified_badges,
        count(*) filter (where business_name is not null and business_name <> '')::int as business_profiles
      from users
    `),
    query(`
      select count(*)::int as total
      from seller_plan_assignments
      where status = 'active' and is_baseline = false
    `),
    query(`select count(*)::int as total from seller_plan_assignments`),
    query(`
      select a.id, a.action, a.target_type, a.target_id, a.metadata, a.created_at,
             u.id as admin_id, u.name as admin_name, u.email as admin_email
      from admin_audit_logs a
      left join users u on u.id = a.admin_user_id
      order by a.created_at desc
      limit 10
    `),
    query(`
      select l.id, l.name as title, l.status, l.price, l.date as created_at,
             s.id as seller_id, s.name as seller_name
      from listings l
      left join users s on s.id = l.seller_id
      where l.status = 'inreview'
      order by l.date desc nulls last
      limit 6
    `),
    query(`
      select d.id, d.user_id, d.full_name, d.submitted_at, d.status,
             u.name as user_name, u.email as user_email
      from id_verification_documents d
      left join users u on u.id = d.user_id
      where d.status = 'pending'
      order by d.submitted_at desc
      limit 6
    `),
    query(`
      select id, name, email, account_state, restriction_reason, restricted_at
      from users
      where account_state in ('suspended', 'restricted')
      order by restricted_at desc nulls last
      limit 6
    `),
    query(`
      select l.id, l.name as title, l.price, l.featured_activated_at,
             s.id as seller_id, s.name as seller_name
      from listings l
      left join users s on s.id = l.seller_id
      where l.featured_active = true
      order by l.featured_activated_at desc nulls last
      limit 5
    `),
    query(`select count(*)::int as total from id_verification_documents where status = 'pending'`),
    query(`
      select count(*)::int as total
      from users
      where account_state in ('suspended', 'restricted')
    `),
  ])

  const ls = listingSummary.rows[0]
  const us = userSummary.rows[0]

  return c.json({
    counts: {
      totalListings: ls.total_listings,
      activeListings: ls.active_listings,
      draftListings: ls.draft_listings,
      listingsInReview: ls.listings_in_review,
      rejectedListings: ls.rejected_listings,
      featuredListings: ls.featured_listings,
      pendingListingReports: pendingListingReports.rows[0].total,
      pendingConversationReports: null,
      pendingIdVerifications: pendingIdCount.rows[0].total,
      restrictedAccounts: restrictedCount.rows[0].total,
      totalUsers: us.total_users,
      activePaidPlans: activePaidPlans.rows[0].total,
    },
    listingCountsByStatus: listingCountsByStatus.rows.map((r) => ({
      status: r.status,
      total: r.total,
    })),
    accountCounts: {
      admins: us.admins,
      verifiedPhones: us.verified_phones,
      verifiedBadges: us.verified_badges,
      businessProfiles: us.business_profiles,
    },
    queues: {
      inReview: queueInReview.rows.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        priceLabel: formatUgx(r.price),
        createdAt: r.created_at,
        seller: r.seller_id ? { id: r.seller_id, name: r.seller_name } : null,
      })),
      idVerification: queueIdVerification.rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        fullName: r.full_name,
        userName: r.user_name,
        userEmail: r.user_email,
        submittedAt: r.submitted_at,
        status: r.status,
      })),
      restrictedAccounts: queueSuspended.rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        accountState: r.account_state,
        restrictionReason: r.restriction_reason,
        restrictedAt: r.restricted_at,
      })),
      featured: queueFeatured.rows.map((r) => ({
        id: r.id,
        title: r.title,
        priceLabel: formatUgx(r.price),
        featuredActivatedAt: r.featured_activated_at,
        seller: r.seller_id ? { id: r.seller_id, name: r.seller_name } : null,
      })),
    },
    dependencyStatus,
    warnings,
    recentAuditLogs: recentAudit.rows.map((r) => ({
      id: r.id,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      metadata: r.metadata ?? {},
      createdAt: r.created_at,
      adminUser: r.admin_id
        ? { id: r.admin_id, name: r.admin_name, email: r.admin_email }
        : null,
    })),
    pricing: {
      totalAssignments: totalAssignments.rows[0].total,
      activeAssignments: activePaidPlans.rows[0].total,
    },
  })
})

/* ---------- Analytics ---------- */
app.get('/api/admin/analytics/overview', async (c) => {
  const [listingCount, activeListingCount, reportCount, pendingReportCount, userStats] =
    await Promise.all([
      query(`select count(*)::int as total from listings`),
      query(`select count(*)::int as total from listings where status = 'active'`),
      query(`select count(*)::int as total from listing_reports`),
      query(`select count(*)::int as total from listing_reports where status = 'pending'`),
      query(`select coalesce(role, 'user') as role, count(*)::int as total from users group by role`),
    ])

  return c.json({
    marketplace: {
      totalListings: listingCount.rows[0].total,
      activeListings: activeListingCount.rows[0].total,
      totalReports: reportCount.rows[0].total,
      pendingReports: pendingReportCount.rows[0].total,
    },
    users: userStats.rows,
  })
})

/* ---------- System health ---------- */
app.get('/api/admin/system/health', async (c) => {
  let databaseOk = false
  try {
    await query('select 1')
    databaseOk = true
  } catch {
    databaseOk = false
  }

  return c.json({
    backend: { ok: true, timestamp: new Date().toISOString() },
    database: { ok: databaseOk },
    cookies: {
      configured: false,
      warnings: ['Cookie/auth secret not used by this local admin API (DB-backed console).'],
    },
    convex: { configured: Boolean(process.env.CONVEX_URL) },
  })
})

/* ---------- Listings inventory ---------- */
app.get('/api/admin/listings', async (c) => {
  const { page, limit, offset } = pageParams(c)
  const status = c.req.query('status')?.trim()
  const statusView = c.req.query('statusView')?.trim()
  const q = c.req.query('query')?.trim()
  const featuredOnly = boolParam(c.req.query('featuredOnly'))
  const reportedOnly = boolParam(c.req.query('reportedOnly'))
  const sellerId = c.req.query('sellerId') ? Number(c.req.query('sellerId')) : null

  const conditions = []
  const params = []

  if (status) {
    params.push(status)
    conditions.push(`l.status = $${params.length}`)
  } else if (statusView === 'queue') {
    conditions.push(`l.status in ('inreview', 'draft')`)
  }

  if (q) {
    params.push(`%${q}%`)
    const i = params.length
    conditions.push(
      `(l.name ilike $${i} or l.description ilike $${i} or coalesce(s.name, '') ilike $${i} or coalesce(s.email, '') ilike $${i})`,
    )
  }

  if (featuredOnly === true) conditions.push(`l.featured_active = true`)
  if (sellerId) {
    params.push(sellerId)
    conditions.push(`l.seller_id = $${params.length}`)
  }
  if (reportedOnly === true) {
    conditions.push(`exists (select 1 from listing_reports lr where lr.listing_id = l.id)`)
  }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : ''

  const listParams = [...params, limit, offset]
  const { rows } = await query(
    `
    select
      l.id, l.name as title, l.slug, l.status, l.category_slug, l.subcategory,
      l.date as created_at, l.moderated_at as updated_at, l.moderation_note,
      l.verified, l.featured_active, l.price, l.location,
      s.id as seller_id, s.name as seller_name, s.email as seller_email,
      s.phone_verified as seller_phone_verified,
      s.has_verified_badge as seller_has_verified_badge,
      coalesce(rc.report_count, 0)::int as report_count,
      count(*) over()::int as total
    from listings l
    left join users s on s.id = l.seller_id
    left join (
      select listing_id, count(*)::int as report_count
      from listing_reports
      group by listing_id
    ) rc on rc.listing_id = l.id
    ${where}
    order by l.date desc nulls last, l.id desc
    limit $${params.length + 1} offset $${params.length + 2}
    `,
    listParams,
  )

  return c.json({
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      status: r.status,
      categorySlug: r.category_slug,
      subcategory: r.subcategory,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      moderationNote: r.moderation_note,
      verified: Boolean(r.verified),
      featuredActive: Boolean(r.featured_active),
      price: r.price,
      priceLabel: formatUgx(r.price),
      location: r.location,
      reportCount: r.report_count,
      seller: r.seller_id
        ? {
            id: r.seller_id,
            name: r.seller_name,
            email: r.seller_email,
            phoneVerified: Boolean(r.seller_phone_verified),
            hasVerifiedBadge: Boolean(r.seller_has_verified_badge),
          }
        : null,
    })),
    page,
    limit,
    total: rows[0]?.total ?? 0,
  })
})

app.get('/api/admin/listings/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'bad_request' }, 400)

  const { rows } = await query(
    `
    select l.*, s.id as seller_id, s.name as seller_name, s.email as seller_email,
           s.phone as seller_phone, s.phone_verified, s.has_verified_badge,
           coalesce((select count(*)::int from listing_reports lr where lr.listing_id = l.id), 0) as report_count
    from listings l
    left join users s on s.id = l.seller_id
    where l.id = $1
    `,
    [id],
  )
  const r = rows[0]
  if (!r) return c.json({ error: 'not_found' }, 404)

  return c.json({
    id: r.id,
    title: r.name,
    slug: r.slug,
    status: r.status,
    description: r.description,
    price: r.price,
    priceLabel: formatUgx(r.price),
    negotiable: Boolean(r.negotiable),
    year: r.year,
    condition: r.condition,
    location: r.location,
    categorySlug: r.category_slug,
    subcategory: r.subcategory,
    images: r.images ?? [],
    videoUrl: r.video_url,
    verified: Boolean(r.verified),
    featuredActive: Boolean(r.featured_active),
    moderationNote: r.moderation_note,
    moderatedAt: r.moderated_at,
    createdAt: r.date,
    reportCount: r.report_count,
    attributes: r.attributes ?? {},
    seller: r.seller_id
      ? {
          id: r.seller_id,
          name: r.seller_name,
          email: r.seller_email,
          phone: r.seller_phone,
          phoneVerified: Boolean(r.phone_verified),
          hasVerifiedBadge: Boolean(r.has_verified_badge),
        }
      : null,
  })
})

app.patch('/api/admin/listings/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'bad_request' }, 400)
  const body = await c.req.json().catch(() => ({}))

  const fields = []
  const params = []
  const map = {
    title: 'name',
    description: 'description',
    price: 'price',
    location: 'location',
    condition: 'condition',
    year: 'year',
    negotiable: 'negotiable',
    videoUrl: 'video_url',
    images: 'images',
  }

  for (const [key, column] of Object.entries(map)) {
    if (body[key] === undefined) continue
    params.push(key === 'images' ? JSON.stringify(body[key]) : body[key])
    fields.push(`${column} = $${params.length}${key === 'images' ? '::jsonb' : ''}`)
  }

  if (!fields.length) return c.json({ error: 'no_changes' }, 400)

  params.push(id)
  const { rows } = await query(
    `update listings set ${fields.join(', ')} where id = $${params.length} returning id, name, status`,
    params,
  )
  if (!rows[0]) return c.json({ error: 'not_found' }, 404)

  await audit('listing_updated', 'listing', id, { fields: Object.keys(body) })
  return c.json({ success: true, listing: rows[0] })
})

app.post('/api/admin/listings/:id/moderation', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => ({}))
  const decision = body.decision
  if (!Number.isFinite(id) || !['approve', 'reject'].includes(decision)) {
    return c.json({ error: 'bad_request', message: 'decision must be approve|reject' }, 400)
  }

  const adminId = await getAdminActorId()
  const nextStatus = decision === 'approve' ? 'active' : 'rejected'
  const note = typeof body.note === 'string' ? body.note.trim() : null

  const { rows } = await query(
    `
    update listings
    set status = $1,
        moderation_note = $2,
        moderated_at = now(),
        moderated_by = $3
    where id = $4
    returning id, status, moderation_note
    `,
    [nextStatus, note, adminId, id],
  )
  if (!rows[0]) return c.json({ error: 'not_found' }, 404)

  await audit(decision === 'approve' ? 'listing_approved' : 'listing_rejected', 'listing', id, {
    note,
    status: nextStatus,
  })

  return c.json({ success: true, ...rows[0] })
})

app.post('/api/admin/listings/:id/status', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => ({}))
  const status = body.status
  if (!Number.isFinite(id) || !status) return c.json({ error: 'bad_request' }, 400)

  const allowed = ['draft', 'active', 'inreview', 'rejected', 'paused', 'sold']
  if (!allowed.includes(status)) return c.json({ error: 'invalid_status' }, 400)

  const adminId = await getAdminActorId()
  const { rows } = await query(
    `
    update listings
    set status = $1, moderated_at = now(), moderated_by = $2
    where id = $3
    returning id, status
    `,
    [status, adminId, id],
  )
  if (!rows[0]) return c.json({ error: 'not_found' }, 404)

  await audit('listing_status_updated', 'listing', id, { status })
  return c.json({ success: true, ...rows[0] })
})

app.post('/api/admin/listings/:id/boost', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'bad_request' }, 400)

  const { rows } = await query(
    `
    update listings
    set featured_active = true, featured_activated_at = now()
    where id = $1
    returning id, featured_active, seller_id
    `,
    [id],
  )
  if (!rows[0]) return c.json({ error: 'not_found' }, 404)

  await audit('listing_boost_activated', 'listing', id, {
    sellerId: rows[0].seller_id,
    note: 'Admin override featured flag (credits not consumed in local API)',
  })
  return c.json({ success: true, featuredActive: true })
})

app.delete('/api/admin/listings/:id/boost', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'bad_request' }, 400)

  const { rows } = await query(
    `
    update listings
    set featured_active = false
    where id = $1
    returning id, featured_active, seller_id
    `,
    [id],
  )
  if (!rows[0]) return c.json({ error: 'not_found' }, 404)

  await audit('listing_boost_deactivated', 'listing', id, { sellerId: rows[0].seller_id })
  return c.json({ success: true, featuredActive: false })
})

/* ---------- Reports ---------- */
app.get('/api/admin/reports/listings', async (c) => {
  const { page, limit, offset } = pageParams(c)
  const status = c.req.query('status')?.trim() || 'pending'

  const { rows } = await query(
    `
    select
      lr.id, lr.status, lr.reason, lr.details, lr.created_at, lr.review_notes,
      lr.listing_id, l.name as listing_title,
      u.id as reporter_id, u.name as reporter_name, u.email as reporter_email,
      count(*) over()::int as total
    from listing_reports lr
    left join listings l on l.id = lr.listing_id
    left join users u on u.id = lr.reporter_id
    where lr.status = $1
    order by lr.created_at desc nulls last
    limit $2 offset $3
    `,
    [status, limit, offset],
  )

  return c.json({
    items: rows.map((r) => ({
      id: String(r.id),
      kind: 'listing',
      status: r.status,
      reason: r.reason,
      details: r.details,
      createdAt: r.created_at,
      listingId: r.listing_id,
      listingTitle: r.listing_title,
      reporter: r.reporter_id
        ? { id: r.reporter_id, name: r.reporter_name, email: r.reporter_email }
        : null,
      subjectUser: null,
      reviewNotes: r.review_notes,
    })),
    page,
    limit,
    total: rows[0]?.total ?? 0,
  })
})

app.post('/api/admin/reports/listings/:reportId/review', async (c) => {
  const reportId = Number(c.req.param('reportId'))
  const body = await c.req.json().catch(() => ({}))
  if (!Number.isFinite(reportId) || !['resolved', 'dismissed'].includes(body.status)) {
    return c.json({ error: 'bad_request' }, 400)
  }

  const adminId = await getAdminActorId()
  const { rows } = await query(
    `
    update listing_reports
    set status = $1, review_notes = $2, reviewed_at = now(), reviewed_by = $3
    where id = $4
    returning id, status
    `,
    [body.status, body.reviewNotes?.trim() || null, adminId, reportId],
  )
  if (!rows[0]) return c.json({ error: 'not_found' }, 404)

  await audit('listing_report_reviewed', 'listing_report', reportId, { status: body.status })
  return c.json({ success: true, ...rows[0] })
})

app.get('/api/admin/reports/conversations', async (c) => {
  return c.json({
    items: [],
    page: 1,
    limit: 20,
    total: 0,
    degraded: true,
    message: 'Conversation reports are stored in Convex and require the mono-repo backend.',
  })
})

/* ---------- Users / accounts ---------- */
app.get('/api/admin/users', async (c) => {
  const { page, limit, offset } = pageParams(c)
  const q = c.req.query('query')?.trim()
  const role = c.req.query('role')?.trim()
  const accountState = c.req.query('accountState')?.trim()
  const hasVerifiedBadge = boolParam(c.req.query('hasVerifiedBadge'))
  const hasActivePaidPlan = boolParam(c.req.query('hasActivePaidPlan'))

  const conditions = []
  const params = []

  if (q) {
    params.push(`%${q}%`)
    const i = params.length
    conditions.push(`(u.name ilike $${i} or coalesce(u.email,'') ilike $${i} or coalesce(u.phone,'') ilike $${i})`)
  }
  if (role) {
    params.push(role)
    conditions.push(`u.role = $${params.length}`)
  }
  if (accountState === 'watchlist') {
    conditions.push(`u.account_state in ('suspended', 'restricted')`)
  } else if (accountState) {
    params.push(accountState)
    conditions.push(`u.account_state = $${params.length}`)
  }
  if (hasVerifiedBadge === true) conditions.push(`u.has_verified_badge = true`)
  if (hasVerifiedBadge === false) conditions.push(`u.has_verified_badge = false`)
  if (hasActivePaidPlan === true) {
    conditions.push(`exists (
      select 1 from seller_plan_assignments spa
      where spa.seller_id = u.id and spa.status = 'active' and spa.is_baseline = false
    )`)
  }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : ''
  const { rows } = await query(
    `
    select
      u.id, u.name, u.email, u.phone_verified, u.has_verified_badge, u.role,
      u.business_name, u.account_state, u.joined,
      coalesce(lc.listing_count, 0)::int as listing_count,
      coalesce(lc.active_listing_count, 0)::int as active_listing_count,
      count(*) over()::int as total
    from users u
    left join (
      select seller_id,
             count(*)::int as listing_count,
             count(*) filter (where status = 'active')::int as active_listing_count
      from listings
      group by seller_id
    ) lc on lc.seller_id = u.id
    ${where}
    order by u.joined desc nulls last
    limit $${params.length + 1} offset $${params.length + 2}
    `,
    [...params, limit, offset],
  )

  return c.json({
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phoneVerified: Boolean(r.phone_verified),
      hasVerifiedBadge: Boolean(r.has_verified_badge),
      role: r.role === 'admin' ? 'admin' : 'user',
      joinedAt: r.joined,
      listingCount: r.listing_count,
      activeListingCount: r.active_listing_count,
      businessName: r.business_name,
      accountState: r.account_state ?? 'active',
    })),
    page,
    limit,
    total: rows[0]?.total ?? 0,
  })
})

app.get('/api/admin/users/:id/workspace', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'bad_request' }, 400)

  const { rows } = await query(
    `
    select u.*,
      (select count(*)::int from listings where seller_id = u.id and status = 'active') as active_listings,
      (select count(*)::int from listings where seller_id = u.id and status = 'draft') as draft_listings,
      (select count(*)::int from listings where seller_id = u.id and status = 'inreview') as review_listings,
      (select count(*)::int from listings where seller_id = u.id and featured_active = true) as featured_listings,
      (select count(*)::int from listing_reports lr
         join listings l on l.id = lr.listing_id
         where l.seller_id = u.id and lr.status = 'pending') as reported_listings
    from users u
    where u.id = $1
    `,
    [id],
  )
  const u = rows[0]
  if (!u) return c.json({ error: 'not_found' }, 404)

  const [listingsRes, auditRes, planRes, walletRes, eventsRes] = await Promise.all([
    query(
      `
      select id, name as title, status, featured_active, category_slug, date as created_at, price
      from listings where seller_id = $1
      order by date desc nulls last limit 12
      `,
      [id],
    ),
    query(
      `
      select a.id, a.action, a.target_type, a.target_id, a.metadata, a.created_at,
             adm.name as admin_name
      from admin_audit_logs a
      left join users adm on adm.id = a.admin_user_id
      where a.target_type = 'user' and a.target_id = $1
      order by a.created_at desc limit 20
      `,
      [String(id)],
    ),
    query(
      `
      select spa.*, pp.display_name, pp.tier_code, pp.top_plus_promotions, pp.price_ugx, pp.is_free
      from seller_plan_assignments spa
      join pricing_plans pp on pp.id = spa.plan_id
      where spa.seller_id = $1 and spa.status = 'active'
      order by spa.is_baseline asc, spa.created_at desc
      limit 3
      `,
      [id],
    ),
    query(
      `
      select id, amount_ugx, transaction_type, source, description, balance_after, created_at
      from wallet_transactions where seller_id = $1
      order by created_at desc limit 20
      `,
      [id],
    ),
    query(
      `
      select id, event_type, payload, actor, created_at
      from seller_plan_events where seller_id = $1
      order by created_at desc limit 20
      `,
      [id],
    ),
  ])

  const currentPlan = planRes.rows.find((p) => !p.is_baseline) ?? planRes.rows[0] ?? null

  return c.json({
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      whatsapp: u.whatsapp,
      avatar: u.avatar,
      firstName: u.first_name,
      lastName: u.last_name,
      phoneVerified: Boolean(u.phone_verified),
      role: u.role,
      joinedAt: u.joined,
      businessName: u.business_name,
      businessAddress: u.business_address,
      taxId: u.tax_id,
      location: u.location,
      gender: u.gender,
      language: u.language,
      accountState: u.account_state,
      restrictionReason: u.restriction_reason,
      restrictedAt: u.restricted_at,
      walletBalanceUgx: u.wallet_balance_ugx,
      hasVerifiedBadge: Boolean(u.has_verified_badge),
      hasAnalytics: Boolean(u.has_analytics),
      hasApiAccess: Boolean(u.has_api_access),
      hasCustomBranding: Boolean(u.has_custom_branding),
      settings: u.settings ?? {},
      idVerificationStatus: u.id_verification_status,
      workosId: u.workos_id,
    },
    inventory: {
      active: u.active_listings,
      draft: u.draft_listings,
      review: u.review_listings,
      featured: u.featured_listings,
      reported: u.reported_listings,
    },
    recentListings: listingsRes.rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      featuredActive: Boolean(r.featured_active),
      categorySlug: r.category_slug,
      createdAt: r.created_at,
      priceLabel: formatUgx(r.price),
    })),
    pricing: {
      currentPlan: currentPlan
        ? {
            assignmentId: currentPlan.id,
            planId: currentPlan.plan_id,
            displayName: currentPlan.display_name,
            tierCode: currentPlan.tier_code,
            topPlusPromotions: currentPlan.top_plus_promotions,
            priceUgx: currentPlan.price_ugx,
            nextBillingDate: currentPlan.next_billing_date,
            isBaseline: currentPlan.is_baseline,
            isFree: currentPlan.is_free,
          }
        : null,
      events: eventsRes.rows,
    },
    wallet: {
      balanceUgx: u.wallet_balance_ugx,
      transactions: walletRes.rows,
    },
    auditTrail: auditRes.rows.map((r) => ({
      id: r.id,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      metadata: r.metadata,
      createdAt: r.created_at,
      adminName: r.admin_name,
    })),
  })
})

app.patch('/api/admin/users/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'bad_request' }, 400)
  const body = await c.req.json().catch(() => ({}))

  const map = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    whatsapp: 'whatsapp',
    avatar: 'avatar',
    firstName: 'first_name',
    lastName: 'last_name',
    location: 'location',
    businessName: 'business_name',
    businessAddress: 'business_address',
    taxId: 'tax_id',
    gender: 'gender',
    language: 'language',
    phoneVerified: 'phone_verified',
  }

  const fields = []
  const params = []
  for (const [key, column] of Object.entries(map)) {
    if (body[key] === undefined) continue
    params.push(body[key] === '' ? null : body[key])
    fields.push(`${column} = $${params.length}`)
  }

  if (!fields.length) return c.json({ error: 'no_changes', message: 'No editable fields provided' }, 400)

  params.push(id)
  const { rows } = await query(
    `update users set ${fields.join(', ')} where id = $${params.length}
     returning id, name, email, phone, whatsapp, avatar, first_name, last_name, location,
               business_name, business_address, tax_id, gender, language, phone_verified`,
    params,
  )
  if (!rows[0]) return c.json({ error: 'not_found' }, 404)

  await audit('user_profile_updated', 'user', id, { fields: Object.keys(body) })
  return c.json({ success: true, user: rows[0] })
})

app.post('/api/admin/users/:id/password-reset', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'bad_request' }, 400)

  const { rows } = await query(`select id, email, name from users where id = $1`, [id])
  const user = rows[0]
  if (!user) return c.json({ error: 'not_found' }, 404)
  if (!user.email) {
    return c.json({ error: 'no_email', message: 'User has no email on file' }, 400)
  }

  const endpoint =
    process.env.AUTH_FORGOT_PASSWORD_URL ||
    process.env.PUBLIC_FORGOT_PASSWORD_URL ||
    'https://buynsell.ug/api/auth/forgot-password'

  let upstreamOk = false
  let upstreamMessage = null
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ email: user.email }),
    })
    const payload = await res.json().catch(() => null)
    upstreamOk = res.ok
    upstreamMessage = payload?.message ?? null
    if (!res.ok) {
      console.error('Password reset upstream failed', res.status, payload)
    }
  } catch (error) {
    console.error('Password reset request failed', error)
    return c.json(
      {
        error: 'upstream_unavailable',
        message: 'Could not reach the password-reset service. Check AUTH_FORGOT_PASSWORD_URL.',
      },
      502,
    )
  }

  await audit('user_password_reset_sent', 'user', id, {
    email: user.email,
    endpoint,
    upstreamOk,
  })

  return c.json({
    success: true,
    email: user.email,
    message:
      upstreamMessage ||
      `If an account exists for ${user.email}, a password reset email has been sent.`,
  })
})

app.get('/api/admin/pricing/plans', async (c) => {
  const includeInactive = c.req.query('includeInactive') === 'true'
  const { rows } = await query(
    `
    select id, slug, display_name, tier_code, family, price_ugx, is_free, active,
           top_plus_promotions, tier_version
    from pricing_plans
    ${includeInactive ? '' : 'where active = true'}
    order by family asc, price_ugx asc, display_name asc
    `,
  )
  return c.json({
    items: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      displayName: r.display_name,
      tierCode: r.tier_code,
      family: r.family,
      priceUgx: r.price_ugx,
      isFree: r.is_free,
      active: r.active,
      topPlusPromotions: r.top_plus_promotions,
      tierVersion: r.tier_version,
    })),
  })
})

app.post('/api/admin/users/:id/plan', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'bad_request' }, 400)
  const body = await c.req.json().catch(() => ({}))
  const planSlug = typeof body.planSlug === 'string' ? body.planSlug.trim() : ''
  const notes = typeof body.notes === 'string' ? body.notes.trim() : null
  if (!planSlug) return c.json({ error: 'bad_request', message: 'planSlug is required' }, 400)

  const { rows: planRows } = await query(
    `select id, slug, display_name, is_free, active from pricing_plans where slug = $1 limit 1`,
    [planSlug],
  )
  const plan = planRows[0]
  if (!plan || !plan.active) {
    return c.json({ error: 'plan_not_found', message: `Plan "${planSlug}" not found or inactive` }, 404)
  }

  const { rows: userRows } = await query(`select id from users where id = $1`, [id])
  if (!userRows[0]) return c.json({ error: 'not_found' }, 404)

  const client = await pool.connect()
  try {
    await client.query('begin')

    await client.query(
      `
      update seller_plan_assignments
      set status = 'ended', ends_at = now()
      where seller_id = $1 and status = 'active' and is_baseline = false
      `,
      [id],
    )

    const isBaseline = Boolean(plan.is_free)
    if (isBaseline) {
      // Keep only one active baseline: end previous baselines too, then insert.
      await client.query(
        `
        update seller_plan_assignments
        set status = 'ended', ends_at = now()
        where seller_id = $1 and status = 'active' and is_baseline = true
        `,
        [id],
      )
    }

    const inserted = await client.query(
      `
      insert into seller_plan_assignments
        (seller_id, plan_id, is_baseline, status, starts_at, next_billing_date, created_by, notes, auto_renew)
      values
        ($1, $2, $3, 'active', now(), case when $3 then null else now() + interval '30 days' end, $4, $5, true)
      returning id, plan_id, is_baseline, status, starts_at, next_billing_date
      `,
      [id, plan.id, isBaseline, `admin:${(await getAdminActorId()) ?? 'local'}`, notes],
    )

    await client.query(
      `
      insert into seller_plan_events (seller_id, assignment_id, event_type, payload, actor)
      values ($1, $2, 'plan_assigned', $3::jsonb, $4)
      `,
      [
        id,
        inserted.rows[0].id,
        JSON.stringify({ planSlug: plan.slug, displayName: plan.display_name, notes }),
        `admin:${(await getAdminActorId()) ?? 'local'}`,
      ],
    )

    await client.query('commit')

    await audit('pricing_plan_assigned', 'user', id, {
      planSlug: plan.slug,
      planId: plan.id,
      assignmentId: inserted.rows[0].id,
      notes,
    })

    return c.json({
      success: true,
      assignment: inserted.rows[0],
      plan: {
        id: plan.id,
        slug: plan.slug,
        displayName: plan.display_name,
        isFree: plan.is_free,
      },
    })
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
})

app.patch('/api/admin/users/:id/role', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => ({}))
  if (!['user', 'admin'].includes(body.role)) return c.json({ error: 'bad_request' }, 400)

  const { rows } = await query(`update users set role = $1 where id = $2 returning id, role`, [
    body.role,
    id,
  ])
  if (!rows[0]) return c.json({ error: 'not_found' }, 404)
  await audit('user_role_updated', 'user', id, { role: body.role })
  return c.json({ success: true, ...rows[0] })
})

app.patch('/api/admin/users/:id/account-state', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => ({}))
  if (!['active', 'restricted', 'suspended'].includes(body.accountState)) {
    return c.json({ error: 'bad_request' }, 400)
  }

  const adminId = await getAdminActorId()
  const reason = body.restrictionReason?.trim() || null
  const { rows } = await query(
    `
    update users
    set account_state = $1,
        restriction_reason = $2,
        restricted_at = case when $1 = 'active' then null else now() end,
        restricted_by = case when $1 = 'active' then null else $3 end
    where id = $4
    returning id, account_state, restriction_reason
    `,
    [body.accountState, reason, adminId, id],
  )
  if (!rows[0]) return c.json({ error: 'not_found' }, 404)
  await audit('user_account_state_updated', 'user', id, {
    accountState: body.accountState,
    reason,
  })
  return c.json({ success: true, ...rows[0] })
})

app.patch('/api/admin/users/:id/capabilities', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => ({}))
  const fields = []
  const params = []
  const map = {
    hasVerifiedBadge: 'has_verified_badge',
    hasAnalytics: 'has_analytics',
    hasApiAccess: 'has_api_access',
    hasCustomBranding: 'has_custom_branding',
  }
  for (const [key, col] of Object.entries(map)) {
    if (typeof body[key] !== 'boolean') continue
    params.push(body[key])
    fields.push(`${col} = $${params.length}`)
  }
  if (!fields.length) return c.json({ error: 'no_changes' }, 400)
  params.push(id)
  const { rows } = await query(
    `update users set ${fields.join(', ')} where id = $${params.length} returning id, has_verified_badge, has_analytics, has_api_access, has_custom_branding`,
    params,
  )
  if (!rows[0]) return c.json({ error: 'not_found' }, 404)
  await audit('user_capabilities_updated', 'user', id, body)
  return c.json({ success: true, user: rows[0] })
})

app.patch('/api/admin/users/:id/settings', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => ({}))
  const { rows: existing } = await query(`select settings from users where id = $1`, [id])
  if (!existing[0]) return c.json({ error: 'not_found' }, 404)

  const settings = { ...(existing[0].settings ?? {}), ...body }
  await query(`update users set settings = $1::jsonb where id = $2`, [JSON.stringify(settings), id])
  await audit('user_settings_updated', 'user', id, body)
  return c.json({ success: true, settings })
})

/* ---------- ID verification ---------- */
app.get('/api/admin/id-verification', async (c) => {
  const status = c.req.query('status') || 'pending'
  const { page, limit, offset } = pageParams(c, 20)

  const { rows } = await query(
    `
    select d.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
           count(*) over()::int as total
    from id_verification_documents d
    left join users u on u.id = d.user_id
    where d.status = $1
    order by d.submitted_at desc
    limit $2 offset $3
    `,
    [status, limit, offset],
  )

  return c.json({
    documents: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      idFrontUrl: r.id_front_url,
      idBackUrl: r.id_back_url,
      selfieUrl: r.selfie_url,
      documentType: r.document_type,
      documentNumber: r.document_number,
      fullName: r.full_name,
      dateOfBirth: r.date_of_birth,
      expiryDate: r.expiry_date,
      status: r.status,
      reviewNotes: r.review_notes,
      reviewedAt: r.reviewed_at,
      submittedAt: r.submitted_at,
      userName: r.user_name,
      userEmail: r.user_email,
      userPhone: r.user_phone,
    })),
    page,
    limit,
    total: rows[0]?.total ?? 0,
  })
})

app.post('/api/admin/id-verification/:id/review', async (c) => {
  const docId = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => ({}))
  if (!Number.isFinite(docId) || !['approved', 'rejected'].includes(body.status)) {
    return c.json({ error: 'bad_request' }, 400)
  }

  const adminId = await getAdminActorId()
  const client = await pool.connect()
  try {
    await client.query('begin')
    const { rows } = await client.query(
      `
      update id_verification_documents
      set status = $1, review_notes = $2, reviewed_at = now(), reviewed_by = $3
      where id = $4
      returning id, user_id, status
      `,
      [body.status, body.reviewNotes?.trim() || null, adminId, docId],
    )
    if (!rows[0]) {
      await client.query('rollback')
      return c.json({ error: 'not_found' }, 404)
    }

    await client.query(
      `
      update users
      set id_verification_status = $1,
          id_verification_reviewed_at = now(),
          id_verification_reviewed_by = $2,
          id_verification_rejection_reason = $3,
          has_verified_badge = case when $1 = 'approved' then true else has_verified_badge end
      where id = $4
      `,
      [
        body.status,
        adminId,
        body.status === 'rejected' ? body.reviewNotes?.trim() || null : null,
        rows[0].user_id,
      ],
    )
    await client.query('commit')

    await audit('id_verification_reviewed', 'id_verification', docId, {
      status: body.status,
      userId: rows[0].user_id,
    })

    return c.json({ success: true, ...rows[0] })
  } catch (e) {
    await client.query('rollback')
    throw e
  } finally {
    client.release()
  }
})

registerSuperAdminRoutes(app)

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'internal_error', message: err.message }, 500)
})

serve({ fetch: app.fetch, port }, () => {
  console.log(`Admin API listening on http://localhost:${port}`)
})
