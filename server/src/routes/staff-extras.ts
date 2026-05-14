// Endpoints that extend the Staff feature without bloating the main staff.ts file:
//   - Staff portfolio photos (the barber's own gallery)
//   - Customer favoriting individual barbers
import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireCustomer, requireStaff, AuthRequest } from '../middleware/auth'
import { upload } from './uploads'

const router = Router()

// ── Staff portfolio photos ────────────────────────────────────────────────

// Public: see a barber's portfolio
router.get('/staff/:id/portfolio', async (req, res) => {
  const photos = await prisma.staffPortfolioPhoto.findMany({
    where: { staffId: req.params.id },
    orderBy: { createdAt: 'desc' },
  })
  res.json(photos)
})

// Staff self / shop owner: add a portfolio photo for this staff
async function canManageStaffPortfolio(staffId: string, userId: string, userRole: string) {
  const staff = await prisma.staff.findUnique({ where: { id: staffId }, include: { shop: true } })
  if (!staff) return null
  // Owner of the shop can manage (if staff is attached to a shop and that shop's owner is the user)
  if (staff.shop && staff.shop.ownerId === userId) return staff
  // Staff member themselves can manage their own
  if (userRole === 'STAFF' && staff.userId === userId) return staff
  return null
}

router.post('/staff/:id/portfolio', authenticate, upload.single('photo'), async (req: AuthRequest, res) => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return }
  const staff = await canManageStaffPortfolio(req.params.id, req.userId!, req.userRole!)
  if (!staff) { res.status(403).json({ error: 'Forbidden' }); return }
  const photo = await prisma.staffPortfolioPhoto.create({
    data: {
      staffId: req.params.id,
      url: `/uploads/${req.file.filename}`,
      caption: req.body.caption || null,
    },
  })
  res.status(201).json(photo)
})

router.put('/staff/:id/portfolio/:photoId', authenticate, async (req: AuthRequest, res) => {
  const staff = await canManageStaffPortfolio(req.params.id, req.userId!, req.userRole!)
  if (!staff) { res.status(403).json({ error: 'Forbidden' }); return }
  const photo = await prisma.staffPortfolioPhoto.findUnique({ where: { id: req.params.photoId } })
  if (!photo || photo.staffId !== req.params.id) { res.status(404).json({ error: 'Photo not found' }); return }
  const updated = await prisma.staffPortfolioPhoto.update({
    where: { id: req.params.photoId },
    data: { caption: req.body.caption !== undefined ? req.body.caption : undefined },
  })
  res.json(updated)
})

router.delete('/staff/:id/portfolio/:photoId', authenticate, async (req: AuthRequest, res) => {
  const staff = await canManageStaffPortfolio(req.params.id, req.userId!, req.userRole!)
  if (!staff) { res.status(403).json({ error: 'Forbidden' }); return }
  const photo = await prisma.staffPortfolioPhoto.findUnique({ where: { id: req.params.photoId } })
  if (!photo || photo.staffId !== req.params.id) { res.status(404).json({ error: 'Photo not found' }); return }
  await prisma.staffPortfolioPhoto.delete({ where: { id: req.params.photoId } })
  res.json({ success: true })
})

// ── Customer staff favorites ──────────────────────────────────────────────

router.get('/staff-favorites', authenticate, requireCustomer, async (req: AuthRequest, res) => {
  const favs = await prisma.staffFavorite.findMany({
    where: { customerId: req.userId! },
    include: {
      staff: {
        include: { shop: { select: { id: true, name: true, address: true, logo: true } } },
      },
    },
  })
  res.json(favs.map((f) => f.staff))
})

router.post('/staff/:id/favorite', authenticate, requireCustomer, async (req: AuthRequest, res) => {
  // Verify staff exists
  const staff = await prisma.staff.findUnique({ where: { id: req.params.id } })
  if (!staff) { res.status(404).json({ error: 'Staff not found' }); return }
  try {
    await prisma.staffFavorite.create({
      data: { customerId: req.userId!, staffId: req.params.id },
    })
    res.json({ success: true })
  } catch {
    // Already favorited — treat as success (idempotent)
    res.json({ success: true })
  }
})

router.delete('/staff/:id/favorite', authenticate, requireCustomer, async (req: AuthRequest, res) => {
  await prisma.staffFavorite.deleteMany({
    where: { customerId: req.userId!, staffId: req.params.id },
  })
  res.json({ success: true })
})

export default router
