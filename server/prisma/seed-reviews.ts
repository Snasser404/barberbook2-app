import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Past dates for seeded completed appointments
function pastDate(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

async function ensureCustomer(email: string, name: string) {
  const password = await bcrypt.hash('password123', 10)
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, password, name, role: 'CUSTOMER' },
  })
}

async function ensureCompletedAppointment(customerId: string, shopId: string, serviceId: string, daysAgo: number, time: string) {
  const date = pastDate(daysAgo)
  // Check if one already exists matching these specifics
  const existing = await prisma.appointment.findFirst({
    where: { customerId, shopId, serviceId, date, time },
  })
  if (existing) {
    if (existing.status !== 'COMPLETED') {
      await prisma.appointment.update({ where: { id: existing.id }, data: { status: 'COMPLETED' } })
    }
    return existing
  }
  return prisma.appointment.create({
    data: { customerId, shopId, serviceId, date, time, status: 'COMPLETED' },
  })
}

async function ensureReview(customerId: string, shopId: string, rating: number, comment: string) {
  const existing = await prisma.review.findUnique({
    where: { customerId_shopId: { customerId, shopId } },
  })
  if (existing) return existing
  return prisma.review.create({
    data: { customerId, shopId, rating, comment },
  })
}

async function recomputeShopRating(shopId: string) {
  const reviews = await prisma.review.findMany({ where: { shopId } })
  if (reviews.length === 0) return
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  await prisma.barberShop.update({
    where: { id: shopId },
    data: { rating: Math.round(avg * 10) / 10, reviewCount: reviews.length },
  })
}

async function main() {
  console.log('Seeding completed appointments + reviews...\n')

  // Add 3 demo reviewer customers (the original `customer@demo.com` is also used)
  const c1 = await ensureCustomer('customer@demo.com', 'Alex Customer')
  const c2 = await ensureCustomer('reviewer1@demo.com', 'Jordan Park')
  const c3 = await ensureCustomer('reviewer2@demo.com', 'Sam Rivera')
  const c4 = await ensureCustomer('reviewer3@demo.com', 'Taylor Quinn')
  console.log('Customers ready: Alex, Jordan, Sam, Taylor (all with password123)')

  // Get the 3 demo shops
  const shop1 = await prisma.barberShop.findFirst({ where: { name: "Marco's Classic Cuts" }, include: { services: true } })
  const shop2 = await prisma.barberShop.findFirst({ where: { name: 'The Modern Chair' }, include: { services: true } })
  const shop3 = await prisma.barberShop.findFirst({ where: { name: 'Fade Factory' }, include: { services: true } })

  if (!shop1 || !shop2 || !shop3) {
    console.error('Demo shops missing — run the original seed first')
    process.exit(1)
  }

  // ── Shop 1: Marco's Classic Cuts ──────────────────────────────────────────
  await ensureCompletedAppointment(c2.id, shop1.id, shop1.services[0].id, 14, '10:30')
  await ensureReview(c2.id, shop1.id, 5, 'Marco gave me the best haircut I\'ve had in years. The hot towel finish was the cherry on top — felt like a movie.')

  await ensureCompletedAppointment(c3.id, shop1.id, shop1.services[2].id, 7, '14:00')
  await ensureReview(c3.id, shop1.id, 5, 'Old-school straight razor shave. Marco knows what he\'s doing — patient, friendly, no rush. Will be back.')

  await ensureCompletedAppointment(c4.id, shop1.id, shop1.services[1].id, 21, '11:15')
  await ensureReview(c4.id, shop1.id, 4, 'Solid beard trim, shop has a great vibe. Took a bit longer than I expected but the result was worth it.')

  // ── Shop 2: The Modern Chair ──────────────────────────────────────────────
  await ensureCompletedAppointment(c1.id, shop2.id, shop2.services[0].id, 10, '13:00')
  await ensureReview(c1.id, shop2.id, 5, 'Jasmine\'s skin fade is unreal. Sharpest line-up I\'ve ever had. Worth every dollar.')

  await ensureCompletedAppointment(c2.id, shop2.id, shop2.services[1].id, 5, '16:30')
  await ensureReview(c2.id, shop2.id, 5, 'Designer cut — they actually listened to what I wanted and improved on it. Highly recommend.')

  await ensureCompletedAppointment(c3.id, shop2.id, shop2.services[0].id, 30, '11:00')
  await ensureReview(c3.id, shop2.id, 4, 'Great cut, modern feel to the studio. Wish parking nearby was easier but the haircut was 5/5.')

  // ── Shop 3: Fade Factory ──────────────────────────────────────────────────
  await ensureCompletedAppointment(c4.id, shop3.id, shop3.services[1].id, 3, '09:30')
  await ensureReview(c4.id, shop3.id, 5, 'Mid-fade was clean. Carlos is fast and friendly. Walk-in was no problem on a Tuesday.')

  await ensureCompletedAppointment(c1.id, shop3.id, shop3.services[0].id, 18, '15:45')
  await ensureReview(c1.id, shop3.id, 4, 'Fast buzz cut, did exactly what I asked. No frills shop, fair pricing.')

  // Recompute ratings from real reviews
  await recomputeShopRating(shop1.id)
  await recomputeShopRating(shop2.id)
  await recomputeShopRating(shop3.id)

  const final = await prisma.barberShop.findMany({ select: { name: true, rating: true, reviewCount: true } })
  console.log('\nFinal ratings:')
  console.table(final)

  console.log('\n✅ Seed complete!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
