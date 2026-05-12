import { useState, useEffect } from 'react'
import api from '../../api/client'
import { Offer, BarberShop, Service } from '../../types'
import ConfirmDialog from '../../components/ConfirmDialog'

const emptyForm = { title: '', description: '', discountPercent: '', validUntil: '', serviceId: '' }

export default function ManageOffers() {
  const [shop, setShop] = useState<BarberShop | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toDelete, setToDelete] = useState<Offer | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.get('/shops/mine').then((r) => {
      setShop(r.data)
      if (r.data) {
        api.get(`/shops/${r.data.id}/offers/all`).then((or) => setOffers(or.data))
        api.get(`/shops/${r.data.id}/services`).then((sr) => setServices(sr.data))
      }
    })
  }, [])

  const startEdit = (o: Offer) => {
    setEditId(o.id)
    setForm({
      title: o.title,
      description: o.description || '',
      discountPercent: String(o.discountPercent),
      validUntil: o.validUntil ? o.validUntil.split('T')[0] : '',
      serviceId: o.serviceId || '',
    })
  }

  const cancelEdit = () => { setEditId(null); setForm(emptyForm); setError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shop) return
    setSaving(true)
    setError('')
    try {
      const payload = {
        title: form.title,
        description: form.description,
        discountPercent: Number(form.discountPercent),
        validUntil: form.validUntil || null,
        serviceId: form.serviceId || null,
      }
      if (editId) {
        const { data } = await api.put(`/shops/${shop.id}/offers/${editId}`, payload)
        setOffers((prev) => prev.map((o) => o.id === editId ? data : o))
      } else {
        const { data } = await api.post(`/shops/${shop.id}/offers`, payload)
        setOffers((prev) => [data, ...prev])
      }
      cancelEdit()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (o: Offer) => {
    if (!shop) return
    const { data } = await api.put(`/shops/${shop.id}/offers/${o.id}`, { isActive: !o.isActive })
    setOffers((prev) => prev.map((x) => x.id === o.id ? data : x))
  }

  const confirmDelete = async () => {
    if (!shop || !toDelete) return
    setDeleting(true)
    try {
      await api.delete(`/shops/${shop.id}/offers/${toDelete.id}`)
      setOffers((prev) => prev.filter((o) => o.id !== toDelete.id))
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  if (!shop) return <div className="min-h-screen flex items-center justify-center text-gray-400">Set up your shop first</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-primary mb-6">Offers & Promotions</h1>

      <div className="card p-6 mb-8">
        <h2 className="font-semibold mb-4">{editId ? 'Edit offer' : 'Create new offer'}</h2>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Summer Special" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount % *</label>
              <input type="number" className="input" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} min="1" max="100" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional details" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid until (optional)</label>
            <input type="date" className="input" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} min={new Date().toISOString().split('T')[0]} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apply to a specific service (optional)</label>
            <select className="input" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
              <option value="">— All services (shop-wide) —</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} (${s.price})</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">When linked, this offer is shown alongside that service in the customer's view.</p>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editId ? 'Update' : 'Create offer'}</button>
            {editId && <button type="button" onClick={cancelEdit} className="btn-outline">Cancel</button>}
          </div>
        </form>
      </div>

      {offers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No offers yet — create one to attract customers</div>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => (
            <div key={o.id} className={`card p-4 ${!o.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏷</span>
                    <p className="font-semibold">{o.title}</p>
                    <span className="badge bg-accent/20 text-amber-800">{o.discountPercent}% off</span>
                    {!o.isActive && <span className="badge bg-gray-100 text-gray-500 text-xs">Inactive</span>}
                  </div>
                  {o.description && <p className="text-gray-500 text-sm mt-1">{o.description}</p>}
                  {o.service && <p className="text-blue-700 bg-blue-50 inline-block text-xs px-2 py-0.5 rounded mt-1">For service: {o.service.name}</p>}
                  {o.validUntil && <p className="text-gray-400 text-xs mt-1">Valid until {new Date(o.validUntil).toLocaleDateString()}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startEdit(o)} className="text-xs text-blue-500 hover:underline">Edit</button>
                  <button onClick={() => toggleActive(o)} className="text-xs text-gray-500 hover:underline">{o.isActive ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => setToDelete(o)} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this offer?"
        message={toDelete ? `"${toDelete.title}" will be permanently removed.` : undefined}
        confirmLabel="Delete offer"
        tone="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
