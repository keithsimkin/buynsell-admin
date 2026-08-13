import pg from 'pg'

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

await client.connect()

const users = await client.query(
  `select id, name, email, role, account_state, phone_verified, has_verified_badge, business_name, joined
   from users order by joined desc nulls last limit 8`,
)
const listings = await client.query(
  `select id, name, status, price, location, category_slug, featured_active, seller_id, date
   from listings order by date desc nulls last limit 5`,
)
const status = await client.query(
  `select status, count(*)::int as n from listings group by 1 order by 2 desc`,
)
const account = await client.query(
  `select account_state, count(*)::int as n from users group by 1`,
)
const idv = await client.query(`select id, user_id, status, full_name, submitted_at from id_verification_documents limit 5`)
const audit = await client.query(
  `select id, action, target_type, target_id, created_at from admin_audit_logs order by created_at desc limit 8`,
)
const paid = await client.query(
  `select count(*)::int as n from seller_plan_assignments
   where status = 'active' and is_baseline = false`,
)
const admins = await client.query(`select id, name, email from users where role = 'admin'`)
const inreview = await client.query(
  `select id, name, status, seller_id from listings where status = 'inreview' limit 10`,
)

console.log(
  JSON.stringify(
    {
      users: users.rows,
      listings: listings.rows,
      status: status.rows,
      account: account.rows,
      idv: idv.rows,
      audit: audit.rows,
      paid: paid.rows[0],
      admins: admins.rows,
      inreview: inreview.rows,
    },
    null,
    2,
  ),
)

await client.end()
