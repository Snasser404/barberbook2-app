import { useState, useEffect } from 'react'
import api from '../../api/client'
import { Service, BarberShop } from '../../types'
import ConfirmDialog from '../../components/ConfirmDialog'

const emptyForm = { name: '', description: '', price: '', duration: '30', isActive: true }

export default function ManageServices() {
  const [shop, setShop] = useState<BarberShop | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [form, setForm] = useState(emptyForm)
  const [expandedId, setExpandedId] = useState<string | null>(null) // which service row is open
  const [addingNew, setAddingNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toDelete, setToDelete] = useState<Service | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.get('/shops/mine').then((r) => {
      setShop(r.data)
      if (r.data) api.get(`/shops/${r.data.id}/services`).then((sr) => setServices(sr.data))
    })
  }, [])

  const startAddNew = () => {
    setExpandedId(null)
    setAddingNew(true)
    setForm(emptyForm)
    setError('')
  }

  const startEdit = (s: Service) => {
    // Toggle: clicking the same row again collapses it
    if (expandedId === s.id) {
      setExpandedId(null)
      setError('')
      return
    }
    setAddingNew(false)
    setExpandedId(s.id)
    setForm({ name: s.name, description: s.description || '', price: String(s.price), duration: String(s.duration), isActive: s.isActive })
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
      if (expandedId) {
        const { data } = await api.put(`/shops/${shop.id}/services/${expandedId}`, { ...form, price: Number(form.price), duration: Number(form.duration) })
        setServices((prev) => prev.map((s) => s.id === expandedId ? data : s))
      } else {
        const { data } = await api.post(`/shops/${shop.id}/services`, { ...form, price: Number(form.price), duration: Number(form.duration) })
        setServices((prev) => [...prev, data])
      }
      cancel()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (s: Service, ev: React.MouseEvent) => {
    ev.stopPropagation()
    if (!shop) return
    const { data } = await api.put(`/shops/${shop.id}/services/${s.id}`, { isActive: !s.isActive })
    setServices((prev) => prev.map((x) => x.id === s.id ? data : x))
  }

  const askDelete = (s: Service, ev: React.MouseEvent) => {
    ev.stopPropagation()
    setToDelete(s)
  }

  const confirmDelete = async () => {
    if (!shop || !toDelete) return
    setDeleting(true)
    try {
      await api.delete(`/shops/${shop.id}/services/${toDelete.id}`)
      setServices((prev) => prev.filter((s) => s.id !== toDelete.id))
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  if (!shop) return <div className="min-h-screen flex items-center justify-center text-gray-400">Set up your shop first</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-primary">Services</h1>
        <button onClick={startAddNew} className="btn-primary text-sm">+ Add service</button>
      </div>

      {/* Add-new inline form */}
      {addingNew && (
        <div className="card p-5 mb-6 border-2 border-primary/30">
          <h2 className="font-semibold text-gray-900 mb-3">New service</h2>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
          <ServiceForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={cancel} saving={saving} submitLabel="Add service" />
        </div>
      )}

      {/* List with inline expand/edit */}
      {services.length === 0 && !addingNew ? (
        <div className="text-center py-16 text-gray-400 card">
          <p className="text-4xl mb-3">✂</p>
          <p className="font-medium">No services yet</p>
          <p className="text-sm mt-1">Click "+ Add service" to add your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((s) => {
            const open = expandedId === s.id
            return (
              <div key={s.id} className={`card transition-all ${!s.isActive ? 'opacity-60' : ''} ${open ? 'ring-2 ring-primary/40' : ''}`}>
                {/* Clickable header */}
                <button
                  type="button"
                  onClick={() => startEdit(s)}
                  className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-gray-50/60 rounded-t-xl"
                  aria-expanded={open}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{s.name}</p>
                      {!s.isActive && <span className="badge bg-gray-100 text-gray-500 text-xs">Hidden</span>}
                      {open && <span className="badge bg-primary/10 text-primary text-xs">Editing</span>}
                    </div>
                    {s.description && <p className="text-gray-400 text-sm">{s.description}</p>}
                    <p className="text-gray-400 text-xs mt-0.5">{s.duration} min</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary">${s.price}</p>
                    <span className="text-xs text-gray-400">{open ? '▲ Click to close' : '▼ Click to edit'}</span>
                  </div>
                </button>

                {/* Expanded editor */}
                {open && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-3">{error}</div>}
                    <ServiceForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={cancel} saving={saving} submitLabel="Save changes" />
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                      <button type="button" onClick={(e) => toggleActive(s, e)} className="text-xs text-gray-500 hover:underline">{s.isActive ? 'Hide service' : 'Show service'}</button>
                      <button type="button" onClick={(e) => askDelete(s, e)} className="text-xs text-red-500 hover:underline ml-auto">Delete</button>
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
        title="Delete this service?"
        message={toDelete ? `"${toDelete.name}" will be permanently removed. This cannot be undone.` : undefined}
        confirmLabel="Delete service"
        tone="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}

function ServiceForm({ form, setForm, onSubmit, onCancel, saving, submitLabel }: {
  form: typeof emptyForm
  setForm: (f: typeof emptyForm) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  saving: boolean
  submitLabel: string
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service name *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Classic Haircut" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
          <input type="number" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} min="0" step="0.01" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) *</label>
          <select className="input" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}>
            {[15, 20, 30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d} min</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : submitLabel}</button>
        <button type="button" onClick={onCancel} className="btn-outline text-sm">Cancel</button>
      </div>
    </form>
  )
}
