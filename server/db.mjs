import 'dotenv/config'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is required')
}

export const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 8,
})

export async function query(text, params = []) {
  return pool.query(text, params)
}

export async function getAdminActorId() {
  const fromEnv = Number(process.env.ADMIN_ACTOR_ID)
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv
  const { rows } = await query(
    `select id from users where role = 'admin' order by id asc limit 1`,
  )
  return rows[0]?.id ?? null
}

export async function audit(action, targetType, targetId, metadata = {}) {
  const adminUserId = await getAdminActorId()
  if (!adminUserId) return
  await query(
    `insert into admin_audit_logs (admin_user_id, action, target_type, target_id, metadata)
     values ($1, $2, $3, $4, $5::jsonb)`,
    [adminUserId, action, targetType, targetId == null ? null : String(targetId), JSON.stringify(metadata)],
  )
}
