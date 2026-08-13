import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Card, EmptyState, Spinner } from '../components/ui'

export default function ConversationReports() {
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<{ message?: string; degraded?: boolean }>('/api/admin/reports/conversations')
      .then((data) => setMessage(data.message ?? null))
      .catch((e) => setMessage(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <Card>
      <EmptyState
        title="Conversation reports unavailable here"
        detail={
          message ??
          'These live in Convex via the mono-repo backend. Use apps/admin for chat abuse review until Convex is wired.'
        }
      />
    </Card>
  )
}
