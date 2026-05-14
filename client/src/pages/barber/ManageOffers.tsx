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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
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

  const startAddNew = () => {
    setExpandedId(null)
    setAddingNew(true)
    setForm(emptyForm)
    setError('')
  }

  const startEdit = (o: Offer) => {
    if (expandedId === o.id) { setExpandedId(null); setError(''); return }
    setAddingNew(false)
    setExpandedId(o.id)
    setForm({
      title: o.title,
      description: o.description || '',
      discountPercent: String(o.discountPercent),
      validUntil: o.validUntil ? o.validUntil.split('T')[0] : '',
      serviceId: o.serviceId || '',
    })
    setError('')
  }

  const cancel = () => {
    setExpandedId(null)
    setAddingNew(false)
    setForm(emptyForm)
    setError('')
  }

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
      if (expandedId) {
        const { data } = await api.put(`/shops/${shop.id}/offers/${expandedId}`, payload)
        setOffers((prev) => prev.map((o) => o.id === expandedId ? data : o))
      } else {
        const { data } = await api.post(`/shops/${shop.id}/offers`, payload)
        setOffers((prev) => [data, ...prev])
      }
      cancel()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed')
    } finally { setSaving(false) }
  }

  const toggleActive = async (o: Offer, ev: React.MouseEvent) => {
    ev.stopPropagation()
    if (!shop) return
    const { data } = await api.put(`/shops/${shop.id}/offers/${o.id}`, { isActive: !o.isActive })
    setOffers((prev) => prev.map((x) => x.id === o.id ? data : x))
  }

  const askDelete = (o: Offer, ev: React.MouseEvent) => {
    ev.stopPropagation()
    setToDelete(o)
  }

  const confirmDelete = async () => {
    if (!shop || !toDelete) return
    setDeleting(true)
    try {
      await api.delete(`/shops/${shop.id}/offers/${toDelete.id}`)
      setOffers((prev) => prev.filter((o) => o.id !== toDelete.id))
      setToDelete(null)
    } finally { setDeleting(false) }
  }

  if (!shop) return <div className="min-h-screen flex items-center justify-center text-gray-400">Set up your shop first</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-primary">Offers &amp; Promotions</h1>
        <button onClick={startAddNew} className="btn-primary text-sm">+ Add offer</button>
      </div>

      {addingNew && (
        <div className="card p-5 mb-6 border-2 border-primary/30">
          <h2 className="font-semibold text-gray-900 mb-3">New offer</h2>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
          <OfferForm form={form} setForm={setForm} services={services} onSubmit={handleSubmit} onCancel={cancel} saving={saving} submitLabel="Add offer" />
        </div>
      )}

      {offers.length === 0 && !addingNew ? (
        <div className="text-center py-16 text-gray-400 card">
          <p className="text-4xl mb-3">🏷</p>
          <p className="font-medium">No offers yet</p>
          <p className="text-sm mt-1">Click "+ Add offer" to create your first promotion.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => {
            const open = expandedId === o.id
            return (
              <div key={o.id} className={`card transition-all ${!o.isActive ? 'opacity-60' : ''} ${open ? 'ring-2 ring-primary/40' : ''}`}>
                <button
                  type="button"
                  onClick={() => startEdit(o)}
                  className="w-full p-4 flex items-start justify-between gap-4 text-left hover:bg-gray-50/60 rounded-t-xl"
                  aria-expanded={open}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">🏷</span>
                      <p className="font-medium">{o.title}</p>
                      <span className="badge bg-accent/20 text-amber-800 text-xs">{o.discountPercent}% off</span>
                      {!o.isActive && <span className="badge bg-gray-100 text-gray-500 text-xs">Inactive</span>}
                      {open && <span className="badge bg-primary/10 text-primary text-xs">Editing</span>}
                    </div>
                    {o.description && <p className="text-gray-500 text-sm mt-0.5">{o.description}</p>}
                    {o.service && <p className="text-blue-700 bg-blue-50 inline-block text-xs px-2 py-0.5 rounded mt-1">For service: {o.service.name}</p>}
                    {o.validUntil && <p className="text-gray-400 text-xs mt-1">Valid until {new Date(o.validUntil).toLocaleDateString()}</p>}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{open ? '▲ Click to close' : '▼ Click to edit'}</span>
                </button>

                {open && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-3">{error}</div>}
                    <OfferForm form={form} setForm={setForm} services={services} onSubmit={handleSubmit} onCancel={cancel} saving={saving} submitLabel="Save changes" />
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                      <button type="button" onClick={(e) => toggleActive(o, e)} className="text-xs text-gray-500 hover:underline">{o.isActive ? 'Deactivate' : 'Activate'}</button>
                      <button type="button" onClick={(e) => askDelete(o, e)} className="text-xs text-red-500 hover:underline ml-auto">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
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

function OfferForm({ form, setForm, services, onSubmit, onCancel, saving, submitLabel }: {
  form: typeof emptyForm
  setForm: (f: typeof emptyForm) => void
  services: Service[]
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  saving: boolean
  submitLabel: string
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <div className="grid sm:grid-cols-2 gap-3">
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
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : submitLabel}</button>
        <button type="button" onClick={onCancel} className="btn-outline text-sm">Cancel</button>
      </div>
    </form>
  )
}
