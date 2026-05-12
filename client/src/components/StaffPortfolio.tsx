// Portfolio gallery for a barber — shows their work.
// Read-only mode: shown on public Staff profile.
// Editable mode: shown on Staff Dashboard for the barber themselves (or shop owner via Manage Staff).
import { useEffect, useRef, useState } from 'react'
import api from '../api/client'
import { StaffPortfolioPhoto } from '../types'

interface Props {
  staffId: string
  /** If true, shows the upload + delete controls. */
  editable?: boolean
}

export default function StaffPortfolio({ staffId, editable = false }: Props) {
  const [photos, setPhotos] = useState<StaffPortfolioPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState<StaffPortfolioPhoto | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get(`/staff/${staffId}/portfolio`)
      .then((r) => setPhotos(r.data))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false))
  }, [staffId])

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const { data } = await api.post(`/staff/${staffId}/portfolio`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setPhotos((prev) => [data, ...prev])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const remove = async (p: StaffPortfolioPhoto) => {
    if (!confirm('Remove this photo from your portfolio?')) return
    await api.delete(`/staff/${staffId}/portfolio/${p.id}`)
    setPhotos((prev) => prev.filter((x) => x.id !== p.id))
  }

  if (loading) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Portfolio</h3>
        {editable && (
          <label className={`btn-outline text-xs cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {uploading ? 'Uploading…' : '+ Add photo'}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} disabled={uploading} />
          </label>
        )}
      </div>
      {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

      {photos.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm card">
          <p className="text-3xl mb-1">📷</p>
          <p>{editable ? 'Show off your work — add photos of your favorite cuts.' : 'No portfolio photos yet.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
              <button type="button" onClick={() => setLightbox(p)} className="block w-full h-full">
                <img src={p.url} alt={p.caption || ''} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </button>
              {editable && (
                <button
                  type="button"
                  onClick={() => remove(p)}
                  className="absolute top-1 right-1 bg-red-500/90 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setLightbox(null)}>
          <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.url} alt="" className="w-full max-h-[80vh] object-contain rounded-lg" />
            {lightbox.caption && <p className="text-white text-center mt-2 text-sm">{lightbox.caption}</p>}
            <button onClick={() => setLightbox(null)} className="mt-2 mx-auto block px-4 py-2 rounded-lg bg-white text-primary text-sm font-medium">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
