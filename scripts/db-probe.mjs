import pg from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('Missing DATABASE_URL')
  process.exit(1)
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
})

try {
  await client.connect()
  console.log('CONNECTED_OK')

  const version = await client.query('select version()')
  console.log('VERSION:', version.rows[0].version)

  const tables = await client.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name
  `)
  console.log('TABLES:', tables.rows.length)
  for (const r of tables.rows) {
    console.log(`${r.table_schema}.${r.table_name}`)
  }
} catch (e) {
  console.error('CONNECT_ERROR:', e.message)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
