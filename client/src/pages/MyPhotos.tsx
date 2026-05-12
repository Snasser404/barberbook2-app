import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { CustomerPhoto, PhotoType, Appointment } from '../types'

export default function MyPhotos() {
  const [photos, setPhotos] = useState<CustomerPhoto[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<PhotoType | 'ALL'>('ALL')
  const [showUpload, setShowUpload] = useState(false)
  const [editing, setEditing] = useState<CustomerPhoto | null>(null)
  const [uploadForm, setUploadForm] = useState<{ file: File | null; caption: string; type: PhotoType; appointmentId: string }>({
    file: null, caption: '', type: 'INSPIRATION', appointmentId: '',
  })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [p, a] = await Promise.all([api.get('/photos'), api.get('/appointments')])
      setPhotos(p.data)
      setAppointments(a.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'ALL' ? photos : photos.filter((p) => p.type === filter)

  const upload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadForm.file) { setError('Pick a photo first'); return }
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('photo', uploadForm.file)
      fd.append('caption', uploadForm.caption)
      fd.append('type', uploadForm.type)
      if (uploadForm.appointmentId) fd.append('appointmentId', uploadForm.appointmentId)
      const { data } = await api.post('/photos', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setPhotos((prev) => [data, ...prev])
      setShowUpload(false)
      setUploadForm({ file: null, caption: '', type: 'INSPIRATION', appointmentId: '' })
      if (fileRef.current) fileRef.current.value = ''
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const updatePhoto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    try {
      const { data } = await api.put(`/photos/${editing.id}`, {
        caption: editing.caption,
        type: editing.type,
        appointmentId: editing.appointmentId || null,
      })
      setPhotos((prev) => prev.map((p) => p.id === editing.id ? data : p))
      setEditing(null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Update failed')
    }
  }

  const remove = async (p: CustomerPhoto) => {
    if (!confirm('Delete this photo? It will also be removed from any appointment it\'s attached to.')) return
    await api.delete(`/photos/${p.id}`)
    setPhotos((prev) => prev.filter((x) => x.id !== p.id))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">My photos</h1>
          <p className="text-gray-500 text-sm">Build your haircut history and share inspiration with your barber</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary text-sm">+ Add photo</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['ALL', 'INSPIRATION', 'COMPLETED'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === t ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {t === 'ALL' ? 'All' : t === 'INSPIRATION' ? '💡 Inspiration' : '✂ History'}
            <span className="ml-1.5 opacity-70 text-xs">
              ({t === 'ALL' ? photos.length : photos.filter((p) => p.type === t).length})
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 card">
          <p className="text-5xl mb-3">📷</p>
          <p className="font-medium text-gray-600">No photos yet</p>
          <p className="text-sm mt-1">Add inspiration shots or photos of cuts you've gotten — share them with your barber too.</p>
          <button onClick={() => setShowUpload(true)} className="btn-primary mt-4 text-sm">+ Add your first photo</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="card overflow-hidden group">
              <div className="aspect-square bg-gray-100 relative">
                <img src={p.url} alt={p.caption || ''} className="w-full h-full object-cover" />
                <span className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full ${p.type === 'INSPIRATION' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                  {p.type === 'INSPIRATION' ? '💡' : '✂'} {p.type === 'INSPIRATION' ? 'Inspiration' : 'History'}
                </span>
                {p.appointmentId && (
                  <span className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">📨 Shared</span>
                )}
              </div>
              <div className="p-3">
                {p.caption && <p className="text-sm text-gray-700 line-clamp-2">{p.caption}</p>}
                {p.appointment && (
                  <p className="text-xs text-gray-500 mt-1">
                    {p.type === 'INSPIRATION' ? 'For' : 'Cut at'} <Link to={`/shops/${p.appointment.shop?.id}`} className="text-primary hover:underline">{p.appointment.shop?.name}</Link>
                    {p.appointment.staff && <> with {p.appointment.staff.name}</>}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">{new Date(p.createdAt).toLocaleDateString()}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setEditing(p)} className="text-xs text-primary hover:underline">Edit</button>
                  <button onClick={() => remove(p)} className="text-xs text-red-500 hover:underline ml-auto">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !uploading && setShowUpload(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-primary mb-4">Add a photo</h3>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <form onSubmit={upload} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo *</label>
                <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })} className="input" required />
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, or WebP. Max 5MB.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['INSPIRATION', 'COMPLETED'] as PhotoType[]).map((t) => (
                    <button key={t} type="button" onClick={() => setUploadForm({ ...uploadForm, type: t })}
                      className={`py-2 rounded-lg text-sm font-medium border-2 transition-colors ${uploadForm.type === t ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600'}`}>
                      {t === 'INSPIRATION' ? '💡 Inspiration' : '✂ History'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
                <textarea className="input resize-none" rows={2} value={uploadForm.caption} onChange={(e) => setUploadForm({ ...uploadForm, caption: e.target.value })} placeholder="What is this haircut? Any details to share?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attach to {uploadForm.type === 'INSPIRATION' ? 'an upcoming' : 'a past'} appointment? (share with barber)
                </label>
                <select className="input" value={uploadForm.appointmentId} onChange={(e) => setUploadForm({ ...uploadForm, appointmentId: e.target.value })}>
                  <option value="">— No, just save to my library —</option>
                  {/* INSPIRATION photos can only be attached to upcoming visits */}
                  {/* HISTORY photos can only be attached to completed visits */}
                  {appointments
                    .filter((a) => uploadForm.type === 'INSPIRATION'
                      ? (a.status === 'PENDING' || a.status === 'CONFIRMED')
                      : a.status === 'COMPLETED')
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.shop?.name} · {a.date} {a.time}{a.staff ? ` · ${a.staff.name}` : ''}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">{uploadForm.type === 'INSPIRATION' ? 'Send this to your barber as inspiration before your visit.' : 'Tag this as the cut you got at this appointment.'}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowUpload(false)} disabled={uploading} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button type="submit" disabled={uploading} className="flex-1 btn-primary text-sm">{uploading ? 'Uploading...' : 'Add photo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-primary mb-4">Edit photo</h3>
            <img src={editing.url} alt="" className="w-full max-h-64 object-contain rounded-lg mb-3 bg-gray-100" />
            <form onSubmit={updatePhoto} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['INSPIRATION', 'COMPLETED'] as PhotoType[]).map((t) => (
                    <button key={t} type="button" onClick={() => setEditing({ ...editing, type: t })}
                      className={`py-2 rounded-lg text-sm font-medium border-2 transition-colors ${editing.type === t ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600'}`}>
                      {t === 'INSPIRATION' ? '💡 Inspiration' : '✂ History'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
                <textarea className="input resize-none" rows={2} value={editing.caption || ''} onChange={(e) => setEditing({ ...editing, caption: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attached to</label>
                <select className="input" value={editing.appointmentId || ''} onChange={(e) => setEditing({ ...editing, appointmentId: e.target.value || null })}>
                  <option value="">— Not attached —</option>
                  {appointments
                    .filter((a) => editing.type === 'INSPIRATION'
                      ? (a.status === 'PENDING' || a.status === 'CONFIRMED')
                      : a.status === 'COMPLETED')
                    .map((a) => (
                      <option key={a.id} value={a.id}>{a.shop?.name} · {a.date} {a.time}{a.staff ? ` · ${a.staff.name}` : ''}</option>
                    ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Inspiration photos can only be attached to upcoming visits.</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button type="submit" className="flex-1 btn-primary text-sm">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
