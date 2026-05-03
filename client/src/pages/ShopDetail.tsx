import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { BarberShop, Review } from '../types'
import StarRating from '../components/StarRating'
import { useAuth } from '../context/AuthContext'

export default function ShopDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [shop, setShop] = useState<BarberShop | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'services' | 'gallery' | 'reviews'>('services')
  const [isFavorite, setIsFavorite] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState('')

  useEffect(() => {
    api.get(`/shops/${id}`)
      .then((r) => setShop(r.data))
      .finally(() => setLoading(false))
    if (user?.role === 'CUSTOMER') {
      api.get('/favorites').then((r) => setIsFavorite(r.data.some((s: BarberShop) => s.id === id)))
    }
  }, [id, user])

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
            <h1 className="text-3xl font-bold text-primary">{shop.name}</h1>
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
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {(['services', 'gallery', 'reviews'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              {tab} {tab === 'reviews' ? `(${shop.reviewCount})` : tab === 'gallery' ? `(${shop.images?.length || 0})` : `(${shop.services?.length || 0})`}
            </button>
          ))}
        </div>
      </div>

      {/* Services */}
      {activeTab === 'services' && (
        <div className="grid sm:grid-cols-2 gap-4">
          {shop.services?.map((s) => (
            <div key={s.id} className="card p-4 flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">{s.name}</h3>
                {s.description && <p className="text-gray-500 text-sm mt-0.5">{s.description}</p>}
                <p className="text-gray-400 text-xs mt-1">{s.duration} min</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-primary">${s.price}</span>
                {user?.role === 'CUSTOMER' && (
                  <Link to={`/shops/${shop.id}/book?serviceId=${s.id}`} className="block text-xs text-accent hover:underline mt-1">Book this</Link>
                )}
              </div>
            </div>
          ))}
          {!shop.services?.length && <p className="text-gray-400 col-span-2 text-center py-8">No services listed yet</p>}
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
          {user?.role === 'CUSTOMER' && (
            <div className="card p-5">
              <h3 className="font-semibold mb-3">Leave a review</h3>
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
