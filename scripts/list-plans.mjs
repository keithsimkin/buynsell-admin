import pg from 'pg'

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await client.connect()
const plans = await client.query(
  `select id, slug, display_name, tier_code, family, price_ugx, is_free, active, top_plus_promotions
   from pricing_plans where active = true order by price_ugx asc`,
)
console.log(JSON.stringify(plans.rows, null, 2))
await client.end()
