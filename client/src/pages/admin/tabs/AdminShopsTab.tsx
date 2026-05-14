import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../api/client'
import ConfirmDialog from '../../../components/ConfirmDialog'

interface AdminShop {
  id: string
  name: string
  address: string
  description?: string | null
  phone?: string | null
  openingTime: string
  closingTime: string
  verificationStatus?: string
  owner?: { id: string; email: string; name: string } | null
  _count?: { appointments: number; reviews: number; staff: number }
}

export default function AdminShopsTab() {
  const [shops, setShops] = useState<AdminShop[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminShop | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<AdminShop | null>(null)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    return api.get('/admin/shops').then((r) => setShops(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const startEdit = (s: AdminShop) => {
    setEditing(s)
    setEditForm({
      name: s.name, address: s.address, description: s.description || '',
      phone: s.phone || '', openingTime: s.openingTime, closingTime: s.closingTime,
    })
    setError('')
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    setError('')
    try {
      const { data } = await api.put(`/admin/shops/${editing.id}`, editForm)
      setShops((p) => p.map((s) => s.id === editing.id ? { ...s, ...data } : s))
      setEditing(null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed')
    } finally { setSaving(false) }
  }

  const deleteNow = async () => {
    if (!toDelete) return
    setWorking(true)
    try {
      await api.delete(`/admin/shops/${toDelete.id}`)
      setShops((p) => p.filter((s) => s.id !== toDelete.id))
      setToDelete(null)
    } catch (err: any) { alert(err.response?.data?.error || 'Failed') } finally { setWorking(false) }
  }

  if (loading) return <p className="text-gray-400 text-sm text-center py-6">Loading…</p>

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-semibold text-gray-900">Shops ({shops.length})</h2>
      </div>

      {shops.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">No shops yet.</p>
      ) : (
        <div className="space-y-3">
          {shops.map((s) => (
            <div key={s.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <Link to={`/shops/${s.id}`} className="font-semibold hover:underline">{s.name}</Link>
                  <p className="text-xs text-gray-500">{s.address}</p>
                  {s.owner && <p className="text-xs text-gray-500 mt-1">Owner: {s.owner.name} ({s.owner.email})</p>}
                  {s._count && <p className="text-xs text-gray-400 mt-1">{s._count.appointments} appointments · {s._count.reviews} reviews · {s._count.staff} barbers</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {s.verificationStatus && (
                    <span className={`badge text-xs ${s.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-800' : s.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                      {s.verificationStatus}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t flex-wrap">
                <button onClick={() => startEdit(s)} className="text-xs text-primary hover:underline">Edit</button>
                <button onClick={() => setToDelete(s)} className="text-xs text-red-500 hover:underline ml-auto">Delete shop</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !saving && setEditing(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-primary mb-3">Edit shop</h3>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-3">{error}</div>}
            <form onSubmit={save} className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><input className="input" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input className="input" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea className="input resize-none" rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Opens</label><input type="time" className="input" value={editForm.openingTime} onChange={(e) => setEditForm({ ...editForm, openingTime: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Closes</label><input type="time" className="input" value={editForm.closingTime} onChange={(e) => setEditForm({ ...editForm, closingTime: e.target.value })} /></div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditing(null)} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary text-sm">{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this shop?"
        message={toDelete ? `${toDelete.name} will be permanently removed, along with all its services, offers, staff, gallery, appointments and reviews.\n\nThis cannot be undone.` : undefined}
        confirmLabel="Delete shop"
        tone="danger"
        loading={working}
        onConfirm={deleteNow}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
