export type Role = 'CUSTOMER' | 'BARBER' | 'STAFF' | 'ADMIN'
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: Role
  avatar?: string
  emailVerified?: boolean
}

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface VerificationDoc {
  id: string
  shopId: string
  url: string
  documentType: 'BUSINESS_LICENSE' | 'ID' | 'UTILITY_BILL' | 'OTHER'
  caption?: string | null
  createdAt: string
}

export interface BarberShop {
  id: string
  ownerId: string
  name: string
  address: string
  description?: string
  phone?: string
  openingTime: string
  closingTime: string
  coverImage?: string
  logo?: string | null
  rating: number
  reviewCount: number
  latitude?: number | null
  longitude?: number | null
  verificationStatus?: VerificationStatus
  verificationNotes?: string | null
  verifiedAt?: string | null
  createdAt: string
  services?: Service[]
  images?: ShopImage[]
  offers?: Offer[]
  reviews?: Review[]
  owner?: { id: string; name: string; phone?: string; email?: string }
  verificationDocs?: VerificationDoc[]
}

export interface ShopImage {
  id: string
  shopId: string
  url: string
  caption?: string
}

export interface Service {
  id: string
  shopId: string
  name: string
  description?: string
  price: number
  duration: number
  isActive: boolean
}

export interface Offer {
  id: string
  shopId: string
  serviceId?: string | null
  service?: { id: string; name: string; price?: number } | null
  title: string
  description?: string
  discountPercent: number
  validUntil?: string
  isActive: boolean
  createdAt: string
}

export interface StaffPortfolioPhoto {
  id: string
  staffId: string
  url: string
  caption?: string | null
  createdAt: string
}

export interface Appointment {
  id: string
  customerId: string
  shopId: string
  serviceId: string
  staffId?: string | null
  date: string
  time: string
  status: AppointmentStatus
  notes?: string
  createdAt: string
  shop?: Pick<BarberShop, 'id' | 'name' | 'address' | 'coverImage'>
  service?: Service
  staff?: Pick<Staff, 'id' | 'name' | 'avatar'>
  customer?: Pick<User, 'id' | 'name' | 'phone' | 'avatar'>
}

export interface Staff {
  id: string
  shopId: string
  name: string
  bio?: string | null
  avatar?: string | null
  specialties?: string | null
  rating: number
  reviewCount: number
  isActive: boolean
  createdAt: string
  shop?: Pick<BarberShop, 'id' | 'name' | 'address'>
  reviews?: StaffReview[]
}

export interface StaffReview {
  id: string
  customerId: string
  staffId: string
  rating: number
  comment?: string
  createdAt: string
  customer?: Pick<User, 'id' | 'name' | 'avatar'>
}

export type PhotoType = 'INSPIRATION' | 'COMPLETED'

export interface CustomerPhoto {
  id: string
  customerId: string
  url: string
  caption?: string | null
  type: PhotoType
  appointmentId?: string | null
  appointment?: {
    id: string
    date: string
    time: string
    shop?: { id: string; name: string }
    staff?: { id: string; name: string } | null
    service?: { id: string; name: string }
  }
  createdAt: string
}

export interface Review {
  id: string
  customerId: string
  shopId: string
  rating: number
  comment?: string
  createdAt: string
  customer?: Pick<User, 'id' | 'name' | 'avatar'>
}
