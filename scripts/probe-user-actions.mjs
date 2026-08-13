const base = 'http://localhost:8787'
const plans = await (await fetch(`${base}/api/admin/pricing/plans`)).json()
console.log('plans', plans.items?.length, plans.items?.[0]?.slug)

const ws = await (await fetch(`${base}/api/admin/users/62/workspace`)).json()
console.log('avatar' in (ws.user || {}), ws.user?.email, ws.pricing?.currentPlan?.displayName)

const patch = await fetch(`${base}/api/admin/users/62`, {
  method: 'PATCH',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ location: ws.user?.location || 'Kampala' }),
})
console.log('patch', patch.status, await patch.json())
