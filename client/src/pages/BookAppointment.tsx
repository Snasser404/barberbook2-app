import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import api from '../api/client'
import { BarberShop, Service } from '../types'

export default function BookAppointment() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedService = searchParams.get('serviceId')

  const [shop, setShop] = useState<BarberShop | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    api.get(`/shops/${id}`).then((r) => {
      setShop(r.data)
      if (preselectedService) {
        const svc = r.data.services?.find((s: Service) => s.id === preselectedService)
        if (svc) setSelectedService(svc)
      }
    }).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!selectedService || !date) return
    setSlotsLoading(true)
    setSelectedSlot('')
    api.get(`/shops/${id}/availability`, { params: { date, serviceId: selectedService.id } })
      .then((r) => setSlots(r.data.slots))
      .finally(() => setSlotsLoading(false))
  }, [selectedService, date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedService || !date || !selectedSlot) return
    setSubmitting(true)
    setError('')
    try {
      await api.post('/appointments', {
        shopId: id,
        serviceId: selectedService.id,
        date,
        time: selectedSlot,
        notes: notes || undefined,
      })
      navigate('/bookings')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
  if (!shop) return <div className="text-center py-20">Shop not found</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to={`/shops/${id}`} className="text-gray-500 hover:text-gray-700 text-sm mb-4 inline-block">← Back to {shop.name}</Link>
      <h1 className="text-2xl font-bold text-primary mb-6">Book an appointment</h1>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Service selection */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">1. Choose a service</h2>
          <div className="space-y-2">
            {shop.services?.map((s) => (
              <label key={s.id} className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${selectedService?.id === s.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="service" className="hidden" checked={selectedService?.id === s.id} onChange={() => setSelectedService(s)} />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedService?.id === s.id ? 'border-primary' : 'border-gray-300'}`}>
                    {selectedService?.id === s.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.duration} min</p>
                  </div>
                </div>
                <span className="font-semibold text-primary">${s.price}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Date selection */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">2. Pick a date</h2>
          <input
            type="date"
            className="input"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={!selectedService}
          />
          {!selectedService && <p className="text-xs text-gray-400 mt-1">Select a service first</p>}
        </div>

        {/* Time slot */}
        {date && selectedService && (
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3">3. Choose a time</h2>
            {slotsLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" /> Loading slots...</div>
            ) : slots.length === 0 ? (
              <p className="text-gray-400 text-sm">No available slots for this date. Try another day.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 rounded-lg text-sm font-medium border-2 transition-colors ${selectedSlot === slot ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-700 hover:border-primary hover:text-primary'}`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {selectedSlot && (
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3">4. Any notes? (optional)</h2>
            <textarea className="input resize-none" rows={3} placeholder="E.g. reference photo, specific style notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        )}

        {/* Summary + submit */}
        {selectedService && date && selectedSlot && (
          <div className="card p-5 bg-primary/5 border-primary/20">
            <h3 className="font-semibold text-gray-900 mb-2">Booking summary</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Shop:</span> {shop.name}</p>
              <p><span className="font-medium">Service:</span> {selectedService.name}</p>
              <p><span className="font-medium">Date:</span> {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><span className="font-medium">Time:</span> {selectedSlot}</p>
            </div>

            <div className="mt-4 pt-4 border-t border-primary/20 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{selectedService.name}</span>
                <span>${selectedService.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span className="flex items-center gap-1">
                  Booking fee
                  <span className="text-xs text-gray-400" title="Helps us keep BarberBook running">ⓘ</span>
                </span>
                <span>$1.00</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 pt-1.5 border-t border-primary/10">
                <span>Total</span>
                <span>${(selectedService.price + 1).toFixed(2)}</span>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary mt-4 w-full py-2.5">
              {submitting ? 'Confirming...' : `Confirm & pay $${(selectedService.price + 1).toFixed(2)}`}
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">You'll pay at the shop. The $1 booking fee is collected by BarberBook.</p>

            <div className="mt-3 text-xs text-gray-500 bg-white/60 rounded-lg p-3 border border-gray-200">
              <p className="font-semibold text-gray-700 mb-0.5">Cancellation policy</p>
              <p>Free cancellation up to <span className="font-medium">3 hours</span> before your appointment. Late cancellations are charged 50% of the service price (${(selectedService.price * 0.5).toFixed(2)}).</p>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
