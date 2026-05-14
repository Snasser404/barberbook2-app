import { useEffect, useState } from 'react'
import api from '../../../api/client'
import { SupportTicket } from '../../../types'

export default function AdminSupportTab() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [filter, setFilter] = useState<'OPEN' | 'IN_PROGRESS' | 'CLOSED' | ''>('OPEN')
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<SupportTicket | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')

  const load = (status?: typeof filter) => {
    setLoading(true)
    const s = status ?? filter
    return api.get('/admin/support-tickets', { params: { status: s || undefined } })
      .then((r) => setTickets(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyingTo) return
    setSending(true)
    setErr('')
    try {
      const { data } = await api.post(`/admin/support-tickets/${replyingTo.id}/reply`, { reply: replyText })
      setTickets((p) => p.map((t) => t.id === data.id ? data : t))
      setReplyingTo(null)
      setReplyText('')
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Reply failed')
    } finally { setSending(false) }
  }

  const setStatus = async (t: SupportTicket, status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED') => {
    try {
      const { data } = await api.put(`/admin/support-tickets/${t.id}/status`, { status })
      setTickets((p) => p.map((x) => x.id === t.id ? data : x))
    } catch (e: any) { alert(e.response?.data?.error || 'Failed') }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-semibold text-gray-900">Support tickets</h2>
        <div className="flex gap-1">
          {(['OPEN', 'IN_PROGRESS', 'CLOSED', ''] as const).map((s) => (
            <button
              key={s || 'all'}
              onClick={() => { setFilter(s); load(s) }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {s ? s.replace('_', ' ') : 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-gray-400 text-sm text-center py-6">Loading…</p> : tickets.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">No tickets here.</p>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{t.name} <span className="text-gray-500 text-sm font-normal">&lt;{t.email}&gt;</span></p>
                  {t.subject && <p className="text-sm text-gray-700 italic">"{t.subject}"</p>}
                  <p className="text-xs text-gray-400">Created {new Date(t.createdAt).toLocaleString()}</p>
                </div>
                <span className={`badge text-xs ${t.status === 'OPEN' ? 'bg-amber-100 text-amber-800' : t.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>{t.status.replace('_', ' ')}</span>
              </div>
              <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-3 rounded whitespace-pre-line">{t.message}</p>
              {t.adminReply && (
                <p className="text-sm text-blue-700 mt-2 bg-blue-50 p-3 rounded whitespace-pre-line">
                  <span className="font-semibold block">Your reply ({t.repliedAt && new Date(t.repliedAt).toLocaleDateString()}):</span>
                  {t.adminReply}
                </p>
              )}
              <div className="flex gap-2 mt-3 flex-wrap">
                <button onClick={() => { setReplyingTo(t); setReplyText('') }} className="text-xs text-primary hover:underline">Reply via email</button>
                {t.status !== 'CLOSED' && <button onClick={() => setStatus(t, 'CLOSED')} className="text-xs text-gray-500 hover:underline">Mark closed</button>}
                {t.status !== 'OPEN' && <button onClick={() => setStatus(t, 'OPEN')} className="text-xs text-amber-600 hover:underline">Reopen</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {replyingTo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !sending && setReplyingTo(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-primary mb-2">Reply to {replyingTo.name}</h3>
            <p className="text-xs text-gray-500 mb-3">An email will be sent to {replyingTo.email}.</p>
            {err && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-2">{err}</div>}
            <form onSubmit={sendReply} className="space-y-3">
              <textarea className="input resize-none" rows={6} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write your reply…" required />
              <div className="flex gap-2">
                <button type="button" onClick={() => setReplyingTo(null)} disabled={sending} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button type="submit" disabled={sending} className="flex-1 btn-primary text-sm">{sending ? 'Sending…' : 'Send reply'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
