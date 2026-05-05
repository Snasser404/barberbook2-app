import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireBarber, requireCustomer, AuthRequest } from '../middleware/auth'
import { upload } from './uploads'

const router = Router()

// ── Shops ──────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const { search, minRating } = req.query
  const shops = await prisma.barberShop.findMany({
    where: {
      ...(search ? { OR: [{ name: { contains: String(search) } }, { address: { contains: String(search) } }] } : {}),
      ...(minRating ? { rating: { gte: Number(minRating) } } : {}),
    },
    include: {
      services: { where: { isActive: true } },
      images: true,
      offers: { where: { isActive: true } },
      _count: { select: { reviews: true } },
    },
    orderBy: { rating: 'desc' },
  })
  res.json(shops)
})

router.get('/mine', authenticate, requireBarber, async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({
    where: { ownerId: req.userId },
    include: { services: true, images: true, offers: true },
  })
  res.json(shop)
})

router.get('/:id', async (req, res) => {
  const shop = await prisma.barberShop.findUnique({
    where: { id: req.params.id },
    include: {
      services: { where: { isActive: true } },
      images: true,
      offers: { where: { isActive: true } },
      reviews: {
        include: { customer: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
      },
      owner: { select: { id: true, name: true, phone: true } },
    },
  })
  if (!shop) { res.status(404).json({ error: 'Shop not found' }); return }
  res.json(shop)
})

router.post('/', authenticate, requireBarber, async (req: AuthRequest, res) => {
  const existing = await prisma.barberShop.findUnique({ where: { ownerId: req.userId } })
  if (existing) { res.status(400).json({ error: 'You already have a shop' }); return }

  const { name, address, description, phone, openingTime, closingTime, latitude, longitude } = req.body
  if (!name || !address) { res.status(400).json({ error: 'Name and address are required' }); return }

  const shop = await prisma.barberShop.create({
    data: {
      ownerId: req.userId!,
      name, address, description, phone, openingTime, closingTime,
      latitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
      longitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
    },
  })
  res.status(201).json(shop)
})

router.put('/:id', authenticate, requireBarber, async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.id } })
  if (!shop || shop.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }

  const { name, address, description, phone, openingTime, closingTime, latitude, longitude, logo } = req.body
  const updated = await prisma.barberShop.update({
    where: { id: req.params.id },
    data: {
      name, address, description, phone, openingTime, closingTime,
      latitude: latitude !== undefined ? (latitude === null ? null : Number(latitude)) : undefined,
      longitude: longitude !== undefined ? (longitude === null ? null : Number(longitude)) : undefined,
      logo: logo !== undefined ? logo : undefined,
    },
  })
  res.json(updated)
})

// ── Shop Images ────────────────────────────────────────────────────────────

router.post('/:shopId/images', authenticate, requireBarber, upload.array('images', 10), async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.shopId } })
  if (!shop || shop.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }

  const files = req.files as Express.Multer.File[]
  if (!files?.length) { res.status(400).json({ error: 'No files uploaded' }); return }

  const images = await Promise.all(
    files.map((f) =>
      prisma.shopImage.create({
        data: { shopId: req.params.shopId, url: `/uploads/${f.filename}`, caption: req.body.caption || null },
      })
    )
  )

  // Set first image as cover if shop has none
  if (!shop.coverImage && images.length > 0) {
    await prisma.barberShop.update({ where: { id: shop.id }, data: { coverImage: images[0].url } })
  }

  res.json(images)
})

router.delete('/:shopId/images/:imageId', authenticate, requireBarber, async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.shopId } })
  if (!shop || shop.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }

  await prisma.shopImage.delete({ where: { id: req.params.imageId } })
  res.json({ success: true })
})

router.put('/:shopId/cover', authenticate, requireBarber, async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.shopId } })
  if (!shop || shop.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }

  const updated = await prisma.barberShop.update({
    where: { id: req.params.shopId },
    data: { coverImage: req.body.coverImage },
  })
  res.json(updated)
})

// ── Services ───────────────────────────────────────────────────────────────

router.get('/:shopId/services', async (req, res) => {
  const services = await prisma.service.findMany({
    where: { shopId: req.params.shopId },
    orderBy: { price: 'asc' },
  })
  res.json(services)
})

router.post('/:shopId/services', authenticate, requireBarber, async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.shopId } })
  if (!shop || shop.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }

  const { name, description, price, duration } = req.body
  if (!name || !price || !duration) { res.status(400).json({ error: 'Name, price, and duration are required' }); return }

  const service = await prisma.service.create({
    data: { shopId: req.params.shopId, name, description, price: Number(price), duration: Number(duration) },
  })
  res.status(201).json(service)
})

router.put('/:shopId/services/:id', authenticate, requireBarber, async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.shopId } })
  if (!shop || shop.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }

  const { name, description, price, duration, isActive } = req.body
  const service = await prisma.service.update({
    where: { id: req.params.id },
    data: { name, description, price: price !== undefined ? Number(price) : undefined, duration: duration !== undefined ? Number(duration) : undefined, isActive },
  })
  res.json(service)
})

router.delete('/:shopId/services/:id', authenticate, requireBarber, async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.shopId } })
  if (!shop || shop.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }

  await prisma.service.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

// ── Offers ─────────────────────────────────────────────────────────────────

