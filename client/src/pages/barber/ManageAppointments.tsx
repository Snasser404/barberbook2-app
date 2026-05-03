import { useState, useEffect } from 'react'
import api from '../../api/client'
import { Appointment, AppointmentStatus } from '../../types'

const statusColors: Record<AppointmentStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
}

export default function ManageAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<AppointmentStatus | 'ALL' | 'TODAY'>('TODAY')
  const [updating, setUpdating] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    api.get('/appointments').then((r) => setAppointments(r.data)).finally(() => setLoading(false))
  }, [])

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    setUpdating(id)
    try {
      const { data } = await api.put(`/appointments/${id}/status`, { status })
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: data.status } : a))
    } finally {
      setUpdating(null)
    }
  }

  const filtered = appointments.filter((a) => {
    if (filter === 'TODAY') return a.date === today
    if (filter === 'ALL') return true
    return a.status === filter
  })

  const grouped = filtered.reduce((acc, appt) => {
    acc[appt.date] = [...(acc[appt.date] || []), appt]
    return acc
  }, {} as Record<string, Appointment[]>)

  const sortedDates = Object.keys(grouped).sort()

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-primary mb-6">Appointments</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(['TODAY', 'ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {s === 'TODAY' ? "Today" : s.charAt(0) + s.slice(1).toLowerCase()}
            {s === 'PENDING' && appointments.filter((a) => a.status === 'PENDING').length > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5">{appointments.filter((a) => a.status === 'PENDING').length}</span>
            )}
          </button>
        ))}
      </div>

      {sortedDates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium">No appointments found</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map((date) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {date === today ? '📅 Today' : new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h2>
              <div className="space-y-3">
                {grouped[date].sort((a, b) => a.time.localeCompare(b.time)).map((appt) => (
                  <div key={appt.id} className="card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                          {appt.customer?.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{appt.customer?.name}</p>
                          {appt.customer?.phone && <p className="text-gray-400 text-xs">{appt.customer.phone}</p>}
                          <p className="text-gray-600 text-sm mt-0.5">{appt.service?.name} — {appt.service?.duration}min — <span className="font-medium">${appt.service?.price}</span></p>
                          {appt.notes && <p className="text-gray-400 text-xs mt-1 italic">"{appt.notes}"</p>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold">{appt.time}</p>
                        <span className={`badge ${statusColors[appt.status]} mt-1`}>{appt.status}</span>
                      </div>
                    </div>

                    {appt.status === 'PENDING' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <button
                          onClick={() => updateStatus(appt.id, 'CONFIRMED')}
                          disabled={updating === appt.id}
                          className="flex-1 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => updateStatus(appt.id, 'CANCELLED')}
                          disabled={updating === appt.id}
                          className="flex-1 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {appt.status === 'CONFIRMED' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <button
                          onClick={() => updateStatus(appt.id, 'COMPLETED')}
                          disabled={updating === appt.id}
                          className="flex-1 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                          Mark completed
                        </button>
                        <button
                          onClick={() => updateStatus(appt.id, 'CANCELLED')}
                          disabled={updating === appt.id}
                          className="flex-1 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
