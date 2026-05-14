import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../api/client'
import ConfirmDialog from '../../../components/ConfirmDialog'

interface AdminReview {
  id: string
  rating: number
  comment?: string | null
  createdAt: string
  customer?: { id: string; name: string; email: string } | null
  shop?: { id: string; name: string } | null
}

export default function AdminReviewsTab() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [toDelete, setToDelete] = useState<AdminReview | null>(null)
  const [working, setWorking] = useState(false)

  const load = (s?: string) => {
    setLoading(true)
    return api.get('/admin/reviews', { params: { search: s || search || undefined } })
      .then((r) => setReviews(r.data))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const deleteNow = async () => {
    if (!toDelete) return
    setWorking(true)
    try {
      await api.delete(`/admin/reviews/${toDelete.id}`)
      setReviews((p) => p.filter((r) => r.id !== toDelete.id))
      setToDelete(null)
    } catch (err: any) { alert(err.response?.data?.error || 'Failed') } finally { setWorking(false) }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-gray-900 mb-3">Reviews</h2>
      <form onSubmit={(e) => { e.preventDefault(); load() }} className="flex gap-2 mb-3">
        <input className="input flex-1" placeholder="Search by comment…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="submit" className="btn-primary text-sm">Search</button>
      </form>

      {loading ? <p className="text-gray-400 text-sm text-center py-6">Loading…</p> : reviews.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">No reviews found.</p>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="text-yellow-500">{'★'.repeat(r.rating)}</span>
                    <span className="ml-2 font-medium">{r.customer?.name}</span>
                    <span className="text-gray-400 text-xs ml-1">({r.customer?.email})</span>
                    <span className="text-gray-500"> on </span>
                    {r.shop ? <Link to={`/shops/${r.shop.id}`} className="text-primary hover:underline">{r.shop.name}</Link> : <span className="text-gray-400 italic">[deleted shop]</span>}
                  </p>
                  {r.comment && <p className="text-gray-600 text-sm mt-1">"{r.comment}"</p>}
                  <p className="text-xs text-gray-400 mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                </div>
                <button onClick={() => setToDelete(r)} className="text-xs text-red-500 hover:underline shrink-0">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this review?"
        message={toDelete ? `This review by ${toDelete.customer?.name} will be permanently removed. The shop's rating will be recalculated.\n\nThis cannot be undone.` : undefined}
        confirmLabel="Delete review"
        tone="danger"
        loading={working}
        onConfirm={deleteNow}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
