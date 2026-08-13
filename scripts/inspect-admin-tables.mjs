import pg from 'pg'
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await c.connect()
for (const t of ['email_outbox', 'categories', 'notification_events', 'mobile_sessions', 'feature_requests']) {
  const cols = await c.query(
    `select column_name, data_type from information_schema.columns where table_name=$1 order by ordinal_position`,
    [t],
  )
  const sample = await c.query(`select * from ${t} limit 1`)
  console.log('\n##', t)
  console.log(cols.rows.map((r) => r.column_name + ':' + r.data_type).join(', '))
  console.log('sample', JSON.stringify(sample.rows[0] || null).slice(0, 500))
}
await c.end()
