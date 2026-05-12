import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { Staff, Appointment } from '../types'
import StarRating from '../components/StarRating'
import { useAuth } from '../context/AuthContext'
import StaffPortfolio from '../components/StaffPortfolio'

export default function StaffProfile() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [staff, setStaff] = useState<Staff | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [hasCompletedAppt, setHasCompletedAppt] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  useEffect(() => {
    api.get(`/staff/${id}`).then((r) => setStaff(r.data)).finally(() => setLoading(false))
    if (user?.role === 'CUSTOMER') {
      api.get('/appointments').then((r) => {
        const completed = r.data.some((a: Appointment) => a.staffId === id && a.status === 'COMPLETED')
        setHasCompletedAppt(completed)
      })
      api.get('/staff-favorites').then((r) => {
        setIsFavorite(r.data.some((s: Staff) => s.id === id))
      }).catch(() => {})
    }
  }, [id, user])

  const toggleFavorite = async () => {
    if (!user) { navigate('/login'); return }
    if (isFavorite) {
      await api.delete(`/staff/${id}/favorite`)
      setIsFavorite(false)
    } else {
      await api.post(`/staff/${id}/favorite`)
      setIsFavorite(true)
    }
  }

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { navigate('/login'); return }
    setSubmitting(true)
    setError('')
    try {
      const { data } = await api.post(`/staff/${id}/reviews`, reviewForm)
      setStaff((prev) => prev ? {
        ...prev,
        reviews: [data, ...(prev.reviews || [])],
        reviewCount: prev.reviewCount + 1,
      } : prev)
      setReviewForm({ rating: 5, comment: '' })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
  if (!staff) return <div className="text-center py-20 text-gray-500">Barber not found</div>

  const myReview = user?.role === 'CUSTOMER' && staff.reviews?.find((r) => r.customerId === user.id)
  const canSubmitReview = user?.role === 'CUSTOMER' && hasCompletedAppt && !myReview
  const specialties = staff.specialties ? staff.specialties.split(',').map((s) => s.trim()).filter(Boolean) : []

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {staff.shop && (
        <Link to={`/shops/${staff.shop.id}`} className="text-gray-500 hover:text-gray-700 text-sm mb-4 inline-block">← Back to {staff.shop.name}</Link>
      )}

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-5">
          {staff.avatar ? (
            <img src={staff.avatar} alt={staff.name} className="w-28 h-28 rounded-full object-cover shrink-0 mx-auto sm:mx-0" />
          ) : (
            <div className="w-28 h-28 rounded-full bg-primary text-accent flex items-center justify-center text-4xl font-bold shrink-0 mx-auto sm:mx-0">
              {staff.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <h1 className="text-2xl font-bold text-primary">{staff.name}</h1>
              {user?.role === 'CUSTOMER' && (
                <button
                  type="button"
                  onClick={toggleFavorite}
                  aria-label={isFavorite ? 'Unfavorite barber' : 'Favorite barber'}
                  className={`text-2xl transition-transform hover:scale-110 ${isFavorite ? 'text-red-500' : 'text-gray-300'}`}
                >
                  {isFavorite ? '♥' : '♡'}
                </button>
              )}
            </div>
            {staff.shop && (
              <p className="text-gray-500 text-sm mt-1">at <Link to={`/shops/${staff.shop.id}`} className="text-primary hover:underline">{staff.shop.name}</Link></p>
            )}
            <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
              <StarRating rating={Math.round(staff.rating)} size="md" />
              <span className="text-gray-700 font-medium">{staff.rating.toFixed(1)}</span>
              <span className="text-gray-400 text-sm">({staff.reviewCount} reviews)</span>
            </div>
            {specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 justify-center sm:justify-start">
                {specialties.map((sp) => (
                  <span key={sp} className="text-xs bg-accent/15 text-amber-800 px-2.5 py-1 rounded-full">{sp}</span>
                ))}
              </div>
            )}
            {staff.bio && <p className="text-gray-600 mt-4 leading-relaxed">{staff.bio}</p>}
            {user?.role === 'CUSTOMER' && staff.shop && (
              <Link to={`/shops/${staff.shop.id}/book?staffId=${staff.id}`} className="btn-accent mt-4 inline-block">
                Book with {staff.name.split(' ')[0]}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Portfolio (public, read-only) */}
      <div className="card p-5 mb-6">
        <StaffPortfolio staffId={staff.id} />
      </div>

      {/* Reviews */}
      <div className="space-y-4">
        <h2 className="font-semibold text-gray-900">Reviews</h2>

        {canSubmitReview && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">✓ Verified visit</span>
              <h3 className="font-semibold text-sm">Review {staff.name.split(' ')[0]}</h3>
            </div>
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            <form onSubmit={submitReview} className="space-y-3">
              <StarRating rating={reviewForm.rating} size="lg" interactive onChange={(r) => setReviewForm({ ...reviewForm, rating: r })} />
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="How was your experience with this barber?"
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
              />
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Submitting...' : 'Submit review'}
              </button>
            </form>
          </div>
        )}
        {myReview && (
          <div className="card p-5 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Your review</span> — submitted on {new Date(myReview.createdAt).toLocaleDateString()}
            </p>
          </div>
        )}
        {user?.role === 'CUSTOMER' && !hasCompletedAppt && !myReview && (
          <div className="card p-5 bg-gray-50 border-gray-200">
            <p className="text-sm text-gray-600">
              💈 You can review {staff.name.split(' ')[0]} after completing an appointment with them.
            </p>
          </div>
        )}

        {staff.reviews?.map((review) => (
          <div key={review.id} className="card p-4">
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
        ))}
        {!staff.reviews?.length && <p className="text-gray-400 text-center py-8 text-sm">No reviews yet for this barber.</p>}
      </div>
    </div>
  )
}
