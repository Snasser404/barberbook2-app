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

// Disable/suspend a user (sets to inactive — we'll mark by changing role temporarily;
// for now we just expose deletion as a hard action)
router.delete('/users/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  // Don't allow admin to delete themselves
  if (req.params.id === req.userId) {
    res.status(400).json({ error: 'You cannot delete your own admin account' })
    return
  }
  try {
    await prisma.user.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch {
    res.status(400).json({ error: 'Could not delete user (may have related data). Contact engineering.' })
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
