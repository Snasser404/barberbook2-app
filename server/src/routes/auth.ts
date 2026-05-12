import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validatePassword, PASSWORD_MIN_LENGTH } from '../lib/password'

const router = Router()

const registerSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  password: z.string(),
  name: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(['CUSTOMER', 'BARBER']).default('CUSTOMER'),
})

const loginSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  password: z.string(),
})

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body)

    const pw = validatePassword(data.password)
    if (!pw.ok) { res.status(400).json({ error: pw.error }); return }

    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) { res.status(400).json({ error: 'An account with this email already exists' }); return }

    const hashed = await bcrypt.hash(data.password, 10)
    const user = await prisma.user.create({
      data: { ...data, password: hashed },
      select: { id: true, email: true, name: true, role: true, phone: true, avatar: true },
    })
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' })
    res.json({ user, token })
  } catch (err: any) {
    if (err.name === 'ZodError') { res.status(400).json({ error: err.errors[0]?.message || 'Invalid input' }); return }
    res.status(500).json({ error: 'Server error' })
  }
})

// Get password rules so the UI can display them
router.get('/password-rules', (_req, res) => {
  res.json({
    minLength: PASSWORD_MIN_LENGTH,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
  })
})

// Change password (must be authenticated; provide currentPassword)
router.post('/change-password', authenticate, async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current and new passwords are required' })
    return
  }
  const pw = validatePassword(newPassword)
  if (!pw.ok) { res.status(400).json({ error: pw.error }); return }

  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user) { res.status(404).json({ error: 'User not found' }); return }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) { res.status(401).json({ error: 'Current password is incorrect' }); return }

  // Prevent reusing the same password
  const same = await bcrypt.compare(newPassword, user.password)
  if (same) { res.status(400).json({ error: 'New password must be different from your current password' }); return }

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: req.userId }, data: { password: hashed } })
  res.json({ success: true })
})

router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email: data.email } })
    if (!user) { res.status(401).json({ error: 'Invalid credentials' }); return }

    const valid = await bcrypt.compare(data.password, user.password)
    if (!valid) { res.status(401).json({ error: 'Invalid credentials' }); return }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' })
    const { password: _pw, ...userWithoutPassword } = user
    res.json({ user: userWithoutPassword, token })
  } catch (err: any) {
    if (err.name === 'ZodError') { res.status(400).json({ error: err.errors }); return }
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, name: true, role: true, phone: true, avatar: true },
  })
  if (!user) { res.status(404).json({ error: 'User not found' }); return }
  res.json(user)
})

router.put('/me', authenticate, async (req: AuthRequest, res) => {
  const { name, phone, avatar } = req.body
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: {
      name: name !== undefined ? name : undefined,
      phone: phone !== undefined ? phone : undefined,
      avatar: avatar !== undefined ? avatar : undefined,
    },
    select: { id: true, email: true, name: true, role: true, phone: true, avatar: true },
  })
  res.json(user)
})

export default router
