// Shop verification widget for the owner's Edit Shop page.
// Shows current status, lets owner upload supporting documents,
// and surfaces admin rejection reasons so they know what to fix.
import { useRef, useState, useEffect } from 'react'
import api from '../api/client'
import { BarberShop, VerificationDoc } from '../types'

const DOC_TYPES = [
  { value: 'BUSINESS_LICENSE', label: 'Business license' },
  { value: 'ID', label: 'Government-issued ID' },
  { value: 'UTILITY_BILL', label: 'Utility bill (proof of address)' },
  { value: 'OTHER', label: 'Other' },
] as const

interface Props {
  shop: BarberShop
}

export default function ShopVerificationPanel({ shop }: Props) {
  const [docs, setDocs] = useState<VerificationDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [docType, setDocType] = useState<typeof DOC_TYPES[number]['value']>('BUSINESS_LICENSE')
  const [caption, setCaption] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get(`/shops/${shop.id}/verification-docs`)
      .then((r) => setDocs(r.data))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }, [shop.id])

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('documentType', docType)
      if (caption) fd.append('caption', caption)
      const { data } = await api.post(`/shops/${shop.id}/verification-docs`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setDocs((prev) => [data, ...prev])
      setCaption('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const remove = async (doc: VerificationDoc) => {
    if (!confirm('Remove this document?')) return
    await api.delete(`/shops/${shop.id}/verification-docs/${doc.id}`)
    setDocs((prev) => prev.filter((d) => d.id !== doc.id))
  }

  const status = shop.verificationStatus || 'PENDING'

  return (
    <div className="card p-6">
      <h2 className="font-semibold text-gray-900 mb-2">Shop verification</h2>
      <p className="text-xs text-gray-500 mb-4">
        We verify that real businesses own their listings. Upload documents proving ownership and our team reviews them within 1-2 business days.
        Until verified, your shop is hidden from public search.
      </p>

      {/* Status banner */}
      {status === 'VERIFIED' && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
          <p className="font-semibold">✓ Verified</p>
          <p className="text-sm">Your shop is verified and visible to customers.</p>
        </div>
      )}
      {status === 'PENDING' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-4">
          <p className="font-semibold">⏳ Pending review</p>
          <p className="text-sm">
            {docs.length === 0
              ? 'Upload at least one document below to start the review process.'
              : 'Our team is reviewing your documents. You\'ll be notified when the review is complete.'}
          </p>
        </div>
      )}
      {status === 'REJECTED' && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
          <p className="font-semibold">⚠ Verification rejected</p>
          {shop.verificationNotes && <p className="text-sm mt-1"><strong>Reason:</strong> {shop.verificationNotes}</p>}
          <p className="text-sm mt-1">Upload a new document below to be reviewed again.</p>
        </div>
      )}

      {/* Upload form (hidden once verified) */}
      {status !== 'VERIFIED' && (
        <div className="border-t pt-4 mb-4">
          <h3 className="font-medium text-sm text-gray-900 mb-2">Upload a document</h3>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-2">{error}</div>}
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Document type</label>
              <select className="input text-sm" value={docType} onChange={(e) => setDocType(e.target.value as any)}>
                {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Note (optional)</label>
              <input className="input text-sm" placeholder="e.g. License issued 2022" value={caption} onChange={(e) => setCaption(e.target.value)} />
            </div>
            <label className={`btn-outline text-sm cursor-pointer block text-center ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {uploading ? 'Uploading…' : '+ Upload document'}
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={upload} disabled={uploading} />
            </label>
            <p className="text-xs text-gray-400">JPG, PNG, WebP or PDF. Max 5MB.</p>
          </div>
        </div>
      )}

      {/* Uploaded docs */}
      <div>
        <h3 className="font-medium text-sm text-gray-900 mb-2">Uploaded documents ({docs.length})</h3>
        {loading ? (
          <p className="text-xs text-gray-400">Loading…</p>
        ) : docs.length === 0 ? (
          <p className="text-xs text-gray-400">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => {
              const typeLabel = DOC_TYPES.find((t) => t.value === d.documentType)?.label || d.documentType
              const isImage = !d.url.toLowerCase().endsWith('.pdf')
              return (
                <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg border border-gray-200">
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    {isImage ? (
                      <img src={d.url} alt="" className="w-14 h-14 rounded object-cover bg-gray-100" />
                    ) : (
                      <div className="w-14 h-14 rounded bg-red-50 flex items-center justify-center text-red-600 text-xs font-semibold">PDF</div>
                    )}
                  </a>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{typeLabel}</p>
                    {d.caption && <p className="text-xs text-gray-500">{d.caption}</p>}
                    <p className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</p>
                  </div>
                  {status !== 'VERIFIED' && (
                    <button onClick={() => remove(d)} className="text-xs text-red-500 hover:underline shrink-0">Remove</button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
