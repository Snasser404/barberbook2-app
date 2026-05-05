import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import { BarberShop, Appointment, Review } from '../../types'
import StarRating from '../../components/StarRating'

export default function BarberDashboard() {
  const [shop, setShop] = useState<BarberShop | null | undefined>(undefined)
  const [upcoming, setUpcoming] = useState<Appointment[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [showProModal, setShowProModal] = useState(false)

  useEffect(() => {
    api.get('/shops/mine').then((r) => {
      setShop(r.data)
      if (r.data?.id) {
        api.get(`/shops/${r.data.id}/reviews`).then((rev) => setReviews(rev.data.slice(0, 3)))
      }
    }).catch(() => setShop(null))
    api.get('/appointments').then((r) => {
      const today = new Date().toISOString().split('T')[0]
      setUpcoming(r.data.filter((a: Appointment) => a.date >= today && (a.status === 'PENDING' || a.status === 'CONFIRMED')).slice(0, 5))
    })
  }, [])

  if (shop === undefined) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  if (!shop) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <span className="text-6xl">✂</span>
        <h1 className="text-2xl font-bold text-primary mt-4">Set up your shop</h1>
        <p className="text-gray-500 mt-2">Create your barbershop profile to start accepting bookings</p>
        <Link to="/barber/shop" className="btn-accent mt-6 inline-block">Create my shop</Link>
      </div>
    )
  }

  const pendingCount = upcoming.filter((a) => a.status === 'PENDING').length

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">{shop.name}</h1>
          <p className="text-gray-500 text-sm">{shop.address}</p>
        </div>
        <Link to={`/shops/${shop.id}`} className="btn-outline text-sm">View public page →</Link>
      </div>

      {/* Pro upgrade banner */}
      <div className="mb-6 rounded-xl p-5 bg-gradient-to-r from-primary to-primary/80 text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider bg-accent text-primary px-2 py-0.5 rounded">Pro</span>
              <span className="text-sm text-white/70">Upgrade your shop</span>
            </div>
            <p className="font-semibold text-lg">Get more bookings with BarberBook Pro</p>
            <p className="text-sm text-white/70 mt-0.5">Featured listings · Automated SMS reminders · Analytics · No-show protection</p>
          </div>
          <button onClick={() => setShowProModal(true)} className="bg-accent text-primary font-semibold px-5 py-2.5 rounded-lg hover:bg-accent/90 transition-colors text-sm whitespace-nowrap">
            Upgrade — $29/mo
          </button>
        </div>
      </div>

      {/* Pro upgrade modal */}
      {showProModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowProModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider bg-accent text-primary px-2 py-0.5 rounded">Pro</span>
              <h3 className="text-xl font-bold text-primary">BarberBook Pro</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">Pro will unlock these features for $29/mo:</p>
            <ul className="space-y-2 text-sm text-gray-700 mb-5">
              <li>✓ Featured placement in search results</li>
              <li>✓ Automated SMS reminders to customers</li>
              <li>✓ Detailed booking & revenue analytics</li>
              <li>✓ Late cancellation auto-charging</li>
              <li>✓ Priority support</li>
            </ul>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg mb-4">
              ⚠ Payments not yet enabled — Pro is launching soon. We'll email you when it's live.
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowProModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm">
                Close
              </button>
              <button onClick={() => { alert('Got it — we\'ll let you know!'); setShowProModal(false) }} className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 font-semibold text-sm">
                Notify me when it launches
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon="⭐" label="Rating" value={shop.rating.toFixed(1)} sub={`${shop.reviewCount} reviews`} />
        <StatCard icon="✂" label="Services" value={String(shop.services?.length || 0)} sub="active" />
        <StatCard icon="🏷" label="Offers" value={String(shop.offers?.length || 0)} sub="running" />
        <StatCard icon="📅" label="Pending" value={String(pendingCount)} sub="appointments" highlight={pendingCount > 0} />
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { to: '/barber/shop', icon: '🏪', label: 'Edit Shop', desc: 'Profile, hours, photos, location' },
          { to: '/barber/staff', icon: '💈', label: 'Team', desc: 'Manage barbers & profiles' },
          { to: '/barber/services', icon: '✂', label: 'Services', desc: 'Manage your menu' },
          { to: '/barber/offers', icon: '🏷', label: 'Offers', desc: 'Promotions & discounts' },
          { to: '/barber/appointments', icon: '📅', label: 'Appointments', desc: 'View & manage bookings' },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="card p-4 hover:shadow-md transition-shadow">
            <span className="text-3xl">{item.icon}</span>
            <p className="font-semibold mt-2">{item.label}</p>
            <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* Upcoming appointments */}
      {upcoming.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Upcoming Appointments</h2>
            <Link to="/barber/appointments" className="text-sm text-primary hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {upcoming.map((appt) => (
              <div key={appt.id} className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {appt.customer?.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{appt.customer?.name}</p>
                    <p className="text-gray-400 text-xs">{appt.service?.name} — {appt.service?.duration}min</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{appt.date} at {appt.time}</p>
                  <span className={`badge text-xs ${appt.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{appt.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent reviews */}
      {reviews.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Recent Reviews</h2>
            <Link to={`/shops/${shop.id}?tab=reviews`} className="text-sm text-primary hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {reviews.map((review) => (
              <div key={review.id} className="card p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {review.customer?.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-sm">{review.customer?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} size="sm" />
                    <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {review.comment && <p className="text-gray-600 text-sm leading-relaxed mt-1">{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {reviews.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm border-t pt-8">
          <p className="text-3xl mb-2">⭐</p>
          <p>No reviews yet — they'll appear here once customers visit and review you.</p>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, sub, highlight }: { icon: string; label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className={`card p-4 ${highlight ? 'border-amber-300 bg-amber-50' : ''}`}>
      <span className="text-2xl">{icon}</span>
      <p className="text-2xl font-bold text-primary mt-1">{value}</p>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  )
}
