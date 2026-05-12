// Shop verification endpoints
//  - Owner uploads supporting documents (business license, ID, utility bill, etc.)
//  - Admin reviews documents and approves / rejects
//  - Customer-facing shop list filters out anything not VERIFIED
import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireBarber, requireAdmin, AuthRequest } from '../middleware/auth'
import { upload } from './uploads'

const router = Router()

const ALLOWED_DOC_TYPES = ['BUSINESS_LICENSE', 'ID', 'UTILITY_BILL', 'OTHER'] as const

// ── Owner: upload a verification document ────────────────────────────────────
router.post('/shops/:shopId/verification-docs', authenticate, requireBarber, upload.single('file'), async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.shopId } })
  if (!shop || shop.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return }

  const documentType = ALLOWED_DOC_TYPES.includes(req.body.documentType) ? req.body.documentType : 'OTHER'

  const doc = await prisma.shopVerificationDocument.create({
    data: {
      shopId: req.params.shopId,
      url: `/uploads/${req.file.filename}`,
      documentType,
      caption: req.body.caption || null,
    },
  })

  // If shop was REJECTED, uploading a new doc moves it back to PENDING for re-review.
  if (shop.verificationStatus === 'REJECTED') {
    await prisma.barberShop.update({
      where: { id: shop.id },
      data: { verificationStatus: 'PENDING', verificationNotes: null },
    })
  }

  res.status(201).json(doc)
})

// Owner: list own docs
router.get('/shops/:shopId/verification-docs', authenticate, requireBarber, async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.shopId } })
  if (!shop || shop.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }
  const docs = await prisma.shopVerificationDocument.findMany({
    where: { shopId: req.params.shopId },
    orderBy: { createdAt: 'desc' },
  })
  res.json(docs)
})

// Owner: delete own doc (before admin review)
router.delete('/shops/:shopId/verification-docs/:docId', authenticate, requireBarber, async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.shopId } })
  if (!shop || shop.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }
  const doc = await prisma.shopVerificationDocument.findUnique({ where: { id: req.params.docId } })
  if (!doc || doc.shopId !== req.params.shopId) { res.status(404).json({ error: 'Document not found' }); return }
  await prisma.shopVerificationDocument.delete({ where: { id: req.params.docId } })
  res.json({ success: true })
})

// ── Admin: list shops awaiting review ────────────────────────────────────────
router.get('/admin/verifications', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const { status } = req.query
  const where = status === 'all' ? {} : { verificationStatus: String(status || 'PENDING') }

  const shops = await prisma.barberShop.findMany({
    where,
    include: {
      owner: { select: { id: true, email: true, name: true, phone: true } },
      verificationDocs: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(shops)
})

router.get('/admin/verifications/pending-count', authenticate, requireAdmin, async (_req, res) => {
  const count = await prisma.barberShop.count({ where: { verificationStatus: 'PENDING' } })
  res.json({ count })
})

// Admin: approve a shop
router.post('/admin/shops/:id/verify', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.id } })
  if (!shop) { res.status(404).json({ error: 'Shop not found' }); return }

  const updated = await prisma.barberShop.update({
    where: { id: req.params.id },
    data: {
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
      verifiedBy: req.userId,
      verificationNotes: null,
    },
  })
  res.json(updated)
})

// Admin: reject a shop with a reason
router.post('/admin/shops/:id/reject', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const { reason } = req.body
  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    res.status(400).json({ error: 'Please provide a clear reason (5+ characters) so the owner knows what to fix' })
    return
  }

  const shop = await prisma.barberShop.findUnique({ where: { id: req.params.id } })
  if (!shop) { res.status(404).json({ error: 'Shop not found' }); return }

  const updated = await prisma.barberShop.update({
    where: { id: req.params.id },
    data: {
      verificationStatus: 'REJECTED',
      verifiedAt: null,
      verifiedBy: req.userId,
      verificationNotes: reason.trim(),
    },
  })
  res.json(updated)
})

export default router
