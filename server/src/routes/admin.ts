import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth'
import { validatePassword } from '../lib/password'
import { audit } from '../lib/audit'

const router = Router()

// Helper — refuse any destructive action on the super admin
async function ensureNotSuperAdmin(userId: string): Promise<{ ok: boolean; error?: string }> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true } })
  if (u?.isSuperAdmin) return { ok: false, error: 'This is the platform owner — they cannot be modified by other admins.' }
  return { ok: true }
}

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
    select: { id: true, email: true, name: true, role: true, phone: true, avatar: true, createdAt: true, deletedAt: true, isSuperAdmin: true },
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
  const protectCheck = await ensureNotSuperAdmin(req.params.id)
  if (!protectCheck.ok) { res.status(403).json({ error: protectCheck.error }); return }

  const user = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!user) { res.status(404).json({ error: 'User not found' }); return }
  if (user.deletedAt) { res.json({ success: true, alreadySuspended: true }); return }

  await prisma.user.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() },
  })
  const actor = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } })
  audit({ actorId: req.userId, actorEmail: actor?.email, action: 'USER_SUSPENDED', targetType: 'USER', targetId: user.id, metadata: { email: user.email, role: user.role } })
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
  const actor = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } })
  audit({ actorId: req.userId, actorEmail: actor?.email, action: 'USER_RESTORED', targetType: 'USER', targetId: user.id, metadata: { email: user.email } })
  res.json({ success: true })
})

// Add a new admin OR promote an existing user.
// Body: { email, password?, name? }
//   - If user exists with that email → promotes them to ADMIN (password ignored)
//   - If user doesn't exist → creates a new user with role=ADMIN
//     (password + name required in that case)
router.post('/admins', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const rawEmail = String(req.body.email || '').toLowerCase().trim()
  if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    res.status(400).json({ error: 'A valid email is required' })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email: rawEmail } })
  if (existing) {
    if (existing.deletedAt) {
      res.status(400).json({ error: 'This account is suspended. Restore it first, then promote.' })
      return
    }
    if (existing.role === 'ADMIN') {
      res.status(400).json({ error: 'This user is already an admin' })
      return
    }
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'ADMIN' },
      select: { id: true, email: true, name: true, role: true, createdAt: true, deletedAt: true },
    })
    res.json({ user: updated, created: false })
    return
  }

  // Creating a brand new admin user requires password + name
  const { password, name } = req.body
  if (!password) { res.status(400).json({ error: 'Password is required to create a new admin' }); return }
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    res.status(400).json({ error: 'Name is required to create a new admin' })
    return
  }
  const pw = validatePassword(password)
  if (!pw.ok) { res.status(400).json({ error: pw.error }); return }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { email: rawEmail, password: hashed, name: name.trim(), role: 'ADMIN', emailVerified: true },
    select: { id: true, email: true, name: true, role: true, createdAt: true, deletedAt: true },
  })
  const actor = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } })
  audit({ actorId: req.userId, actorEmail: actor?.email, action: 'ADMIN_CREATED', targetType: 'USER', targetId: user.id, metadata: { email: user.email } })
  res.status(201).json({ user, created: true })
})

// Demote an admin back to CUSTOMER. Can't demote yourself or the super admin.
router.post('/users/:id/demote', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  if (req.params.id === req.userId) {
    res.status(400).json({ error: 'You cannot remove your own admin role' })
    return
  }
  const protectCheck = await ensureNotSuperAdmin(req.params.id)
  if (!protectCheck.ok) { res.status(403).json({ error: protectCheck.error }); return }

  const user = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!user) { res.status(404).json({ error: 'User not found' }); return }
  if (user.role !== 'ADMIN') { res.status(400).json({ error: 'User is not an admin' }); return }

  // Make sure we never end up with zero admins
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN', deletedAt: null } })
  if (adminCount <= 1) {
    res.status(400).json({ error: 'Cannot demote the only remaining admin' })
    return
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: 'CUSTOMER' } })
  const actor = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } })
  audit({ actorId: req.userId, actorEmail: actor?.email, action: 'ADMIN_DEMOTED', targetType: 'USER', targetId: user.id, metadata: { email: user.email } })
  res.json({ success: true })
})

// Permanently delete a user and ALL related data. Cannot be undone.
// Use only when you really need the email/data wiped (GDPR-style "right to be forgotten").
router.delete('/users/:id/permanent', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  if (req.params.id === req.userId) {
    res.status(400).json({ error: 'You cannot permanently delete your own admin account' })
    return
  }
  const protectCheck = await ensureNotSuperAdmin(req.params.id)
  if (!protectCheck.ok) { res.status(403).json({ error: protectCheck.error }); return }
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

    const actor = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } })
    audit({ actorId: req.userId, actorEmail: actor?.email, action: 'USER_DELETED_PERMANENTLY', targetType: 'USER', targetId: userId, metadata: { email: user.email, role: user.role } })

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

// ── Admin: reviews moderation ────────────────────────────────────────────────

