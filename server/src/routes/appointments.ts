import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, requireCustomer, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/', authenticate, async (req: AuthRequest, res) => {
  if (req.userRole === 'CUSTOMER') {
    const appointments = await prisma.appointment.findMany({
      where: { customerId: req.userId },
      include: {
        shop: { select: { id: true, name: true, address: true, coverImage: true } },
        service: true,
        staff: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
    })
    res.json(appointments)
  } else if (req.userRole === 'STAFF') {
    // Staff sees only appointments assigned to them
    const staff = await prisma.staff.findUnique({ where: { userId: req.userId } })
    if (!staff) { res.json([]); return }
    const appointments = await prisma.appointment.findMany({
      where: { staffId: staff.id },
      include: {
        customer: { select: { id: true, name: true, phone: true, avatar: true } },
        service: true,
        staff: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    })
    res.json(appointments)
  } else {
    const shop = await prisma.barberShop.findUnique({ where: { ownerId: req.userId } })
    if (!shop) { res.json([]); return }
    const appointments = await prisma.appointment.findMany({
      where: { shopId: shop.id },
      include: {
        customer: { select: { id: true, name: true, phone: true, avatar: true } },
        service: true,
        staff: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    })
    res.json(appointments)
  }
})

router.post('/', authenticate, requireCustomer, async (req: AuthRequest, res) => {
  const { shopId, serviceId, staffId, date, time, notes } = req.body
  if (!shopId || !serviceId || !date || !time) {
    res.status(400).json({ error: 'shopId, serviceId, date, and time are required' })
    return
  }

  // Check slot is still available
  const service = await prisma.service.findUnique({ where: { id: serviceId } })
  if (!service) { res.status(404).json({ error: 'Service not found' }); return }

  // Validate staff belongs to this shop, if provided
  if (staffId) {
    const staff = await prisma.staff.findUnique({ where: { id: staffId } })
    if (!staff || staff.shopId !== shopId) {
      res.status(400).json({ error: 'Staff member not part of this shop' })
      return
    }
  }

  const slotMin = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1])

  // Prevent the customer from double-booking themselves at overlapping times
  const customerConflict = await prisma.appointment.findFirst({
    where: {
      customerId: req.userId!, date,
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    include: { service: true },
  })
  if (customerConflict) {
    const apptMin = parseInt(customerConflict.time.split(':')[0]) * 60 + parseInt(customerConflict.time.split(':')[1])
    if (slotMin < apptMin + customerConflict.service.duration && slotMin + service.duration > apptMin) {
      res.status(409).json({ error: 'You already have an appointment that overlaps with this time' })
      return
    }
  }

  // Find ALL conflicts (not just one) — if staff specified check only their schedule,
  // otherwise treat the shop as a single chair (backwards-compatible).
  const conflictingList = await prisma.appointment.findMany({
    where: {
      shopId, date,
      status: { in: ['PENDING', 'CONFIRMED'] },
      ...(staffId ? { staffId } : { staffId: null }),
    },
    include: { service: true },
  })
  for (const conflicting of conflictingList) {
    const apptMin = parseInt(conflicting.time.split(':')[0]) * 60 + parseInt(conflicting.time.split(':')[1])
    if (slotMin < apptMin + conflicting.service.duration && slotMin + service.duration > apptMin) {
      res.status(409).json({ error: 'This time slot is no longer available' })
      return
    }
  }

  const appointment = await prisma.appointment.create({
    data: { customerId: req.userId!, shopId, serviceId, staffId: staffId || null, date, time, notes },
    include: {
      shop: { select: { id: true, name: true, address: true } },
      service: true,
      staff: { select: { id: true, name: true, avatar: true } },
    },
  })
  res.status(201).json(appointment)
})

// Cancellation policy: free if cancelled 3+ hours before, otherwise 50% of service price
const CANCELLATION_NOTICE_HOURS = 3
const CANCELLATION_FEE_RATIO = 0.5

function hoursUntilAppointment(date: string, time: string): number {
  const apptDate = new Date(`${date}T${time}:00`)
  return (apptDate.getTime() - Date.now()) / (1000 * 60 * 60)
}

router.put('/:id/status', authenticate, async (req: AuthRequest, res) => {
  const { status } = req.body
  const appointment = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: { shop: true, service: true },
  })
  if (!appointment) { res.status(404).json({ error: 'Not found' }); return }

  const isOwner = appointment.shop.ownerId === req.userId
  const isCustomer = appointment.customerId === req.userId
  let isAssignedStaff = false
  if (req.userRole === 'STAFF') {
    const staff = await prisma.staff.findUnique({ where: { userId: req.userId } })
    isAssignedStaff = !!staff && appointment.staffId === staff.id
  }

  if (!isOwner && !isCustomer && !isAssignedStaff) { res.status(403).json({ error: 'Forbidden' }); return }

  const allowed: Record<string, string[]> = {
    BARBER: ['CONFIRMED', 'CANCELLED', 'COMPLETED'],
    STAFF: ['CONFIRMED', 'CANCELLED', 'COMPLETED'],
    CUSTOMER: ['CANCELLED'],
  }
  if (!allowed[req.userRole!]?.includes(status)) {
    res.status(400).json({ error: 'Invalid status transition' })
    return
  }

  // Compute cancellation fee for late customer cancellations
  let cancellationFee = 0
  let lateCancellation = false
  if (status === 'CANCELLED' && isCustomer) {
    const hoursLeft = hoursUntilAppointment(appointment.date, appointment.time)
    if (hoursLeft < CANCELLATION_NOTICE_HOURS && hoursLeft > -1) {
      lateCancellation = true
      cancellationFee = Math.round(appointment.service.price * CANCELLATION_FEE_RATIO * 100) / 100
    }
  }

  const updated = await prisma.appointment.update({ where: { id: req.params.id }, data: { status } })
  res.json({ ...updated, lateCancellation, cancellationFee })
})

// Expose policy so client can show consistent messaging
router.get('/policy', (_req, res) => {
  res.json({
    cancellationNoticeHours: CANCELLATION_NOTICE_HOURS,
    cancellationFeeRatio: CANCELLATION_FEE_RATIO,
  })
})

export default router
