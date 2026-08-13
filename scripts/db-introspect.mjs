import pg from 'pg'

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
})

async function q(sql, params = []) {
  const res = await client.query(sql, params)
  return res.rows
}

try {
  await client.connect()

  const cols = await q(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `)

  const byTable = {}
  for (const c of cols) {
    ;(byTable[c.table_name] ??= []).push(c)
  }

  console.log('=== SCHEMA ===')
  for (const [table, columns] of Object.entries(byTable)) {
    console.log(`\n## ${table}`)
    for (const c of columns) {
      console.log(
        `  - ${c.column_name}: ${c.data_type}${c.is_nullable === 'NO' ? ' NOT NULL' : ''}${c.column_default ? ` DEFAULT ${c.column_default}` : ''}`,
      )
    }
  }

  const counts = await q(`
    SELECT relname AS table_name, n_live_tup::bigint AS approx_rows
    FROM pg_stat_user_tables
    ORDER BY n_live_tup DESC
  `)
  console.log('\n=== APPROX ROW COUNTS ===')
  for (const r of counts) console.log(`${r.table_name}: ${r.approx_rows}`)

  // Exact counts for key tables
  const keyTables = [
    'users',
    'listings',
    'listing_reports',
    'safety_reports',
    'id_verification_documents',
    'admin_audit_logs',
    'chats',
    'messages',
    'seller_plan_assignments',
    'pricing_plans',
    'categories',
    'listing_boosts',
    'wallet_transactions',
  ]
  console.log('\n=== EXACT COUNTS ===')
  for (const t of keyTables) {
    try {
      const rows = await q(`SELECT count(*)::int AS n FROM ${t}`)
      console.log(`${t}: ${rows[0].n}`)
    } catch (e) {
      console.log(`${t}: ERROR ${e.message}`)
    }
  }

  // Enums / distinct statuses
  console.log('\n=== STATUS DISTRIBUTIONS ===')
  const statusQueries = [
    ['users.role', `SELECT role::text, count(*)::int FROM users GROUP BY 1 ORDER BY 2 DESC`],
    ['users.account_state / status-like', `SELECT column_name FROM information_schema.columns WHERE table_name='users'`],
    ['listings.status', `SELECT status::text, count(*)::int FROM listings GROUP BY 1 ORDER BY 2 DESC`],
    ['listing_reports.status', `SELECT status::text, count(*)::int FROM listing_reports GROUP BY 1 ORDER BY 2 DESC`],
    ['safety_reports.status', `SELECT status::text, count(*)::int FROM safety_reports GROUP BY 1 ORDER BY 2 DESC`],
  ]
  for (const [label, sql] of statusQueries) {
    try {
      const rows = await q(sql)
      console.log(`\n${label}:`)
      console.log(JSON.stringify(rows, null, 2))
    } catch (e) {
      console.log(`\n${label}: ERROR ${e.message}`)
    }
  }

  // Sample rows
  console.log('\n=== SAMPLE USERS (3) ===')
  console.log(JSON.stringify(await q(`SELECT * FROM users ORDER BY created_at DESC NULLS LAST LIMIT 3`), null, 2))

  console.log('\n=== SAMPLE LISTINGS (2) ===')
  console.log(JSON.stringify(await q(`SELECT * FROM listings ORDER BY created_at DESC NULLS LAST LIMIT 2`), null, 2))

  console.log('\n=== SAMPLE LISTING_REPORTS (3) ===')
  console.log(JSON.stringify(await q(`SELECT * FROM listing_reports ORDER BY created_at DESC NULLS LAST LIMIT 3`), null, 2))

  console.log('\n=== SAMPLE SAFETY_REPORTS (3) ===')
  console.log(JSON.stringify(await q(`SELECT * FROM safety_reports ORDER BY created_at DESC NULLS LAST LIMIT 3`), null, 2))

  console.log('\n=== SAMPLE ID_VERIFICATION (3) ===')
  console.log(JSON.stringify(await q(`SELECT * FROM id_verification_documents ORDER BY created_at DESC NULLS LAST LIMIT 3`), null, 2))

  console.log('\n=== SAMPLE ADMIN_AUDIT_LOGS (5) ===')
  console.log(JSON.stringify(await q(`SELECT * FROM admin_audit_logs ORDER BY created_at DESC NULLS LAST LIMIT 5`), null, 2))

  console.log('\n=== PRICING_PLANS ===')
  console.log(JSON.stringify(await q(`SELECT * FROM pricing_plans LIMIT 20`), null, 2))

  console.log('\n=== SELLER_PLAN_ASSIGNMENTS (5) ===')
  console.log(JSON.stringify(await q(`SELECT * FROM seller_plan_assignments ORDER BY created_at DESC NULLS LAST LIMIT 5`), null, 2))
} catch (e) {
  console.error('ERROR:', e)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
