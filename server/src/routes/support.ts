// Public endpoint for users (including suspended ones) to send a message
// to the admin. Creates a SupportTicket and emails the admin via Resend.
import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { sendSupportTicketToAdmin } from '../lib/email'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

const ADMIN_EMAIL_FOR_SUPPORT = 'nassersaleh156@gmail.com'

router.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    res.status(400).json({ error: 'Your name is required' })
    return
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'A valid email is required so we can reply' })
    return
  }
  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    res.status(400).json({ error: 'Please write a short message (5+ characters)' })
    return
  }

  // Try to attach userId if there's a valid token in the request (optional)
  let userId: string | null = null
  try {
    const auth = req.headers.authorization
    if (auth?.startsWith('Bearer ')) {
      const jwt = await import('jsonwebtoken')
      const decoded: any = jwt.default.verify(auth.slice(7), process.env.JWT_SECRET!)
      if (decoded?.userId) userId = decoded.userId
    }
  } catch { /* not authenticated — OK */ }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      subject: subject ? String(subject).trim().slice(0, 200) : null,
      message: message.trim(),
    },
  })

  // Fire-and-forget email to admin
  const supportAdmin = (process.env.SUPPORT_ADMIN_EMAIL || ADMIN_EMAIL_FOR_SUPPORT).toLowerCase().trim()
  sendSupportTicketToAdmin({
    adminEmail: supportAdmin,
    from: { name: ticket.name, email: ticket.email },
    subject: ticket.subject || undefined,
    message: ticket.message,
    ticketId: ticket.id,
  }).catch(() => {})

  res.status(201).json({ success: true, ticketId: ticket.id })
})

// Authenticated user can see their own tickets
router.get('/my-tickets', authenticate, async (req: AuthRequest, res) => {
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  })
  res.json(tickets)
})

export default router