router.get('/:shopId/offers', async (req, res) => {
  const offers = await prisma.offer.findMany({
    where: { shopId: req.params.shopId, isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(offers)
})

router.get('/:shopId/offers/all', authenticate, requireBarber, async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.shopId } })
  if (!shop || shop.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }

  const offers = await prisma.offer.findMany({ where: { shopId: req.params.shopId }, orderBy: { createdAt: 'desc' } })
  res.json(offers)
})

router.post('/:shopId/offers', authenticate, requireBarber, async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.shopId } })
  if (!shop || shop.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }

  const { title, description, discountPercent, validUntil } = req.body
  if (!title || discountPercent === undefined) { res.status(400).json({ error: 'Title and discount are required' }); return }

  const offer = await prisma.offer.create({
    data: {
      shopId: req.params.shopId,
      title,
      description,
      discountPercent: Number(discountPercent),
      validUntil: validUntil ? new Date(validUntil) : null,
    },
  })
  res.status(201).json(offer)
})

router.put('/:shopId/offers/:id', authenticate, requireBarber, async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.shopId } })
  if (!shop || shop.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }

  const { title, description, discountPercent, validUntil, isActive } = req.body
  const offer = await prisma.offer.update({
    where: { id: req.params.id },
    data: {
      title,
      description,
      discountPercent: discountPercent !== undefined ? Number(discountPercent) : undefined,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      isActive,
    },
  })
  res.json(offer)
})

router.delete('/:shopId/offers/:id', authenticate, requireBarber, async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.shopId } })
  if (!shop || shop.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }

  await prisma.offer.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

// ── Reviews ────────────────────────────────────────────────────────────────

router.get('/:shopId/reviews', async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { shopId: req.params.shopId },
    include: { customer: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(reviews)
})

router.post('/:shopId/reviews', authenticate, requireCustomer, async (req: AuthRequest, res) => {
  const { rating, comment } = req.body
  if (!rating || rating < 1 || rating > 5) { res.status(400).json({ error: 'Rating must be 1-5' }); return }

  // Production gate: must have completed an appointment at this shop
  const completedAppt = await prisma.appointment.findFirst({
    where: { customerId: req.userId!, shopId: req.params.shopId, status: 'COMPLETED' },
  })
  if (!completedAppt) {
    res.status(403).json({ error: 'You can only review shops where you have completed an appointment' })
    return
  }

  const existing = await prisma.review.findUnique({
    where: { customerId_shopId: { customerId: req.userId!, shopId: req.params.shopId } },
  })
  if (existing) { res.status(400).json({ error: 'You have already reviewed this shop' }); return }

  const review = await prisma.review.create({
    data: { customerId: req.userId!, shopId: req.params.shopId, rating: Number(rating), comment },
    include: { customer: { select: { id: true, name: true, avatar: true } } },
  })

  // Recalculate shop rating
  const reviews = await prisma.review.findMany({ where: { shopId: req.params.shopId } })
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  await prisma.barberShop.update({
    where: { id: req.params.shopId },
    data: { rating: Math.round(avg * 10) / 10, reviewCount: reviews.length },
  })

  res.status(201).json(review)
})

router.delete('/:shopId/reviews/:id', authenticate, async (req: AuthRequest, res) => {
  const review = await prisma.review.findUnique({ where: { id: req.params.id } })
  if (!review || review.customerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }

  await prisma.review.delete({ where: { id: req.params.id } })

  const reviews = await prisma.review.findMany({ where: { shopId: req.params.shopId } })
  const avg = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0
  await prisma.barberShop.update({
    where: { id: req.params.shopId },
    data: { rating: Math.round(avg * 10) / 10, reviewCount: reviews.length },
  })

  res.json({ success: true })
})

// ── Availability ───────────────────────────────────────────────────────────

router.get('/:shopId/availability', async (req, res) => {
  const { date, serviceId } = req.query
  if (!date || !serviceId) { res.status(400).json({ error: 'date and serviceId are required' }); return }

  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.shopId } })
  if (!shop) { res.status(404).json({ error: 'Shop not found' }); return }

  const service = await prisma.service.findUnique({ where: { id: String(serviceId) } })
  if (!service) { res.status(404).json({ error: 'Service not found' }); return }

  // Generate 30-minute slots between opening and closing
  const slots: string[] = []
  const [openH, openM] = shop.openingTime.split(':').map(Number)
  const [closeH, closeM] = shop.closingTime.split(':').map(Number)
  let current = openH * 60 + openM
  const end = closeH * 60 + closeM - service.duration

  while (current <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, '0')
    const m = (current % 60).toString().padStart(2, '0')
    slots.push(`${h}:${m}`)
    current += 30
  }

  // Remove booked slots
  const booked = await prisma.appointment.findMany({
    where: { shopId: req.params.shopId, date: String(date), status: { in: ['PENDING', 'CONFIRMED'] } },
    include: { service: true },
  })

  const available = slots.filter((slot) => {
    const slotMin = parseInt(slot.split(':')[0]) * 60 + parseInt(slot.split(':')[1])
    return !booked.some((appt) => {
      const apptMin = parseInt(appt.time.split(':')[0]) * 60 + parseInt(appt.time.split(':')[1])
      return slotMin < apptMin + appt.service.duration && slotMin + service.duration > apptMin
    })
  })

  res.json({ slots: available })
})

export default router
