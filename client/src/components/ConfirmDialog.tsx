// Reusable confirmation modal used for destructive / commitment actions.
// Replace ad-hoc `confirm()` calls so users always get a proper "Are you sure?" step.
interface Props {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** 'danger' uses red CTA, 'primary' uses brand color */
  tone?: 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  tone = 'primary', loading = false,
  onConfirm, onCancel,
}: Props) {
  if (!open) return null
  const confirmClasses = tone === 'danger'
    ? 'bg-red-500 hover:bg-red-600 text-white'
    : 'bg-primary hover:bg-primary/90 text-white'
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !loading && onCancel()}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-primary mb-2">{title}</h3>
        {message && <p className="text-sm text-gray-600 mb-5">{message}</p>}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 ${confirmClasses}`}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
