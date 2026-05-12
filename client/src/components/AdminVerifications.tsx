// Admin section for reviewing shop verification submissions.
// Lists pending shops, shows uploaded docs in a lightbox, and provides
// Approve / Reject actions.
import { useEffect, useState } from 'react'
import api from '../api/client'
import { BarberShop, VerificationDoc, VerificationStatus } from '../types'
import ConfirmDialog from './ConfirmDialog'

const DOC_LABELS: Record<string, string> = {
  BUSINESS_LICENSE: 'Business license',
  ID: 'Government ID',
  UTILITY_BILL: 'Utility bill',
  OTHER: 'Other',
}

export default function AdminVerifications() {
  const [shops, setShops] = useState<BarberShop[]>([])
  const [filter, setFilter] = useState<VerificationStatus | 'all'>('PENDING')
  const [loading, setLoading] = useState(true)
  const [toApprove, setToApprove] = useState<BarberShop | null>(null)
  const [toReject, setToReject] = useState<BarberShop | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [working, setWorking] = useState(false)
  const [lightbox, setLightbox] = useState<VerificationDoc | null>(null)

  const load = (status: VerificationStatus | 'all' = filter) => {
    setLoading(true)
    return api.get('/admin/verifications', { params: { status: status === 'all' ? 'all' : status } })
      .then((r) => setShops(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const approve = async () => {
    if (!toApprove) return
    setWorking(true)
    try {
      await api.post(`/admin/shops/${toApprove.id}/verify`)
      setShops((prev) => filter === 'PENDING' ? prev.filter((s) => s.id !== toApprove.id) : prev.map((s) => s.id === toApprove.id ? { ...s, verificationStatus: 'VERIFIED' as const } : s))
      setToApprove(null)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Could not approve')
    } finally {
      setWorking(false)
    }
  }

  const reject = async () => {
    if (!toReject) return
    if (rejectReason.trim().length < 5) { alert('Please provide a clearer reason (5+ chars).'); return }
    setWorking(true)
    try {
      await api.post(`/admin/shops/${toReject.id}/reject`, { reason: rejectReason })
      setShops((prev) => filter === 'PENDING' ? prev.filter((s) => s.id !== toReject.id) : prev.map((s) => s.id === toReject.id ? { ...s, verificationStatus: 'REJECTED' as const, verificationNotes: rejectReason } : s))
      setToReject(null)
      setRejectReason('')
    } catch (err: any) {
      alert(err.response?.data?.error || 'Could not reject')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="card p-5 mb-8">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h2 className="font-semibold text-gray-900">Shop verifications</h2>
        <div className="flex gap-1">
          {(['PENDING', 'VERIFIED', 'REJECTED', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm py-4 text-center">Loading…</p>
      ) : shops.length === 0 ? (
        <p className="text-gray-400 text-sm py-6 text-center">No shops in this state.</p>
      ) : (
        <div className="space-y-3">
          {shops.map((shop) => (
            <div key={shop.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{shop.name}</p>
                  <p className="text-xs text-gray-500">{shop.address}</p>
                  {shop.owner && (
                    <p className="text-xs text-gray-500 mt-1">Owner: {shop.owner.name} · <span className="text-gray-700">{shop.owner.email}</span></p>
                  )}
                  {shop.verificationStatus === 'REJECTED' && shop.verificationNotes && (
                    <p className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded mt-1">Rejected: {shop.verificationNotes}</p>
                  )}
                </div>
                <span className={`badge text-xs ${shop.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-800' : shop.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                  {shop.verificationStatus}
                </span>
              </div>

              {/* Documents */}
              {shop.verificationDocs && shop.verificationDocs.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {shop.verificationDocs.map((d) => {
                    const isImage = !d.url.toLowerCase().endsWith('.pdf')
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => isImage ? setLightbox(d) : window.open(d.url, '_blank')}
                        className="block group relative"
                        title={DOC_LABELS[d.documentType] || d.documentType}
                      >
                        {isImage ? (
                          <img src={d.url} alt="" className="w-full aspect-square rounded object-cover bg-gray-100 hover:ring-2 hover:ring-primary" />
                        ) : (
                          <div className="w-full aspect-square rounded bg-red-50 flex items-center justify-center text-red-600 text-xs font-semibold">PDF</div>
                        )}
                        <span className="text-[10px] text-gray-500 block mt-0.5 truncate">{DOC_LABELS[d.documentType] || d.documentType}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="mt-3 text-xs text-gray-400 italic">No documents uploaded.</p>
              )}

              {/* Actions */}
              {shop.verificationStatus !== 'VERIFIED' && (
                <div className="mt-3 pt-3 border-t flex gap-2 flex-wrap">
                  <button onClick={() => setToApprove(shop)} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg font-medium">✓ Approve</button>
                  <button onClick={() => { setToReject(shop); setRejectReason('') }} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded-lg font-medium">✗ Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approve confirm */}
      <ConfirmDialog
        open={!!toApprove}
        title="Approve this shop?"
        message={toApprove ? `${toApprove.name} will be marked as VERIFIED and become visible to customers immediately.` : undefined}
        confirmLabel="Approve"
        tone="primary"
        loading={working}
        onConfirm={approve}
        onCancel={() => setToApprove(null)}
      />

      {/* Reject modal */}
      {toReject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !working && setToReject(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-primary mb-2">Reject verification?</h3>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-medium">{toReject.name}</span> will be marked as REJECTED. The owner sees your reason and can re-upload corrected documents.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (shown to the owner) *</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. The business license expired in 2023 — please upload the current year"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setToReject(null)} disabled={working} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancel</button>
              <button onClick={reject} disabled={working || rejectReason.trim().length < 5} className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-sm disabled:opacity-50">
                {working ? 'Working…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setLightbox(null)}>
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.url} alt="" className="w-full max-h-[80vh] object-contain rounded-lg" />
            <div className="bg-white rounded-lg mt-2 p-3 text-sm">
              <p className="font-semibold">{DOC_LABELS[lightbox.documentType] || lightbox.documentType}</p>
              {lightbox.caption && <p className="text-gray-600">{lightbox.caption}</p>}
              <p className="text-xs text-gray-400 mt-1">Uploaded {new Date(lightbox.createdAt).toLocaleString()}</p>
              <button onClick={() => setLightbox(null)} className="mt-2 w-full px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
