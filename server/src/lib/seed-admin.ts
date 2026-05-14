// Idempotent admin bootstrap — creates a platform admin on first boot if none exists.
// Configurable via ADMIN_EMAIL + ADMIN_PASSWORD env vars (set on Render).
// Also marks any account matching SUPER_ADMIN_EMAIL as the super-admin (immune
// to demotion/deletion by other admins).
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

// The platform's owner — protected from being suspended, demoted or deleted by
// other admins. Hard-coded fallback so deployment doesn't require an extra env var.
const SUPER_ADMIN_EMAIL_DEFAULT = 'nassersaleh156@gmail.com'

export async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const password = process.env.ADMIN_PASSWORD
  if (email && password) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      if (existing.role !== 'ADMIN') {
        await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } })
        console.log(`[admin-seed] Promoted ${email} to ADMIN`)
      }
    } else {
      const hashed = await bcrypt.hash(password, 10)
      await prisma.user.create({
        data: { email, password: hashed, name: 'Platform Admin', role: 'ADMIN', emailVerified: true },
      })
      console.log(`[admin-seed] Created admin account: ${email}`)
    }
  }

  // Promote the super-admin email to ADMIN + isSuperAdmin if it exists.
  // We do NOT create the user if it doesn't exist — they sign up normally first.
  const superEmail = (process.env.SUPER_ADMIN_EMAIL || SUPER_ADMIN_EMAIL_DEFAULT).toLowerCase().trim()
  if (superEmail) {
    const user = await prisma.user.findUnique({ where: { email: superEmail } })
    if (user) {
      const needsUpdate = user.role !== 'ADMIN' || !user.isSuperAdmin
      if (needsUpdate) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'ADMIN', isSuperAdmin: true, deletedAt: null },
        })
        console.log(`[admin-seed] Marked ${superEmail} as SUPER ADMIN`)
      }
    } else {
      console.log(`[admin-seed] Super-admin email not yet registered: ${superEmail}`)
    }
  }
}
