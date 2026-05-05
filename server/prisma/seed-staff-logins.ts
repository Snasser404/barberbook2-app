import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function ensureStaffUser(staffName: string, email: string) {
  const password = await bcrypt.hash('password123', 10)
  // If user exists, just return
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    user = await prisma.user.create({
      data: { email, password, name: staffName, role: 'STAFF' },
    })
  }
  return user
}

async function linkStaffToUser(staffId: string, userId: string) {
  await prisma.staff.update({
    where: { id: staffId },
    data: { userId },
  })
}

async function main() {
  console.log('Linking staff to user accounts...\n')

  // The 3 owners ALSO have staff profiles (they cut hair too)
  const ownerLinks = [
    { staffName: 'Marco Rossi', ownerEmail: 'barber1@demo.com' },
    { staffName: 'Jasmine Lee', ownerEmail: 'barber2@demo.com' },
    { staffName: 'Carlos Mendez', ownerEmail: 'barber3@demo.com' },
  ]
  for (const { staffName, ownerEmail } of ownerLinks) {
    const owner = await prisma.user.findUnique({ where: { email: ownerEmail } })
    const staff = await prisma.staff.findFirst({ where: { name: staffName } })
    if (owner && staff && !staff.userId) {
      await linkStaffToUser(staff.id, owner.id)
      console.log(`Linked ${staffName} (staff) to ${ownerEmail} (owner)`)
    }
  }

  // Other staff get their own STAFF user accounts
  const staffLogins = [
    { staffName: 'Tony Caruso', email: 'tony@demo.com' },
    { staffName: 'Enzo Bianchi', email: 'enzo@demo.com' },
    { staffName: 'Devon Park', email: 'devon@demo.com' },
    { staffName: 'Ricky Hernandez', email: 'ricky@demo.com' },
  ]
  for (const { staffName, email } of staffLogins) {
    const staff = await prisma.staff.findFirst({ where: { name: staffName } })
    if (!staff) {
      console.warn(`Staff not found: ${staffName}`)
      continue
    }
    if (staff.userId) {
      console.log(`${staffName} already linked`)
      continue
    }
    const user = await ensureStaffUser(staffName, email)
    await linkStaffToUser(staff.id, user.id)
    console.log(`${staffName} → ${email} / password123`)
  }

  console.log('\n✅ Staff logins ready. All passwords: password123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
