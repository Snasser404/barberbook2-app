import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { BarberShop, ShopImage } from '../../types'
import AvatarUploader from '../../components/AvatarUploader'
import LocationPicker from '../../components/LocationPicker'

export default function ManageShop() {
  const navigate = useNavigate()
  const [shop, setShop] = useState<BarberShop | null>(null)
  const [form, setForm] = useState({ name: '', address: '', description: '', phone: '', openingTime: '09:00', closingTime: '18:00', latitude: null as number | null, longitude: null as number | null, logo: null as string | null })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get('/shops/mine').then((r) => {
      if (r.data) {
        setShop(r.data)
        const { name, address, description, phone, openingTime, closingTime, latitude, longitude, logo } = r.data
        setForm({ name, address, description: description || '', phone: phone || '', openingTime, closingTime, latitude: latitude ?? null, longitude: longitude ?? null, logo: logo ?? null })
      }
    }).catch(() => {})
  }, [])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    // Client-side guard against same-time / inverted hours
    if (form.openingTime && form.closingTime) {
      if (form.openingTime === form.closingTime) {
        setError('Opening and closing times cannot be the same')
        setSaving(false)
        return
      }
      if (form.openingTime >= form.closingTime) {
        setError('Closing time must be after opening time')
        setSaving(false)
        return
      }
    }

    try {
      if (shop) {
        const { data } = await api.put(`/shops/${shop.id}`, form)
        setShop({ ...shop, ...data })
      } else {
        const { data } = await api.post('/shops', form)
        setShop(data)
        navigate('/barber')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length || !shop) return
    setUploading(true)
    const formData = new FormData()
    Array.from(files).forEach((f) => formData.append('images', f))
    try {
      const { data } = await api.post(`/shops/${shop.id}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setShop((prev) => prev ? { ...prev, images: [...(prev.images || []), ...data] } : prev)
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      setError('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const setCover = async (url: string) => {
    if (!shop) return
    await api.put(`/shops/${shop.id}/cover`, { coverImage: url })
    setShop((prev) => prev ? { ...prev, coverImage: url } : prev)
  }

  const deleteImage = async (imageId: string) => {
    if (!shop || !confirm('Remove this photo?')) return
    await api.delete(`/shops/${shop.id}/images/${imageId}`)
    setShop((prev) => prev ? { ...prev, images: prev.images?.filter((i) => i.id !== imageId) } : prev)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-primary mb-6">{shop ? 'Edit shop' : 'Create your shop'}</h1>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
      {saved && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">Saved!</div>}

      <form onSubmit={handleSubmit} className="card p-6 space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Shop logo</label>
          <AvatarUploader
            value={form.logo}
            onChange={(url) => setForm({ ...form, logo: url })}
            fallback="✂"
            shape="square"
            size={88}
          />
          <p className="text-xs text-gray-500 mt-2">Square image shown next to your shop name. Use the photos section below for cover banner & gallery.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shop name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
          <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className="input resize-none" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tell customers about your shop..." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opening time</label>
            <input type="time" className="input" value={form.openingTime} onChange={(e) => setForm({ ...form, openingTime: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Closing time</label>
            <input type="time" className="input" value={form.closingTime} onChange={(e) => setForm({ ...form, closingTime: e.target.value })} />
          </div>
        </div>

        {/* Location */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Shop location 📍</label>
          <p className="text-xs text-gray-500 mb-3">Search for your shop, click on the map, or use your current location. The address field above updates automatically to match the pin.</p>
          <LocationPicker
            initialLat={form.latitude}
            initialLng={form.longitude}
            initialAddress={form.address}
            onChange={(loc) => setForm((f) => ({ ...f, latitude: loc.lat, longitude: loc.lng, address: loc.address || f.address }))}
          />
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving...' : shop ? 'Save changes' : 'Create shop'}
        </button>
      </form>

      {/* Photo management */}
      {shop && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Shop photos</h2>
            <label className={`btn-outline text-sm cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {uploading ? 'Uploading...' : '+ Add photos'}
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </div>
          <p className="text-xs text-gray-400 mb-4">Click on a photo to set it as the cover image</p>
          {!shop.images?.length ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400">
              <p className="text-3xl mb-2">📷</p>
              <p className="text-sm">No photos yet — upload some to showcase your work</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {shop.images.map((img: ShopImage) => (
                <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  {shop.coverImage === img.url && (
                    <span className="absolute top-1 left-1 badge bg-accent text-primary text-xs">Cover</span>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {shop.coverImage !== img.url && (
                      <button onClick={() => setCover(img.url)} className="bg-white text-primary text-xs px-2 py-1 rounded font-medium">Set cover</button>
                    )}
                    <button onClick={() => deleteImage(img.id)} className="bg-red-500 text-white text-xs px-2 py-1 rounded font-medium">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
