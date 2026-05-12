// Idempotent admin bootstrap — creates a platform admin on first boot if none exists.
// Configurable via ADMIN_EMAIL + ADMIN_PASSWORD env vars (set on Render).
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    // Nothing configured — skip silently. Set env vars to enable.
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } })
      console.log(`[admin-seed] Promoted ${email} to ADMIN`)
    }
    return
  }

  const hashed = await bcrypt.hash(password, 10)
  await prisma.user.create({
    data: {
      email,
      password: hashed,
      name: 'Platform Admin',
      role: 'ADMIN',
    },
  })
  console.log(`[admin-seed] Created admin account: ${email}`)
}
