import { useState, useEffect } from 'react'
import api from '../../api/client'
import { Offer, BarberShop } from '../../types'

const emptyForm = { title: '', description: '', discountPercent: '', validUntil: '' }

export default function ManageOffers() {
  const [shop, setShop] = useState<BarberShop | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/shops/mine').then((r) => {
      setShop(r.data)
      if (r.data) api.get(`/shops/${r.data.id}/offers/all`).then((or) => setOffers(or.data))
    })
  }, [])

  const startEdit = (o: Offer) => {
    setEditId(o.id)
    setForm({
      title: o.title,
      description: o.description || '',
      discountPercent: String(o.discountPercent),
      validUntil: o.validUntil ? o.validUntil.split('T')[0] : '',
    })
  }

  const cancelEdit = () => { setEditId(null); setForm(emptyForm); setError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shop) return
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, discountPercent: Number(form.discountPercent), validUntil: form.validUntil || null }
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

  const deleteOffer = async (id: string) => {
    if (!shop || !confirm('Delete this offer?')) return
    await api.delete(`/shops/${shop.id}/offers/${id}`)
    setOffers((prev) => prev.filter((o) => o.id !== id))
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
                  {o.validUntil && <p className="text-gray-400 text-xs mt-1">Valid until {new Date(o.validUntil).toLocaleDateString()}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startEdit(o)} className="text-xs text-blue-500 hover:underline">Edit</button>
                  <button onClick={() => toggleActive(o)} className="text-xs text-gray-500 hover:underline">{o.isActive ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => deleteOffer(o.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