router.get('/reviews', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const { search } = req.query
  const reviews = await prisma.review.findMany({
    where: search ? { comment: { contains: String(search) } } : {},
    include: {
      customer: { select: { id: true, name: true, email: true } },
      shop: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  res.json(reviews)
})

router.delete('/reviews/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const review = await prisma.review.findUnique({ where: { id: req.params.id } })
  if (!review) { res.status(404).json({ error: 'Review not found' }); return }

  await prisma.review.delete({ where: { id: req.params.id } })

  // Recompute shop rating
  const reviews = await prisma.review.findMany({ where: { shopId: review.shopId } })
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  await prisma.barberShop.update({
    where: { id: review.shopId },
    data: { rating: Math.round(avg * 10) / 10, reviewCount: reviews.length },
  })

  const actor = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } })
  audit({ actorId: req.userId, actorEmail: actor?.email, action: 'REVIEW_DELETED', targetType: 'REVIEW', targetId: review.id, metadata: { shopId: review.shopId, customerId: review.customerId, rating: review.rating, comment: review.comment } })

  res.json({ success: true })
})

// Also: staff reviews moderation
router.delete('/staff-reviews/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const review = await prisma.staffReview.findUnique({ where: { id: req.params.id } })
  if (!review) { res.status(404).json({ error: 'Review not found' }); return }

  await prisma.staffReview.delete({ where: { id: req.params.id } })

  // Recompute staff rating
  const remaining = await prisma.staffReview.findMany({ where: { staffId: review.staffId } })
  const avg = remaining.length ? remaining.reduce((s, r) => s + r.rating, 0) / remaining.length : 0
  await prisma.staff.update({
    where: { id: review.staffId },
    data: { rating: Math.round(avg * 10) / 10, reviewCount: remaining.length },
  })

  const actor = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } })
  audit({ actorId: req.userId, actorEmail: actor?.email, action: 'STAFF_REVIEW_DELETED', targetType: 'STAFF_REVIEW', targetId: review.id })

  res.json({ success: true })
})

// ── Admin: shops moderation ──────────────────────────────────────────────────

router.put('/shops/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.id } })
  if (!shop) { res.status(404).json({ error: 'Shop not found' }); return }

  const { name, address, description, phone, openingTime, closingTime, latitude, longitude } = req.body
  const updated = await prisma.barberShop.update({
    where: { id: req.params.id },
    data: {
      name, address, description, phone, openingTime, closingTime,
      latitude: latitude !== undefined ? (latitude === null ? null : Number(latitude)) : undefined,
      longitude: longitude !== undefined ? (longitude === null ? null : Number(longitude)) : undefined,
    },
  })

  const actor = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } })
  audit({ actorId: req.userId, actorEmail: actor?.email, action: 'SHOP_EDITED_BY_ADMIN', targetType: 'SHOP', targetId: shop.id, metadata: { changes: req.body } })

  res.json(updated)
})

router.delete('/shops/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.id } })
  if (!shop) { res.status(404).json({ error: 'Shop not found' }); return }

  try {
    await prisma.$transaction(async (tx) => {
      // Non-cascading children of shop
      await tx.appointment.deleteMany({ where: { shopId: shop.id } })
      await tx.review.deleteMany({ where: { shopId: shop.id } })
      await tx.favorite.deleteMany({ where: { shopId: shop.id } })
      // Cascade handles services/offers/images/staff/verificationDocs
      await tx.barberShop.delete({ where: { id: shop.id } })
    }, { timeout: 15000 })

    const actor = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } })
    audit({ actorId: req.userId, actorEmail: actor?.email, action: 'SHOP_DELETED', targetType: 'SHOP', targetId: shop.id, metadata: { name: shop.name, ownerId: shop.ownerId } })

    res.json({ success: true })
  } catch (err) {
    console.error('[admin delete shop]', err)
    res.status(500).json({ error: 'Could not delete shop' })
  }
})

// ── Admin: audit log feed ────────────────────────────────────────────────────

router.get('/audit-log', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const { action, take } = req.query
  const logs = await prisma.auditLog.findMany({
    where: action ? { action: String(action) } : {},
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(take) || 100, 500),
  })
  res.json(logs)
})

// ── Admin: support tickets ───────────────────────────────────────────────────

router.get('/support-tickets', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const { status } = req.query
  const tickets = await prisma.supportTicket.findMany({
    where: status ? { status: String(status) } : {},
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  })
  res.json(tickets)
})

router.post('/support-tickets/:id/reply', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const { reply } = req.body
  if (!reply || typeof reply !== 'string' || reply.trim().length < 2) {
    res.status(400).json({ error: 'Reply text required' })
    return
  }
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } })
  if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return }

  // Send the reply via email
  try {
    const { sendSupportTicketReply } = await import('../lib/email')
    await sendSupportTicketReply({ to: ticket.email, name: ticket.name, reply: reply.trim(), originalSubject: ticket.subject || undefined })
  } catch (e) {
    console.error('[admin reply support] email send failed', e)
  }

  const updated = await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { adminReply: reply.trim(), repliedAt: new Date(), status: 'IN_PROGRESS' },
  })
  res.json(updated)
})

router.put('/support-tickets/:id/status', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const { status } = req.body
  const allowed = ['OPEN', 'IN_PROGRESS', 'CLOSED']
  if (!allowed.includes(status)) { res.status(400).json({ error: 'Invalid status' }); return }
  const ticket = await prisma.supportTicket.update({ where: { id: req.params.id }, data: { status } })
  res.json(ticket)
})

export default router
