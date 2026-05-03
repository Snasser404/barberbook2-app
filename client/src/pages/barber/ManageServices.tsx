import { useState, useEffect } from 'react'
import api from '../../api/client'
import { Service, BarberShop } from '../../types'

const emptyForm = { name: '', description: '', price: '', duration: '30', isActive: true }

export default function ManageServices() {
  const [shop, setShop] = useState<BarberShop | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/shops/mine').then((r) => {
      setShop(r.data)
      if (r.data) api.get(`/shops/${r.data.id}/services`).then((sr) => setServices(sr.data))
    })
  }, [])

  const startEdit = (s: Service) => {
    setEditId(s.id)
    setForm({ name: s.name, description: s.description || '', price: String(s.price), duration: String(s.duration), isActive: s.isActive })
  }

  const cancelEdit = () => {
    setEditId(null)
    setForm(emptyForm)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shop) return
    setSaving(true)
    setError('')
    try {
      if (editId) {
        const { data } = await api.put(`/shops/${shop.id}/services/${editId}`, { ...form, price: Number(form.price), duration: Number(form.duration) })
        setServices((prev) => prev.map((s) => s.id === editId ? data : s))
      } else {
        const { data } = await api.post(`/shops/${shop.id}/services`, { ...form, price: Number(form.price), duration: Number(form.duration) })
        setServices((prev) => [...prev, data])
      }
      cancelEdit()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (s: Service) => {
    if (!shop) return
    const { data } = await api.put(`/shops/${shop.id}/services/${s.id}`, { isActive: !s.isActive })
    setServices((prev) => prev.map((x) => x.id === s.id ? data : x))
  }

  const deleteService = async (id: string) => {
    if (!shop || !confirm('Delete this service?')) return
    await api.delete(`/shops/${shop.id}/services/${id}`)
    setServices((prev) => prev.filter((s) => s.id !== id))
  }

  if (!shop) return <div className="min-h-screen flex items-center justify-center text-gray-400">Set up your shop first</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-primary mb-6">Services</h1>

      {/* Form */}
      <div className="card p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">{editId ? 'Edit service' : 'Add new service'}</h2>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
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
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editId ? 'Update' : 'Add service'}</button>
            {editId && <button type="button" onClick={cancelEdit} className="btn-outline">Cancel</button>}
          </div>
        </form>
      </div>

      {/* List */}
      {services.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No services yet — add your first one above</div>
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <div key={s.id} className={`card p-4 flex items-center justify-between gap-4 ${!s.isActive ? 'opacity-60' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{s.name}</p>
                  {!s.isActive && <span className="badge bg-gray-100 text-gray-500 text-xs">Hidden</span>}
                </div>
                {s.description && <p className="text-gray-400 text-sm">{s.description}</p>}
                <p className="text-gray-400 text-xs mt-0.5">{s.duration} min</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-primary">${s.price}</p>
                <div className="flex gap-2 mt-2 justify-end">
                  <button onClick={() => startEdit(s)} className="text-xs text-blue-500 hover:underline">Edit</button>
                  <button onClick={() => toggleActive(s)} className="text-xs text-gray-500 hover:underline">{s.isActive ? 'Hide' : 'Show'}</button>
                  <button onClick={() => deleteService(s.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
