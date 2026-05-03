import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { Appointment, AppointmentStatus } from '../types'

const statusColors: Record<AppointmentStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
}

const CANCELLATION_NOTICE_HOURS = 3
const CANCELLATION_FEE_RATIO = 0.5

function hoursUntil(date: string, time: string): number {
  return (new Date(`${date}T${time}:00`).getTime() - Date.now()) / (1000 * 60 * 60)
}

function feeFor(price?: number) {
  if (!price) return 0
  return Math.round(price * CANCELLATION_FEE_RATIO * 100) / 100
}

export default function CustomerBookings() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<AppointmentStatus | 'ALL'>('ALL')
  const [pendingCancel, setPendingCancel] = useState<Appointment | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    api.get('/appointments').then((r) => setAppointments(r.data)).finally(() => setLoading(false))
  }, [])

  const confirmCancel = async () => {
    if (!pendingCancel) return
    setCancelling(true)
    try {
      await api.put(`/appointments/${pendingCancel.id}/status`, { status: 'CANCELLED' })
      setAppointments((prev) => prev.map((a) => a.id === pendingCancel.id ? { ...a, status: 'CANCELLED' } : a))
      setPendingCancel(null)
    } finally {
      setCancelling(false)
    }
  }

  const filtered = filter === 'ALL' ? appointments : appointments.filter((a) => a.status === filter)

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-primary mb-6">My Bookings</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium">No bookings found</p>
          <Link to="/" className="btn-primary mt-4 inline-block text-sm">Browse barbershops</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((appt) => {
            const hrs = hoursUntil(appt.date, appt.time)
            const isLate = hrs < CANCELLATION_NOTICE_HOURS && hrs > -1
            const fee = feeFor(appt.service?.price)
            return (
              <div key={appt.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    {appt.shop?.coverImage ? (
                      <img src={appt.shop.coverImage} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center text-2xl text-primary/30 shrink-0">✂</div>
                    )}
                    <div>
                      <Link to={`/shops/${appt.shopId}`} className="font-semibold text-primary hover:underline">{appt.shop?.name}</Link>
                      <p className="text-gray-500 text-sm">{appt.shop?.address}</p>
                      <p className="text-gray-700 text-sm mt-1">{appt.service?.name} — <span className="font-medium">${appt.service?.price}</span></p>
                      <p className="text-gray-400 text-sm">{appt.service?.duration} min</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`badge ${statusColors[appt.status]}`}>{appt.status}</span>
                    <p className="text-sm font-medium mt-2">{new Date(appt.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    <p className="text-sm text-gray-500">{appt.time}</p>
                  </div>
                </div>
                {appt.notes && <p className="text-sm text-gray-500 mt-3 border-t pt-3">📝 {appt.notes}</p>}
                {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                  <div className="mt-3 flex items-center justify-between flex-wrap gap-2 border-t pt-3">
                    {isLate ? (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                        ⚠ Less than {CANCELLATION_NOTICE_HOURS}h notice — cancellation fee applies
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">Free cancellation up to {CANCELLATION_NOTICE_HOURS}h before</p>
                    )}
                    <button
                      onClick={() => setPendingCancel(appt)}
                      className={`text-sm font-medium hover:underline ${isLate ? 'text-amber-700 hover:text-amber-900' : 'text-red-500 hover:text-red-700'}`}
                    >
                      {isLate ? `Cancel ($${fee.toFixed(2)} fee)` : 'Cancel appointment'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Cancellation confirmation modal */}
      {pendingCancel && (() => {
        const hrs = hoursUntil(pendingCancel.date, pendingCancel.time)
        const isLate = hrs < CANCELLATION_NOTICE_HOURS && hrs > -1
        const fee = feeFor(pendingCancel.service?.price)
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !cancelling && setPendingCancel(null)}>
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-primary mb-2">Cancel appointment?</h3>
              <p className="text-sm text-gray-600 mb-4">
                {pendingCancel.shop?.name} — {pendingCancel.service?.name}<br />
                {new Date(pendingCancel.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {pendingCancel.time}
              </p>

              {isLate ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <p className="font-semibold text-amber-900 text-sm">⚠ Late cancellation fee applies</p>
                  <p className="text-sm text-amber-800 mt-1">
                    Your appointment is in less than {CANCELLATION_NOTICE_HOURS} hours. A fee of{' '}
                    <span className="font-semibold">${fee.toFixed(2)}</span> ({Math.round(CANCELLATION_FEE_RATIO * 100)}% of the service price) will be charged.
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-800">
                    ✓ Free cancellation — your appointment is more than {CANCELLATION_NOTICE_HOURS} hours away.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setPendingCancel(null)} disabled={cancelling} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm">
                  Keep appointment
                </button>
                <button onClick={confirmCancel} disabled={cancelling} className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm text-white ${isLate ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-500 hover:bg-red-600'}`}>
                  {cancelling ? 'Cancelling...' : isLate ? `Cancel & pay $${fee.toFixed(2)}` : 'Confirm cancellation'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
