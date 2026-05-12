import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validatePassword, PASSWORD_MIN_LENGTH } from '../lib/password'
import { sendVerificationEmail, sendPasswordResetEmail, generateVerificationCode, getAppUrl } from '../lib/email'

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
    const code = generateVerificationCode()
    const codeExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashed,
        emailVerificationCode: code,
        emailVerificationExpires: codeExpires,
      },
      select: { id: true, email: true, name: true, role: true, phone: true, avatar: true, emailVerified: true },
    })

    // Fire-and-forget — don't block signup if email service is slow
    sendVerificationEmail(user.email, user.name, code).catch(() => {})

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
    const { password: _pw, emailVerificationCode: _ec, passwordResetToken: _rt, ...userWithoutPassword } = user as any
    res.json({ user: userWithoutPassword, token })
  } catch (err: any) {
    if (err.name === 'ZodError') { res.status(400).json({ error: err.errors }); return }
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, name: true, role: true, phone: true, avatar: true, emailVerified: true },
  })
  if (!user) { res.status(404).json({ error: 'User not found' }); return }
  res.json(user)
})

// Verify email with a 6-digit code sent on signup
router.post('/verify-email', authenticate, async (req: AuthRequest, res) => {
  const { code } = req.body
  if (!code) { res.status(400).json({ error: 'Verification code required' }); return }

  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user) { res.status(404).json({ error: 'User not found' }); return }
  if (user.emailVerified) { res.json({ success: true, alreadyVerified: true }); return }

  if (!user.emailVerificationCode || user.emailVerificationCode !== String(code).trim()) {
    res.status(400).json({ error: 'Invalid verification code' })
    return
  }
  if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
    res.status(400).json({ error: 'Verification code has expired — request a new one' })
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerificationCode: null, emailVerificationExpires: null },
  })
  res.json({ success: true })
})

// Resend verification code (rate-limited by the database flow — old code overwritten)
router.post('/resend-verification', authenticate, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user) { res.status(404).json({ error: 'User not found' }); return }
  if (user.emailVerified) { res.json({ success: true, alreadyVerified: true }); return }

  const code = generateVerificationCode()
  const codeExpires = new Date(Date.now() + 60 * 60 * 1000)
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerificationCode: code, emailVerificationExpires: codeExpires },
  })
  sendVerificationEmail(user.email, user.name, code).catch(() => {})
  res.json({ success: true })
})

// Forgot password — send reset email. Always return success (don't leak which emails exist).
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email || typeof email !== 'string') { res.status(400).json({ error: 'Email required' }); return }
  const normalized = email.toLowerCase().trim()

  const user = await prisma.user.findUnique({ where: { email: normalized } })
  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    })
    const resetLink = `${getAppUrl()}/reset-password?token=${token}`
    sendPasswordResetEmail(user.email, user.name, resetLink).catch(() => {})
  }
  // Always return success — security best-practice to not reveal account existence
  res.json({ success: true })
})

// Reset password using token from email
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body
  if (!token || !newPassword) { res.status(400).json({ error: 'Token and new password are required' }); return }

  const pw = validatePassword(newPassword)
  if (!pw.ok) { res.status(400).json({ error: pw.error }); return }

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: String(token),
      passwordResetExpires: { gt: new Date() },
    },
  })
  if (!user) { res.status(400).json({ error: 'Invalid or expired reset link' }); return }

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, passwordResetToken: null, passwordResetExpires: null },
  })
  res.json({ success: true })
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
