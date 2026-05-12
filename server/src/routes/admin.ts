import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()

// Aggregate platform stats
router.get('/stats', authenticate, requireAdmin, async (_req, res) => {
  const [users, shops, staff, appointments, reviews, photos, completed, cancelled] = await Promise.all([
    prisma.user.count(),
    prisma.barberShop.count(),
    prisma.staff.count(),
    prisma.appointment.count(),
    prisma.review.count(),
    prisma.customerPhoto.count(),
    prisma.appointment.count({ where: { status: 'COMPLETED' } }),
    prisma.appointment.count({ where: { status: 'CANCELLED' } }),
  ])
  res.json({
    users, shops, staff, appointments, reviews, photos,
    completedAppointments: completed,
    cancelledAppointments: cancelled,
  })
})

// List all users (paginated, filterable)
router.get('/users', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const { role, search } = req.query
  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role: String(role) } : {}),
      ...(search ? { OR: [
        { name: { contains: String(search) } },
        { email: { contains: String(search) } },
      ] } : {}),
    },
    select: { id: true, email: true, name: true, role: true, phone: true, avatar: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  res.json(users)
})

// List all shops with stats
router.get('/shops', authenticate, requireAdmin, async (_req, res) => {
  const shops = await prisma.barberShop.findMany({
    include: {
      owner: { select: { id: true, email: true, name: true } },
      _count: { select: { appointments: true, reviews: true, staff: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(shops)
})

// Hard delete a user and ALL their related data.
// Customers: deletes their appointments, reviews, photos, favorites, staff favorites, staff reviews
// Shop owners: also deletes the shop (cascade handles services/offers/staff/images),
//              plus appointments and reviews at the shop, and favorites of the shop
// Staff: also deletes their staff profile (cascade handles portfolio/favorites/reviews),
//        plus appointments assigned to them
router.delete('/users/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  if (req.params.id === req.userId) {
    res.status(400).json({ error: 'You cannot delete your own admin account' })
    return
  }
  const userId = req.params.id

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) { res.status(404).json({ error: 'User not found' }); return }

    await prisma.$transaction(async (tx) => {
      // ── 1. Customer-side dependent data (any role can theoretically have these) ──
      await tx.staffReview.deleteMany({ where: { customerId: userId } })
      await tx.review.deleteMany({ where: { customerId: userId } })
      await tx.favorite.deleteMany({ where: { customerId: userId } })
      await tx.staffFavorite.deleteMany({ where: { customerId: userId } })
      await tx.customerPhoto.deleteMany({ where: { customerId: userId } })
      await tx.appointment.deleteMany({ where: { customerId: userId } })

      // ── 2. If owner: delete the shop (handles services/offers/staff/images via cascade) ──
      const shop = await tx.barberShop.findUnique({ where: { ownerId: userId } })
      if (shop) {
        // Appointments + reviews + favorites pointing at this shop don't auto-cascade
        await tx.appointment.deleteMany({ where: { shopId: shop.id } })
        await tx.review.deleteMany({ where: { shopId: shop.id } })
        await tx.favorite.deleteMany({ where: { shopId: shop.id } })
        // Cascade chain takes care of: services -> offers (via SetNull on offer.serviceId),
        // staff -> portfolio + staff favorites + staff reviews (cascade), images
        await tx.barberShop.delete({ where: { id: shop.id } })
      }

      // ── 3. If they have a staff profile, delete it (and its appts) ──
      const staff = await tx.staff.findUnique({ where: { userId } })
      if (staff) {
        await tx.appointment.deleteMany({ where: { staffId: staff.id } })
        // Cascade handles: portfolio photos, staff favorites, staff reviews
        await tx.staff.delete({ where: { id: staff.id } })
      }

      // ── 4. Finally delete the user ──
      await tx.user.delete({ where: { id: userId } })
    }, { timeout: 15000 })

    res.json({ success: true })
  } catch (err) {
    console.error('[admin delete user]', err)
    res.status(500).json({ error: 'Could not delete user — see server logs for details' })
  }
})

// Recent activity feed (appointments, reviews, signups)
router.get('/activity', authenticate, requireAdmin, async (_req, res) => {
  const [recentAppts, recentReviews, recentUsers] = await Promise.all([
    prisma.appointment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        shop: { select: { name: true } },
        service: { select: { name: true } },
      },
    }),
    prisma.review.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        shop: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),
  ])
  res.json({ recentAppts, recentReviews, recentUsers })
})

export default router
