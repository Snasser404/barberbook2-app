import { useState, useEffect } from 'react'
import api from '../api/client'
import { CustomerPhoto } from '../types'

interface Props {
  appointmentId: string
  /** Optional override label (e.g. "Photos from customer"). Defaults to "Shared photos" */
  label?: string
}

export default function AppointmentPhotos({ appointmentId, label = 'Shared photos' }: Props) {
  const [photos, setPhotos] = useState<CustomerPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<CustomerPhoto | null>(null)

  useEffect(() => {
    api.get(`/photos/appointment/${appointmentId}`)
      .then((r) => setPhotos(r.data))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false))
  }, [appointmentId])

  if (loading) return null
  if (photos.length === 0) return null

  return (
    <>
      <div className="mt-3 pt-3 border-t">
        <p className="text-xs text-gray-500 mb-2">📨 {label} ({photos.length})</p>
        <div className="flex gap-2 flex-wrap">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setLightbox(p)}
              className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 hover:ring-2 hover:ring-primary transition-all group"
            >
              <img src={p.url} alt={p.caption || ''} className="w-full h-full object-cover" />
              <span className={`absolute top-0.5 left-0.5 text-[9px] font-semibold px-1 rounded ${p.type === 'INSPIRATION' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                {p.type === 'INSPIRATION' ? '💡' : '✂'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setLightbox(null)}>
          <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.url} alt="" className="w-full max-h-[70vh] object-contain rounded-lg" />
            <div className="bg-white rounded-lg p-3 mt-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lightbox.type === 'INSPIRATION' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                {lightbox.type === 'INSPIRATION' ? '💡 Inspiration' : '✂ History'}
              </span>
              {lightbox.caption && <p className="text-sm text-gray-700 mt-2">{lightbox.caption}</p>}
              <p className="text-xs text-gray-400 mt-1">{new Date(lightbox.createdAt).toLocaleDateString()}</p>
              <button onClick={() => setLightbox(null)} className="mt-2 w-full px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
