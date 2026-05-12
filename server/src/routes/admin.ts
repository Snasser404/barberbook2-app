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

// List all users (paginated, filterable, with deleted-state filter)
router.get('/users', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const { role, search, status } = req.query
  // status: 'active' (default), 'deleted', or 'all'
  const deletedFilter =
    status === 'deleted' ? { deletedAt: { not: null } } :
    status === 'all' ? {} :
    { deletedAt: null }

  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role: String(role) } : {}),
      ...(search ? { OR: [
        { name: { contains: String(search) } },
        { email: { contains: String(search) } },
      ] } : {}),
      ...deletedFilter,
    },
    select: { id: true, email: true, name: true, role: true, phone: true, avatar: true, createdAt: true, deletedAt: true },
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

// Soft-delete (suspend) a user. Sets deletedAt = now() so they can't log in
// but their data is preserved. Restorable via POST /users/:id/restore.
router.delete('/users/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  if (req.params.id === req.userId) {
    res.status(400).json({ error: 'You cannot suspend your own admin account' })
    return
  }
  const user = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!user) { res.status(404).json({ error: 'User not found' }); return }
  if (user.deletedAt) { res.json({ success: true, alreadySuspended: true }); return }

  await prisma.user.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  })
  res.json({ success: true })
})

// Restore a previously suspended user — they can log in again, all data intact.
router.post('/users/:id/restore', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!user) { res.status(404).json({ error: 'User not found' }); return }
  if (!user.deletedAt) { res.json({ success: true, alreadyActive: true }); return }

  await prisma.user.update({
    where: { id: req.params.id },
    data: { deletedAt: null },
  })
  res.json({ success: true })
})

// Permanently delete a user and ALL related data. Cannot be undone.
// Use only when you really need the email/data wiped (GDPR-style "right to be forgotten").
router.delete('/users/:id/permanent', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  if (req.params.id === req.userId) {
    res.status(400).json({ error: 'You cannot permanently delete your own admin account' })
    return
  }
  const userId = req.params.id

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) { res.status(404).json({ error: 'User not found' }); return }

    await prisma.$transaction(async (tx) => {
      // Customer-side dependent data
      await tx.staffReview.deleteMany({ where: { customerId: userId } })
      await tx.review.deleteMany({ where: { customerId: userId } })
      await tx.favorite.deleteMany({ where: { customerId: userId } })
      await tx.staffFavorite.deleteMany({ where: { customerId: userId } })
      await tx.customerPhoto.deleteMany({ where: { customerId: userId } })
      await tx.appointment.deleteMany({ where: { customerId: userId } })

      // Owner: delete the shop and its non-cascading dependents
      const shop = await tx.barberShop.findUnique({ where: { ownerId: userId } })
      if (shop) {
        await tx.appointment.deleteMany({ where: { shopId: shop.id } })
        await tx.review.deleteMany({ where: { shopId: shop.id } })
        await tx.favorite.deleteMany({ where: { shopId: shop.id } })
        await tx.barberShop.delete({ where: { id: shop.id } })
      }

      // Staff: delete their profile + appointments assigned
      const staff = await tx.staff.findUnique({ where: { userId } })
      if (staff) {
        await tx.appointment.deleteMany({ where: { staffId: staff.id } })
        await tx.staff.delete({ where: { id: staff.id } })
      }

      await tx.user.delete({ where: { id: userId } })
    }, { timeout: 15000 })

    res.json({ success: true })
  } catch (err) {
    console.error('[admin permanent delete user]', err)
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
