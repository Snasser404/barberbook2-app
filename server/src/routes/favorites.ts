import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireCustomer, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/', authenticate, requireCustomer, async (req: AuthRequest, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { customerId: req.userId },
    include: {
      shop: {
        include: { services: { where: { isActive: true } }, images: true },
      },
    },
  })
  res.json(favorites.map((f) => f.shop))
})

router.post('/:shopId', authenticate, requireCustomer, async (req: AuthRequest, res) => {
  const existing = await prisma.favorite.findUnique({
    where: { customerId_shopId: { customerId: req.userId!, shopId: req.params.shopId } },
  })
  if (existing) { res.json({ already: true }); return }

  await prisma.favorite.create({ data: { customerId: req.userId!, shopId: req.params.shopId } })
  res.status(201).json({ success: true })
})

router.delete('/:shopId', authenticate, requireCustomer, async (req: AuthRequest, res) => {
  await prisma.favorite.deleteMany({
    where: { customerId: req.userId, shopId: req.params.shopId },
  })
  res.json({ success: true })
})

export default router
