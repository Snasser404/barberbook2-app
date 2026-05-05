import { useRef, useState } from 'react'
import api from '../api/client'

interface Props {
  /** Current image URL (or null) */
  value: string | null | undefined
  /** Called with the new uploaded URL or null when removed */
  onChange: (url: string | null) => void
  /** Fallback text shown inside the placeholder bubble (e.g. user initial) */
  fallback?: string
  /** Pixel size (width=height); default 96 */
  size?: number
  /** Render as 'circle' (avatar) or 'square' (logo); default 'circle' */
  shape?: 'circle' | 'square'
  /** Optional label override for the upload button */
  uploadLabel?: string
}

export default function AvatarUploader({
  value,
  onChange,
  fallback = '?',
  size = 96,
  shape = 'circle',
  uploadLabel = 'Upload',
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-xl'

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large (max 5MB)')
      return
    }
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      onChange(data.url)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className={`${radius} bg-primary text-accent flex items-center justify-center font-bold shrink-0 overflow-hidden`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {value ? (
          <img src={value} alt="" className="w-full h-full object-cover" />
        ) : (
          <span>{fallback}</span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <input ref={fileRef} type="file" accept="image/*" onChange={upload} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : value ? 'Change' : uploadLabel}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={uploading}
            className="px-3 py-1 text-xs text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  )
}
