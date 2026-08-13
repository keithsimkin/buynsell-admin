import { audit, getAdminActorId, query } from './db.mjs'

function pageParams(c, fallbackLimit = 20) {
  const page = Math.max(1, Number(c.req.query('page') || 1))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || fallbackLimit)))
  return { page, limit, offset: (page - 1) * limit }
}

export function registerSuperAdminRoutes(app) {
  /* ---------- Global audit ---------- */
  app.get('/api/admin/audit', async (c) => {
    const { page, limit, offset } = pageParams(c)
    const action = c.req.query('action')?.trim()
    const targetType = c.req.query('targetType')?.trim()
    const conditions = []
    const params = []
    if (action) {
      params.push(`%${action}%`)
      conditions.push(`a.action ilike $${params.length}`)
    }
    if (targetType) {
      params.push(targetType)
      conditions.push(`a.target_type = $${params.length}`)
    }
    const where = conditions.length ? `where ${conditions.join(' and ')}` : ''
    const { rows } = await query(
      `
      select a.id, a.action, a.target_type, a.target_id, a.metadata, a.created_at,
             u.id as admin_id, u.name as admin_name, u.email as admin_email,
             count(*) over()::int as total
      from admin_audit_logs a
      left join users u on u.id = a.admin_user_id
      ${where}
      order by a.created_at desc
      limit $${params.length + 1} offset $${params.length + 2}
      `,
      [...params, limit, offset],
    )
    return c.json({
      items: rows.map((r) => ({
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
      page,
      limit,
      total: rows[0]?.total ?? 0,
    })
  })

  /* ---------- Pricing assignments catalog ---------- */
  app.get('/api/admin/pricing/assignments', async (c) => {
    const { page, limit, offset } = pageParams(c)
    const status = c.req.query('status')?.trim() || 'active'
    const { rows } = await query(
      `
      select spa.id, spa.seller_id, spa.status, spa.is_baseline, spa.starts_at, spa.ends_at,
             spa.next_billing_date, spa.notes, spa.created_at,
             pp.slug as plan_slug, pp.display_name as plan_name, pp.price_ugx, pp.family, pp.is_free,
             u.name as seller_name, u.email as seller_email,
             count(*) over()::int as total
      from seller_plan_assignments spa
      join pricing_plans pp on pp.id = spa.plan_id
      left join users u on u.id = spa.seller_id
      where ($1 = 'all' or spa.status = $1)
      order by spa.created_at desc nulls last
      limit $2 offset $3
      `,
      [status, limit, offset],
    )
    return c.json({
      items: rows.map((r) => ({
        id: r.id,
        sellerId: r.seller_id,
        sellerName: r.seller_name,
        sellerEmail: r.seller_email,
        status: r.status,
        isBaseline: r.is_baseline,
        startsAt: r.starts_at,
        endsAt: r.ends_at,
        nextBillingDate: r.next_billing_date,
        notes: r.notes,
        createdAt: r.created_at,
        planSlug: r.plan_slug,
        planName: r.plan_name,
        priceUgx: r.price_ugx,
        family: r.family,
        isFree: r.is_free,
      })),
      page,
      limit,
      total: rows[0]?.total ?? 0,
    })
  })

  app.patch('/api/admin/pricing/plans/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const body = await c.req.json().catch(() => ({}))
    if (!Number.isFinite(id)) return c.json({ error: 'bad_request' }, 400)
    const fields = []
    const params = []
    if (typeof body.active === 'boolean') {
      params.push(body.active)
      fields.push(`active = $${params.length}`)
    }
    if (typeof body.displayName === 'string') {
      params.push(body.displayName.trim())
      fields.push(`display_name = $${params.length}`)
    }
    if (typeof body.priceUgx === 'number') {
      params.push(body.priceUgx)
      fields.push(`price_ugx = $${params.length}`)
    }
    if (typeof body.topPlusPromotions === 'number') {
      params.push(body.topPlusPromotions)
      fields.push(`top_plus_promotions = $${params.length}`)
    }
    if (!fields.length) return c.json({ error: 'no_changes' }, 400)
    params.push(id)
    const { rows } = await query(
      `update pricing_plans set ${fields.join(', ')} where id = $${params.length}
       returning id, slug, display_name, price_ugx, active, top_plus_promotions`,
      params,
    )
    if (!rows[0]) return c.json({ error: 'not_found' }, 404)
    await audit('pricing_plan_updated', 'pricing_plan', id, body)
    return c.json({ success: true, plan: rows[0] })
  })

  /* ---------- Categories ---------- */
  app.get('/api/admin/categories', async (c) => {
    const { rows } = await query(
      `select slug, name, icon, subcategories, filters from categories order by name asc`,
    )
    return c.json({
      items: rows.map((r) => ({
        slug: r.slug,
        name: r.name,
        icon: r.icon,
        subcategories: r.subcategories ?? [],
        filters: r.filters ?? [],
      })),
    })
  })

  app.patch('/api/admin/categories/:slug', async (c) => {
    const slug = c.req.param('slug')
    const body = await c.req.json().catch(() => ({}))
    const fields = []
    const params = []
    if (typeof body.name === 'string') {
      params.push(body.name.trim())
      fields.push(`name = $${params.length}`)
    }
    if (typeof body.icon === 'string') {
      params.push(body.icon)
      fields.push(`icon = $${params.length}`)
    }
    if (Array.isArray(body.subcategories)) {
      params.push(JSON.stringify(body.subcategories))
      fields.push(`subcategories = $${params.length}::jsonb`)
    }
    if (!fields.length) return c.json({ error: 'no_changes' }, 400)
    params.push(slug)
    const { rows } = await query(
      `update categories set ${fields.join(', ')} where slug = $${params.length}
       returning slug, name, icon, subcategories`,
      params,
    )
    if (!rows[0]) return c.json({ error: 'not_found' }, 404)
    await audit('category_updated', 'category', slug, body)
    return c.json({ success: true, category: rows[0] })
  })

  app.get('/api/admin/category-nodes', async (c) => {
    const categorySlug = c.req.query('categorySlug')?.trim()
    const params = []
    let where = ''
    if (categorySlug) {
      params.push(categorySlug)
      where = `where category_slug = $1`
    }
    const { rows } = await query(
      `
      select key, category_slug, parent_key, slug, name, depth, selectable, sort_order
      from category_nodes
      ${where}
      order by category_slug, depth, sort_order, name
      limit 500
      `,
      params,
    )
    return c.json({ items: rows })
  })

  /* ---------- Email / push outbox ---------- */
  app.get('/api/admin/outbox/email', async (c) => {
    const { page, limit, offset } = pageParams(c)
    const status = c.req.query('status')?.trim()
    const conditions = []
    const params = []
    if (status) {
      params.push(status)
      conditions.push(`status = $${params.length}`)
    }
    const where = conditions.length ? `where ${conditions.join(' and ')}` : ''
    const { rows } = await query(
      `
      select id, event_id, template_key, recipient, recipient_type, provider, status,
             attempt_count, next_attempt_at, last_error, provider_message_id, created_at, updated_at,
             count(*) over()::int as total
      from email_outbox
      ${where}
      order by created_at desc
      limit $${params.length + 1} offset $${params.length + 2}
      `,
      [...params, limit, offset],
    )
    return c.json({
      items: rows.map((r) => ({
        id: r.id,
        eventId: r.event_id,
        templateKey: r.template_key,
        recipient: r.recipient,
        recipientType: r.recipient_type,
        provider: r.provider,
        status: r.status,
        attemptCount: r.attempt_count,
        nextAttemptAt: r.next_attempt_at,
        lastError: r.last_error,
        providerMessageId: r.provider_message_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      page,
      limit,
      total: rows[0]?.total ?? 0,
    })
  })

  app.post('/api/admin/outbox/email/:id/retry', async (c) => {
    const id = Number(c.req.param('id'))
    const { rows } = await query(
      `
      update email_outbox
      set status = 'pending', next_attempt_at = now(), last_error = null, leased_at = null, lease_token = null
      where id = $1
      returning id, status
      `,
      [id],
    )
    if (!rows[0]) return c.json({ error: 'not_found' }, 404)
    await audit('email_outbox_retry', 'email_outbox', id, {})
    return c.json({ success: true, ...rows[0] })
  })

  app.get('/api/admin/outbox/push', async (c) => {
    const { page, limit, offset } = pageParams(c)
    const status = c.req.query('status')?.trim()
    const conditions = []
    const params = []
    if (status) {
      params.push(status)
      conditions.push(`status = $${params.length}`)
    }
    const where = conditions.length ? `where ${conditions.join(' and ')}` : ''
    const { rows } = await query(
      `
      select id, event_id, device_id, provider, status, attempt_count, next_attempt_at,
             last_error, provider_ticket_id, created_at, updated_at,
             count(*) over()::int as total
      from push_outbox
      ${where}
      order by created_at desc
      limit $${params.length + 1} offset $${params.length + 2}
      `,
      [...params, limit, offset],
    )
    return c.json({
      items: rows.map((r) => ({
        id: r.id,
        eventId: r.event_id,
        deviceId: r.device_id,
        provider: r.provider,
        status: r.status,
        attemptCount: r.attempt_count,
        nextAttemptAt: r.next_attempt_at,
        lastError: r.last_error,
        providerTicketId: r.provider_ticket_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      page,
      limit,
      total: rows[0]?.total ?? 0,
    })
  })

  app.post('/api/admin/outbox/push/:id/retry', async (c) => {
    const id = Number(c.req.param('id'))
    const { rows } = await query(
      `
      update push_outbox
      set status = 'pending', next_attempt_at = now(), last_error = null, leased_at = null, lease_token = null
      where id = $1
      returning id, status
      `,
      [id],
    )
    if (!rows[0]) return c.json({ error: 'not_found' }, 404)
    await audit('push_outbox_retry', 'push_outbox', id, {})
    return c.json({ success: true, ...rows[0] })
  })

  /* ---------- Notifications ---------- */
  app.get('/api/admin/notifications', async (c) => {
    const { page, limit, offset } = pageParams(c)
    const eventKey = c.req.query('eventKey')?.trim()
    const conditions = []
    const params = []
    if (eventKey) {
      params.push(`%${eventKey}%`)
      conditions.push(`n.event_key ilike $${params.length}`)
    }
    const where = conditions.length ? `where ${conditions.join(' and ')}` : ''
    const { rows } = await query(
      `
      select n.id, n.event_key, n.user_id, n.source, n.payload, n.delivery_mode, n.created_at,
             u.name as user_name, u.email as user_email,
             count(*) over()::int as total
      from notification_events n
      left join users u on u.id = n.user_id
      ${where}
      order by n.created_at desc
      limit $${params.length + 1} offset $${params.length + 2}
      `,
      [...params, limit, offset],
    )
    return c.json({
      items: rows.map((r) => ({
        id: r.id,
        eventKey: r.event_key,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        source: r.source,
        payload: r.payload,
        deliveryMode: r.delivery_mode,
        createdAt: r.created_at,
      })),
      page,
      limit,
      total: rows[0]?.total ?? 0,
    })
  })

  /* ---------- Mobile sessions (no secrets) ---------- */
  app.get('/api/admin/mobile-sessions', async (c) => {
    const { page, limit, offset } = pageParams(c)
    const activeOnly = c.req.query('activeOnly') === 'true'
    const where = activeOnly
      ? `where s.revoked_at is null and s.expires_at > now()`
      : ''
    const { rows } = await query(
      `
      select s.id, s.session_id, s.user_id, s.user_agent, s.expires_at, s.revoked_at,
             s.last_used_at, s.created_at, s.last_access_token_exp,
             u.name as user_name, u.email as user_email,
             count(*) over()::int as total
      from mobile_sessions s
      left join users u on u.id = s.user_id
      ${where}
      order by s.last_used_at desc nulls last
      limit $1 offset $2
      `,
      [limit, offset],
    )
    return c.json({
      items: rows.map((r) => ({
        id: r.id,
        sessionId: r.session_id,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        userAgent: r.user_agent,
        expiresAt: r.expires_at,
        revokedAt: r.revoked_at,
        lastUsedAt: r.last_used_at,
        createdAt: r.created_at,
        accessTokenExp: r.last_access_token_exp,
      })),
      page,
      limit,
      total: rows[0]?.total ?? 0,
    })
  })

  app.post('/api/admin/mobile-sessions/:id/revoke', async (c) => {
    const id = Number(c.req.param('id'))
    const { rows } = await query(
      `
      update mobile_sessions
      set revoked_at = now(), updated_at = now()
      where id = $1 and revoked_at is null
      returning id, revoked_at, user_id
      `,
      [id],
    )
    if (!rows[0]) return c.json({ error: 'not_found_or_already_revoked' }, 404)
    await audit('mobile_session_revoked', 'mobile_session', id, { userId: rows[0].user_id })
    return c.json({ success: true, ...rows[0] })
  })

  /* ---------- Feature requests ---------- */
  app.get('/api/admin/feature-requests', async (c) => {
    const { page, limit, offset } = pageParams(c)
    const status = c.req.query('status')?.trim()
    const conditions = []
    const params = []
    if (status) {
      params.push(status)
      conditions.push(`status = $${params.length}`)
    }
    const where = conditions.length ? `where ${conditions.join(' and ')}` : ''
    const { rows } = await query(
      `
      select id, title, description, category, author_id, author_name, votes, status,
             created_at, updated_at, count(*) over()::int as total
      from feature_requests
      ${where}
      order by votes desc, created_at desc
      limit $${params.length + 1} offset $${params.length + 2}
      `,
      [...params, limit, offset],
    )
    return c.json({
      items: rows,
      page,
      limit,
      total: rows[0]?.total ?? 0,
    })
  })

  app.patch('/api/admin/feature-requests/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const body = await c.req.json().catch(() => ({}))
    const status = body.status
    if (!['pending', 'planned', 'in_progress', 'done', 'rejected'].includes(status)) {
      return c.json({ error: 'bad_request' }, 400)
    }
    const { rows } = await query(
      `update feature_requests set status = $1, updated_at = now() where id = $2 returning id, status`,
      [status, id],
    )
    if (!rows[0]) return c.json({ error: 'not_found' }, 404)
    await audit('feature_request_updated', 'feature_request', id, { status })
    return c.json({ success: true, ...rows[0] })
  })

  /* ---------- Safety reports + feedback ---------- */
  app.get('/api/admin/safety-reports', async (c) => {
    const { page, limit, offset } = pageParams(c)
    const status = c.req.query('status')?.trim() || 'pending'
    const { rows } = await query(
      `
      select sr.*, u.name as reporter_name, u.email as reporter_email,
             count(*) over()::int as total
      from safety_reports sr
      left join users u on u.id = sr.reporter_id
      where sr.status = $1
      order by sr.created_at desc nulls last
      limit $2 offset $3
      `,
      [status, limit, offset],
    )
    return c.json({
      items: rows.map((r) => ({
        id: r.id,
        category: r.category,
        description: r.description,
        email: r.email,
        status: r.status,
        createdAt: r.created_at,
        reviewNotes: r.review_notes,
        reporter: r.reporter_id
          ? { id: r.reporter_id, name: r.reporter_name, email: r.reporter_email }
          : null,
      })),
      page,
      limit,
      total: rows[0]?.total ?? 0,
    })
  })

  app.post('/api/admin/safety-reports/:id/review', async (c) => {
    const id = Number(c.req.param('id'))
    const body = await c.req.json().catch(() => ({}))
    if (!['resolved', 'dismissed'].includes(body.status)) return c.json({ error: 'bad_request' }, 400)
    const adminId = await getAdminActorId()
    const { rows } = await query(
      `
      update safety_reports
      set status = $1, review_notes = $2, reviewed_at = now(), reviewed_by = $3
      where id = $4
      returning id, status
      `,
      [body.status, body.reviewNotes?.trim() || null, adminId, id],
    )
    if (!rows[0]) return c.json({ error: 'not_found' }, 404)
    await audit('safety_report_reviewed', 'safety_report', id, { status: body.status })
    return c.json({ success: true, ...rows[0] })
  })

  app.get('/api/admin/feedback', async (c) => {
    const { page, limit, offset } = pageParams(c)
    const status = c.req.query('status')?.trim()
    const conditions = []
    const params = []
    if (status) {
      params.push(status)
      conditions.push(`f.status = $${params.length}`)
    }
    const where = conditions.length ? `where ${conditions.join(' and ')}` : ''
    const { rows } = await query(
      `
      select f.id, f.seller_id, f.reviewer_id, f.rating, f.comment, f.status, f.created_at,
             f.seller_report_status, f.seller_report_reason,
             s.name as seller_name, r.name as reviewer_name,
             count(*) over()::int as total
      from seller_feedback f
      left join users s on s.id = f.seller_id
      left join users r on r.id = f.reviewer_id
      ${where}
      order by f.created_at desc
      limit $${params.length + 1} offset $${params.length + 2}
      `,
      [...params, limit, offset],
    )
    return c.json({
      items: rows.map((r) => ({
        id: r.id,
        sellerId: r.seller_id,
        sellerName: r.seller_name,
        reviewerId: r.reviewer_id,
        reviewerName: r.reviewer_name,
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        createdAt: r.created_at,
        sellerReportStatus: r.seller_report_status,
        sellerReportReason: r.seller_report_reason,
      })),
      page,
      limit,
      total: rows[0]?.total ?? 0,
    })
  })

  app.patch('/api/admin/feedback/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const body = await c.req.json().catch(() => ({}))
    if (!['published', 'hidden', 'removed'].includes(body.status)) {
      return c.json({ error: 'bad_request' }, 400)
    }
    const { rows } = await query(
      `update seller_feedback set status = $1, updated_at = now() where id = $2 returning id, status`,
      [body.status, id],
    )
    if (!rows[0]) return c.json({ error: 'not_found' }, 404)
    await audit('feedback_moderated', 'seller_feedback', id, { status: body.status })
    return c.json({ success: true, ...rows[0] })
  })

  /* ---------- Admins + tools ---------- */
  app.get('/api/admin/admins', async (c) => {
    const { rows } = await query(
      `
      select id, name, email, phone, joined, last_name, first_name
      from users where role = 'admin'
      order by joined desc nulls last
      `,
    )
    return c.json({ items: rows })
  })

  app.get('/api/admin/tools/overview', async (c) => {
    const [pendingEmail, failedEmail, pendingPush, activeSessions, featured, inReview] =
      await Promise.all([
        query(`select count(*)::int as n from email_outbox where status = 'pending'`),
        query(`select count(*)::int as n from email_outbox where status in ('failed', 'error')`),
        query(`select count(*)::int as n from push_outbox where status = 'pending'`),
        query(
          `select count(*)::int as n from mobile_sessions where revoked_at is null and expires_at > now()`,
        ),
        query(`select count(*)::int as n from listings where featured_active = true`),
        query(`select count(*)::int as n from listings where status = 'inreview'`),
      ])
    return c.json({
      pendingEmail: pendingEmail.rows[0].n,
      failedEmail: failedEmail.rows[0].n,
      pendingPush: pendingPush.rows[0].n,
      activeSessions: activeSessions.rows[0].n,
      featuredListings: featured.rows[0].n,
      listingsInReview: inReview.rows[0].n,
    })
  })

  app.post('/api/admin/tools/retry-failed-email', async (c) => {
    const { rows } = await query(
      `
      update email_outbox
      set status = 'pending', next_attempt_at = now(), last_error = null, leased_at = null, lease_token = null
      where status in ('failed', 'error')
      returning id
      `,
    )
    await audit('bulk_email_retry', 'email_outbox', null, { count: rows.length })
    return c.json({ success: true, retried: rows.length })
  })

  app.post('/api/admin/tools/clear-featured', async (c) => {
    const { rows } = await query(
      `
      update listings
      set featured_active = false
      where featured_active = true
      returning id
      `,
    )
    await audit('bulk_clear_featured', 'listing', null, { count: rows.length })
    return c.json({ success: true, cleared: rows.length })
  })
}
