import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import { BarberShop, Review, Appointment, Staff } from '../types'
import StarRating from '../components/StarRating'
import { useAuth } from '../context/AuthContext'

type TabKey = 'services' | 'team' | 'gallery' | 'reviews'

export default function ShopDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [shop, setShop] = useState<BarberShop | null>(null)
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const initialTab = (searchParams.get('tab') as TabKey) || 'services'
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [isFavorite, setIsFavorite] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [hasCompletedAppt, setHasCompletedAppt] = useState(false)

  useEffect(() => {
    api.get(`/shops/${id}`)
      .then((r) => setShop(r.data))
      .finally(() => setLoading(false))
    api.get(`/shops/${id}/staff`).then((r) => setStaff(r.data)).catch(() => {})
    if (user?.role === 'CUSTOMER') {
      api.get('/favorites').then((r) => setIsFavorite(r.data.some((s: BarberShop) => s.id === id)))
      // Check if customer has completed an appointment at this shop (gates review submission)
      api.get('/appointments').then((r) => {
        const completed = r.data.some((a: Appointment) => a.shopId === id && a.status === 'COMPLETED')
        setHasCompletedAppt(completed)
      })
    }
  }, [id, user])

  const myReview = user?.role === 'CUSTOMER' && shop?.reviews?.find((r) => r.customerId === user.id)
  const canSubmitReview = user?.role === 'CUSTOMER' && hasCompletedAppt && !myReview

  const toggleFavorite = async () => {
    if (!user) { navigate('/login'); return }
    if (isFavorite) {
      await api.delete(`/favorites/${id}`)
      setIsFavorite(false)
    } else {
      await api.post(`/favorites/${id}`)
      setIsFavorite(true)
    }
  }

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { navigate('/login'); return }
    setSubmittingReview(true)
    setReviewError('')
    try {
      const { data } = await api.post(`/shops/${id}/reviews`, reviewForm)
      setShop((prev) => prev ? { ...prev, reviews: [data, ...(prev.reviews || [])], reviewCount: (prev.reviewCount || 0) + 1 } : prev)
      setReviewForm({ rating: 5, comment: '' })
    } catch (err: any) {
      setReviewError(err.response?.data?.error || 'Failed to submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
  if (!shop) return <div className="text-center py-20 text-gray-500">Shop not found</div>

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="w-full md:w-80 h-56 bg-gray-200 rounded-xl overflow-hidden shrink-0">
          {shop.coverImage ? (
            <img src={shop.coverImage} alt={shop.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10">
              <span className="text-6xl text-primary/30">✂</span>
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {shop.logo && <img src={shop.logo} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
              <h1 className="text-3xl font-bold text-primary">{shop.name}</h1>
            </div>
            {user?.role === 'CUSTOMER' && (
              <button onClick={toggleFavorite} className={`text-2xl transition-transform hover:scale-110 ${isFavorite ? 'text-red-500' : 'text-gray-300'}`}>
                {isFavorite ? '♥' : '♡'}
              </button>
            )}
          </div>
          <p className="text-gray-500 mt-1 flex items-center gap-1">📍 {shop.address}</p>
          {shop.phone && <p className="text-gray-500 mt-1">📞 {shop.phone}</p>}
          <p className="text-gray-500 mt-1">🕐 {shop.openingTime} – {shop.closingTime}</p>
          <div className="flex items-center gap-2 mt-2">
            <StarRating rating={Math.round(shop.rating)} size="md" />
            <span className="text-gray-600 font-medium">{shop.rating.toFixed(1)}</span>
            <span className="text-gray-400">({shop.reviewCount} reviews)</span>
          </div>
          {shop.description && <p className="text-gray-600 mt-3 leading-relaxed">{shop.description}</p>}

          {/* Offers banner */}
          {shop.offers && shop.offers.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {shop.offers.map((offer) => (
                <span key={offer.id} className="badge bg-accent/20 text-amber-800 text-sm py-1">
                  🏷 {offer.title} — {offer.discountPercent}% off
                </span>
              ))}
            </div>
          )}

          {user?.role === 'CUSTOMER' && (
            <Link to={`/shops/${shop.id}/book`} className="btn-accent mt-4 inline-block">
              Book appointment
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <div className="flex gap-6 min-w-max">
          {(['services', 'team', 'gallery', 'reviews'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              {tab} {tab === 'reviews' ? `(${shop.reviewCount})` : tab === 'gallery' ? `(${shop.images?.length || 0})` : tab === 'team' ? `(${staff.length})` : `(${shop.services?.length || 0})`}
            </button>
          ))}
        </div>
      </div>

      {/* Services */}
      {activeTab === 'services' && (
        <div className="grid sm:grid-cols-2 gap-4">
          {shop.services?.map((s) => {
            // Offers that apply to this specific service
            const linked = shop.offers?.filter((o) => o.serviceId === s.id) || []
            const discount = linked.length > 0 ? Math.max(...linked.map((o) => o.discountPercent)) : 0
            const discounted = discount ? Math.round(s.price * (100 - discount)) / 100 : null
            return (
              <div key={s.id} className="card p-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{s.name}</h3>
                    {s.description && <p className="text-gray-500 text-sm mt-0.5">{s.description}</p>}
                    <p className="text-gray-400 text-xs mt-1">{s.duration} min</p>
                  </div>
                  <div className="text-right">
                    {discounted !== null ? (
                      <div>
                        <span className="text-sm text-gray-400 line-through">${s.price}</span>
                        <span className="text-lg font-bold text-primary ml-1">${discounted}</span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-primary">${s.price}</span>
                    )}
                    {user?.role === 'CUSTOMER' && (
                      <Link to={`/shops/${shop.id}/book?serviceId=${s.id}`} className="block text-xs text-accent hover:underline mt-1">Book this</Link>
                    )}
                  </div>
                </div>
                {linked.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {linked.map((o) => (
                      <span key={o.id} className="badge bg-accent/20 text-amber-800 text-xs">🏷 {o.title} — {o.discountPercent}% off</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {!shop.services?.length && <p className="text-gray-400 col-span-2 text-center py-8">No services listed yet</p>}
        </div>
      )}

      {/* Team */}
      {activeTab === 'team' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.length === 0 ? (
            <p className="text-gray-400 col-span-3 text-center py-8">This shop hasn't added their team yet</p>
          ) : (
            staff.map((s) => (
              <Link key={s.id} to={`/staff/${s.id}`} className="card p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start gap-4">
                  {s.avatar ? (
                    <img src={s.avatar} alt={s.name} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary text-accent flex items-center justify-center text-2xl font-bold shrink-0">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">{s.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StarRating rating={Math.round(s.rating)} size="sm" />
                      <span className="text-xs text-gray-500">{s.rating.toFixed(1)} ({s.reviewCount})</span>
                    </div>
                    {s.specialties && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {s.specialties.split(',').slice(0, 3).map((sp) => (
                          <span key={sp} className="text-xs bg-accent/15 text-amber-800 px-2 py-0.5 rounded-full">{sp.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {s.bio && <p className="text-sm text-gray-500 mt-3 line-clamp-2">{s.bio}</p>}
              </Link>
            ))
          )}
        </div>
      )}

      {/* Gallery */}
      {activeTab === 'gallery' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {shop.images?.map((img) => (
            <div key={img.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
              <img src={img.url} alt={img.caption || 'Haircut'} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
            </div>
          ))}
          {!shop.images?.length && <p className="text-gray-400 col-span-3 text-center py-8">No photos yet</p>}
        </div>
      )}

      {/* Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          {/* Review submission states */}
          {canSubmitReview && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">✓ Verified visit</span>
                <h3 className="font-semibold">Leave a review</h3>
              </div>
              {reviewError && <p className="text-red-500 text-sm mb-2">{reviewError}</p>}
              <form onSubmit={submitReview} className="space-y-3">
                <StarRating rating={reviewForm.rating} size="lg" interactive onChange={(r) => setReviewForm({ ...reviewForm, rating: r })} />
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Share your experience..."
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                />
                <button type="submit" disabled={submittingReview} className="btn-primary">
                  {submittingReview ? 'Submitting...' : 'Submit review'}
                </button>
              </form>
            </div>
          )}
          {user?.role === 'CUSTOMER' && myReview && (
            <div className="card p-5 bg-blue-50 border-blue-200">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Your review</span> — submitted on {new Date(myReview.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}
          {user?.role === 'CUSTOMER' && !hasCompletedAppt && !myReview && (
            <div className="card p-5 bg-gray-50 border-gray-200">
              <p className="text-sm text-gray-600">
                💈 Want to leave a review? You'll be able to once you've completed an appointment here.
              </p>
            </div>
          )}
          {!user && (
            <div className="card p-5 bg-gray-50 border-gray-200">
              <p className="text-sm text-gray-600">
                <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link> as a customer to leave a review (after a completed visit).
              </p>
            </div>
          )}

          {shop.reviews?.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
          {!shop.reviews?.length && <p className="text-gray-400 text-center py-8">No reviews yet — be the first!</p>}
        </div>
      )}
    </div>
  )
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
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
      {review.comment && <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>}
    </div>
  )
}
