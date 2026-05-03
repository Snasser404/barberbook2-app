export type Role = 'CUSTOMER' | 'BARBER'
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: Role
  avatar?: string
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
  rating: number
  reviewCount: number
  latitude?: number | null
  longitude?: number | null
  createdAt: string
  services?: Service[]
  images?: ShopImage[]
  offers?: Offer[]
  reviews?: Review[]
  owner?: { id: string; name: string; phone?: string }
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
  title: string
  description?: string
  discountPercent: number
  validUntil?: string
  isActive: boolean
  createdAt: string
}

export interface Appointment {
  id: string
  customerId: string
  shopId: string
  serviceId: string
  date: string
  time: string
  status: AppointmentStatus
  notes?: string
  createdAt: string
  shop?: Pick<BarberShop, 'id' | 'name' | 'address' | 'coverImage'>
  service?: Service
  customer?: Pick<User, 'id' | 'name' | 'phone' | 'avatar'>
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
