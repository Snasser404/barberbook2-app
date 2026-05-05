import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function pastDate(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

async function ensureStaff(shopId: string, name: string, bio: string, specialties: string) {
  const existing = await prisma.staff.findFirst({ where: { shopId, name } })
  if (existing) return existing
  return prisma.staff.create({ data: { shopId, name, bio, specialties } })
}

async function ensureCompletedAppt(customerId: string, shopId: string, serviceId: string, staffId: string, daysAgo: number, time: string) {
  const date = pastDate(daysAgo)
  const existing = await prisma.appointment.findFirst({ where: { customerId, shopId, serviceId, staffId, date, time } })
  if (existing) {
    if (existing.status !== 'COMPLETED') {
      await prisma.appointment.update({ where: { id: existing.id }, data: { status: 'COMPLETED' } })
    }
    return existing
  }
  return prisma.appointment.create({
    data: { customerId, shopId, serviceId, staffId, date, time, status: 'COMPLETED' },
  })
}

async function ensureStaffReview(customerId: string, staffId: string, rating: number, comment: string) {
  const existing = await prisma.staffReview.findUnique({ where: { customerId_staffId: { customerId, staffId } } })
  if (existing) return existing
  return prisma.staffReview.create({ data: { customerId, staffId, rating, comment } })
}

async function recomputeStaffRating(staffId: string) {
  const reviews = await prisma.staffReview.findMany({ where: { staffId } })
  if (reviews.length === 0) return
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  await prisma.staff.update({
    where: { id: staffId },
    data: { rating: Math.round(avg * 10) / 10, reviewCount: reviews.length },
  })
}

async function main() {
  console.log('Seeding staff, appointments, and reviews...\n')

  const shop1 = await prisma.barberShop.findFirst({ where: { name: "Marco's Classic Cuts" }, include: { services: true } })
  const shop2 = await prisma.barberShop.findFirst({ where: { name: 'The Modern Chair' }, include: { services: true } })
  const shop3 = await prisma.barberShop.findFirst({ where: { name: 'Fade Factory' }, include: { services: true } })

  if (!shop1 || !shop2 || !shop3) {
    console.error('Demo shops missing — run the original seed first')
    process.exit(1)
  }

  const c1 = await prisma.user.findUnique({ where: { email: 'customer@demo.com' } })
  const c2 = await prisma.user.findUnique({ where: { email: 'reviewer1@demo.com' } })
  const c3 = await prisma.user.findUnique({ where: { email: 'reviewer2@demo.com' } })
  const c4 = await prisma.user.findUnique({ where: { email: 'reviewer3@demo.com' } })

  if (!c1 || !c2 || !c3 || !c4) {
    console.error('Demo customers missing — run seed-reviews.ts first')
    process.exit(1)
  }

  // ── Shop 1: Marco's Classic Cuts ──────────────────────────────────────────
  const marco = await ensureStaff(shop1.id, 'Marco Rossi', 'Owner & master barber. 20+ years of experience in classic cuts and hot towel shaves. Trained in Italy.', 'Classic cuts,Hot shaves,Beard sculpting')
  const tony = await ensureStaff(shop1.id, 'Tony Caruso', 'Specialty: razor work and traditional pompadours. Known for being meticulous with the details.', 'Razor work,Pompadours,Side parts')
  const enzo = await ensureStaff(shop1.id, 'Enzo Bianchi', 'Junior barber, fast and friendly. Great with kids and quick lunch-break trims.', 'Kids cuts,Quick trims,Buzz cuts')

  // Completed appointments + staff reviews
  await ensureCompletedAppt(c2.id, shop1.id, shop1.services[0].id, marco.id, 14, '10:30')
  await ensureStaffReview(c2.id, marco.id, 5, 'Marco is a true master. The attention to detail is unreal.')

  await ensureCompletedAppt(c3.id, shop1.id, shop1.services[2].id, marco.id, 7, '14:00')
  await ensureStaffReview(c3.id, marco.id, 5, 'Best straight razor shave of my life. Patient and skilled.')

  await ensureCompletedAppt(c4.id, shop1.id, shop1.services[1].id, tony.id, 21, '11:15')
  await ensureStaffReview(c4.id, tony.id, 4, 'Tony is great — really focused on the details. Took a bit longer but worth it.')

  await ensureCompletedAppt(c1.id, shop1.id, shop1.services[3].id, tony.id, 12, '15:00')
  await ensureStaffReview(c1.id, tony.id, 5, 'Tony nailed the pompadour exactly how I described it. Highly recommend.')

  await ensureCompletedAppt(c2.id, shop1.id, shop1.services[1].id, enzo.id, 4, '12:30')
  await ensureStaffReview(c2.id, enzo.id, 4, 'Quick and friendly. Got me in and out on my lunch break.')

  // ── Shop 2: The Modern Chair ──────────────────────────────────────────────
  const jasmine = await ensureStaff(shop2.id, 'Jasmine Lee', 'Owner. Specialist in skin fades and creative styling. Featured in Modern Barber Magazine.', 'Skin fades,Creative styling,Color')
  const devon = await ensureStaff(shop2.id, 'Devon Park', 'Designer cuts and trendy styles. Known for being in tune with the latest looks.', 'Designer cuts,Trends,Texture')

  await ensureCompletedAppt(c1.id, shop2.id, shop2.services[0].id, jasmine.id, 10, '13:00')
  await ensureStaffReview(c1.id, jasmine.id, 5, 'Jasmine is a magician with the clippers. Cleanest fade I\'ve ever had.')

  await ensureCompletedAppt(c2.id, shop2.id, shop2.services[1].id, devon.id, 5, '16:30')
  await ensureStaffReview(c2.id, devon.id, 5, 'Devon really listened and gave me a cut I never thought of. Awesome.')

  await ensureCompletedAppt(c3.id, shop2.id, shop2.services[0].id, jasmine.id, 30, '11:00')
  await ensureStaffReview(c3.id, jasmine.id, 4, 'Great cut. Jasmine is friendly and professional.')

  // ── Shop 3: Fade Factory ──────────────────────────────────────────────────
  const carlos = await ensureStaff(shop3.id, 'Carlos Mendez', 'Owner. Fast and precise. Walk-ins welcome. 10+ years specializing in fades.', 'Mid fades,Tapers,Walk-ins')
  const ricky = await ensureStaff(shop3.id, 'Ricky Hernandez', 'Beard work and line-ups. Patient with first-timers.', 'Beard sculpting,Line-ups,Buzz cuts')

  await ensureCompletedAppt(c4.id, shop3.id, shop3.services[1].id, carlos.id, 3, '09:30')
  await ensureStaffReview(c4.id, carlos.id, 5, 'Carlos is the fade king. Quick, clean, no-nonsense.')

  await ensureCompletedAppt(c1.id, shop3.id, shop3.services[0].id, carlos.id, 18, '15:45')
  await ensureStaffReview(c1.id, carlos.id, 4, 'Solid buzz cut. Carlos is fast and gets it right.')

  await ensureCompletedAppt(c3.id, shop3.id, shop3.services[2].id, ricky.id, 9, '13:15')
  await ensureStaffReview(c3.id, ricky.id, 5, 'Ricky did an amazing beard sculpt. Very patient and detail-oriented.')

  // Recompute ratings
  for (const s of [marco, tony, enzo, jasmine, devon, carlos, ricky]) {
    await recomputeStaffRating(s.id)
  }

  const final = await prisma.staff.findMany({
    select: { name: true, rating: true, reviewCount: true, shop: { select: { name: true } } },
    orderBy: { rating: 'desc' },
  })
  console.log('\nFinal staff ratings:')
  console.table(final.map((s) => ({ shop: s.shop.name, name: s.name, rating: s.rating, reviews: s.reviewCount })))

  console.log('\n✅ Staff seed complete!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
