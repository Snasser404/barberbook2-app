import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireCustomer, AuthRequest } from '../middleware/auth'
import { upload } from './uploads'

const router = Router()

// Customer: list own photos (with optional ?type filter)
router.get('/', authenticate, requireCustomer, async (req: AuthRequest, res) => {
  const { type, appointmentId } = req.query
  const photos = await prisma.customerPhoto.findMany({
    where: {
      customerId: req.userId!,
      ...(type ? { type: String(type) } : {}),
      ...(appointmentId ? { appointmentId: String(appointmentId) } : {}),
    },
    include: {
      appointment: {
        include: {
          shop: { select: { id: true, name: true } },
          staff: { select: { id: true, name: true } },
          service: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(photos)
})

// Customer: upload a new photo (file + metadata together)
router.post('/', authenticate, requireCustomer, upload.single('photo'), async (req: AuthRequest, res) => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return }
  const { caption, type, appointmentId } = req.body

  // Validate appointment ownership + only allow sharing on upcoming visits
  if (appointmentId) {
    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } })
    if (!appt || appt.customerId !== req.userId) {
      res.status(403).json({ error: 'Cannot attach to that appointment' })
      return
    }
    if (type !== 'COMPLETED' && (appt.status === 'COMPLETED' || appt.status === 'CANCELLED')) {
      res.status(400).json({ error: "Inspiration photos can only be shared on upcoming visits" })
      return
    }
  }

  const photo = await prisma.customerPhoto.create({
    data: {
      customerId: req.userId!,
      url: `/uploads/${req.file.filename}`,
      caption: caption || null,
      type: type === 'COMPLETED' ? 'COMPLETED' : 'INSPIRATION',
      appointmentId: appointmentId || null,
    },
    include: {
      appointment: {
        include: {
          shop: { select: { id: true, name: true } },
          staff: { select: { id: true, name: true } },
          service: { select: { id: true, name: true } },
        },
      },
    },
  })
  res.status(201).json(photo)
})

// Customer: update photo metadata (caption, type, appointment link)
router.put('/:id', authenticate, requireCustomer, async (req: AuthRequest, res) => {
  const photo = await prisma.customerPhoto.findUnique({ where: { id: req.params.id } })
  if (!photo || photo.customerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }

  const { caption, type, appointmentId } = req.body

  if (appointmentId !== undefined && appointmentId !== null) {
    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } })
    if (!appt || appt.customerId !== req.userId) {
      res.status(403).json({ error: 'Cannot attach to that appointment' })
      return
    }
    const wantedType = type || photo.type
    if (wantedType !== 'COMPLETED' && (appt.status === 'COMPLETED' || appt.status === 'CANCELLED')) {
      res.status(400).json({ error: "Inspiration photos can only be shared on upcoming visits" })
      return
    }
  }

  const updated = await prisma.customerPhoto.update({
    where: { id: req.params.id },
    data: {
      caption: caption !== undefined ? caption : undefined,
      type: type === 'COMPLETED' ? 'COMPLETED' : type === 'INSPIRATION' ? 'INSPIRATION' : undefined,
      appointmentId: appointmentId === null ? null : appointmentId !== undefined ? appointmentId : undefined,
    },
    include: {
      appointment: {
        include: {
          shop: { select: { id: true, name: true } },
          staff: { select: { id: true, name: true } },
          service: { select: { id: true, name: true } },
        },
      },
    },
  })
  res.json(updated)
})

// Customer: delete photo
router.delete('/:id', authenticate, requireCustomer, async (req: AuthRequest, res) => {
  const photo = await prisma.customerPhoto.findUnique({ where: { id: req.params.id } })
  if (!photo || photo.customerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return }

  await prisma.customerPhoto.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

// Photos attached to an appointment — visible to:
//   - the customer who owns the appointment
//   - the staff assigned to it
//   - the shop owner
router.get('/appointment/:appointmentId', authenticate, async (req: AuthRequest, res) => {
  const appt = await prisma.appointment.findUnique({
    where: { id: req.params.appointmentId },
    include: { shop: true, staff: true },
  })
  if (!appt) { res.status(404).json({ error: 'Appointment not found' }); return }

  const isCustomer = appt.customerId === req.userId
  const isOwner = appt.shop.ownerId === req.userId
  let isAssignedStaff = false
  if (req.userRole === 'STAFF' && appt.staffId) {
    const staff = await prisma.staff.findUnique({ where: { userId: req.userId } })
    isAssignedStaff = !!staff && staff.id === appt.staffId
  }

  if (!isCustomer && !isOwner && !isAssignedStaff) { res.status(403).json({ error: 'Forbidden' }); return }

  const photos = await prisma.customerPhoto.findMany({
    where: { appointmentId: req.params.appointmentId },
    orderBy: { createdAt: 'desc' },
  })
  res.json(photos)
})

export default router
