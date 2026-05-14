import { useEffect, useState } from 'react'
import api from '../../../api/client'
import { AuditLogEntry } from '../../../types'

const ACTION_LABELS: Record<string, string> = {
  USER_SUSPENDED: '🚫 User suspended',
  USER_RESTORED: '✓ User restored',
  USER_DELETED_PERMANENTLY: '🗑 User permanently deleted',
  ADMIN_CREATED: '👑 Admin created',
  ADMIN_DEMOTED: '⬇ Admin demoted',
  SHOP_VERIFIED: '✅ Shop verified',
  SHOP_REJECTED: '❌ Shop rejected',
  SHOP_EDITED_BY_ADMIN: '✏ Shop edited by admin',
  SHOP_DELETED: '🗑 Shop deleted',
  REVIEW_DELETED: '🗑 Review deleted',
  STAFF_REVIEW_DELETED: '🗑 Staff review deleted',
}

export default function AdminAuditTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const load = (action?: string) => {
    setLoading(true)
    return api.get('/admin/audit-log', { params: { action: action || undefined } })
      .then((r) => setLogs(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const actionOptions = Array.from(new Set([...logs.map((l) => l.action), ...Object.keys(ACTION_LABELS)])).sort()

  const parseMetadata = (m?: string | null) => {
    if (!m) return null
    try { return JSON.parse(m) } catch { return m }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-semibold text-gray-900">Audit log</h2>
        <select className="input max-w-[240px] text-sm" value={filter} onChange={(e) => { setFilter(e.target.value); load(e.target.value) }}>
          <option value="">All actions</option>
          {actionOptions.map((a) => <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>)}
        </select>
      </div>

      {loading ? <p className="text-gray-400 text-sm text-center py-6">Loading…</p> : logs.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">No activity yet.</p>
      ) : (
        <div className="space-y-1.5 text-sm">
          {logs.map((l) => {
            const meta = parseMetadata(l.metadata)
            return (
              <div key={l.id} className="border-b border-gray-100 last:border-b-0 py-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-medium">{ACTION_LABELS[l.action] || l.action}</span>
                  <span className="text-xs text-gray-400">{new Date(l.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-500">
                  by {l.actorEmail || 'system'}
                  {l.targetType && l.targetId && <> · target {l.targetType.toLowerCase()} <code className="text-[10px] bg-gray-100 px-1 rounded">{l.targetId.slice(0, 8)}</code></>}
                </p>
                {meta && typeof meta === 'object' && (
                  <pre className="text-xs text-gray-600 bg-gray-50 rounded p-2 mt-1 overflow-x-auto">{JSON.stringify(meta, null, 2)}</pre>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
