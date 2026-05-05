import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { authenticate, requireBarber, requireCustomer, requireStaff, AuthRequest } from '../middleware/auth'

const router = Router()

// ── Public: list staff for a shop ──────────────────────────────────────────
router.get('/shops/:shopId/staff', async (req, res) => {
  const staff = await prisma.staff.findMany({
    where: { shopId: req.params.shopId, isActive: true },
    orderBy: [{ rating: 'desc' }, { createdAt: 'asc' }],
  })
  res.json(staff)
})

// Owner-only: list ALL staff (incl inactive)
router.get('/shops/:shopId/staff/all', authenticate, requireBarber, async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.shopId } })
  if (!shop || shop.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }
  const staff = await prisma.staff.findMany({
    where: { shopId: req.params.shopId },
    orderBy: { createdAt: 'asc' },
  })
  res.json(staff)
})

// Self-service: GET/PUT /staff/me must come BEFORE /staff/:id
router.get('/staff/me', authenticate, requireStaff, async (req: AuthRequest, res) => {
  const staff = await prisma.staff.findUnique({
    where: { userId: req.userId },
    include: {
      shop: { select: { id: true, name: true, address: true, coverImage: true } },
      reviews: {
        include: { customer: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!staff) { res.status(404).json({ error: 'Staff profile not found' }); return }
  res.json(staff)
})

router.put('/staff/me', authenticate, requireStaff, async (req: AuthRequest, res) => {
  const staff = await prisma.staff.findUnique({ where: { userId: req.userId } })
  if (!staff) { res.status(404).json({ error: 'Staff profile not found' }); return }

  const { name, bio, avatar, specialties } = req.body
  const updated = await prisma.staff.update({
    where: { id: staff.id },
    data: { name, bio, avatar, specialties },
  })
  res.json(updated)
})

// Public: individual staff with reviews
router.get('/staff/:id', async (req, res) => {
  const staff = await prisma.staff.findUnique({
    where: { id: req.params.id },
    include: {
      shop: { select: { id: true, name: true, address: true } },
      reviews: {
        include: { customer: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!staff) { res.status(404).json({ error: 'Staff member not found' }); return }
  res.json(staff)
})

// Owner-only: create staff (optionally with login email + password)
router.post('/shops/:shopId/staff', authenticate, requireBarber, async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.shopId } })
  if (!shop || shop.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }

  const { name, bio, avatar, specialties, email, password } = req.body
  if (!name) { res.status(400).json({ error: 'Name is required' }); return }

  let userId: string | undefined
  if (email) {
    if (!password || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters when creating a login' })
      return
    }
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      res.status(400).json({ error: 'A user with this email already exists' })
      return
    }
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, password: hashed, name, role: 'STAFF' },
    })
    userId = user.id
  }

  const staff = await prisma.staff.create({
    data: { shopId: req.params.shopId, name, bio, avatar, specialties, userId },
  })
  res.status(201).json(staff)
})

// Owner-only: update staff
router.put('/staff/:id', authenticate, requireBarber, async (req: AuthRequest, res) => {
  const staff = await prisma.staff.findUnique({ where: { id: req.params.id }, include: { shop: true } })
  if (!staff || staff.shop.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }

  const { name, bio, avatar, specialties, isActive } = req.body
  const updated = await prisma.staff.update({
    where: { id: req.params.id },
    data: { name, bio, avatar, specialties, isActive },
  })
  res.json(updated)
})

// Owner-only: delete staff
router.delete('/staff/:id', authenticate, requireBarber, async (req: AuthRequest, res) => {
  const staff = await prisma.staff.findUnique({ where: { id: req.params.id }, include: { shop: true } })
  if (!staff || staff.shop.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }

  await prisma.staff.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

// Customer: leave a review for a staff member (gated by completed appointment)
router.post('/staff/:id/reviews', authenticate, requireCustomer, async (req: AuthRequest, res) => {
  const { rating, comment } = req.body
  if (!rating || rating < 1 || rating > 5) { res.status(400).json({ error: 'Rating must be 1-5' }); return }

  const staff = await prisma.staff.findUnique({ where: { id: req.params.id } })
  if (!staff) { res.status(404).json({ error: 'Staff not found' }); return }

  // Gate: must have completed an appointment with this staff
  const completed = await prisma.appointment.findFirst({
    where: { customerId: req.userId!, staffId: req.params.id, status: 'COMPLETED' },
  })
  if (!completed) {
    res.status(403).json({ error: 'You can only review barbers you have visited' })
    return
  }

  const existing = await prisma.staffReview.findUnique({
    where: { customerId_staffId: { customerId: req.userId!, staffId: req.params.id } },
  })
  if (existing) { res.status(400).json({ error: 'You have already reviewed this barber' }); return }

  const review = await prisma.staffReview.create({
    data: { customerId: req.userId!, staffId: req.params.id, rating: Number(rating), comment },
    include: { customer: { select: { id: true, name: true, avatar: true } } },
  })

  // Recompute staff rating
  const reviews = await prisma.staffReview.findMany({ where: { staffId: req.params.id } })
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  await prisma.staff.update({
    where: { id: req.params.id },
    data: { rating: Math.round(avg * 10) / 10, reviewCount: reviews.length },
  })

  res.status(201).json(review)
})

export default router
