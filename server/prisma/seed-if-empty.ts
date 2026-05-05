// Idempotent seed: only seeds when DB is empty. Safe to run on every deploy.
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function pastDate(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

async function main() {
  const userCount = await prisma.user.count()
  if (userCount > 0) {
    console.log(`Skipping seed — DB already has ${userCount} users.`)
    return
  }

  console.log('DB is empty — seeding demo data...')
  const password = await bcrypt.hash('password123', 10)

  // Customers
  const c1 = await prisma.user.create({ data: { email: 'customer@demo.com', password, name: 'Alex Customer', phone: '+1 555 0100', role: 'CUSTOMER' } })
  const c2 = await prisma.user.create({ data: { email: 'reviewer1@demo.com', password, name: 'Jordan Park', role: 'CUSTOMER' } })
  const c3 = await prisma.user.create({ data: { email: 'reviewer2@demo.com', password, name: 'Sam Rivera', role: 'CUSTOMER' } })
  const c4 = await prisma.user.create({ data: { email: 'reviewer3@demo.com', password, name: 'Taylor Quinn', role: 'CUSTOMER' } })

  // Shop 1: Marco's Classic Cuts
  const owner1 = await prisma.user.create({ data: { email: 'barber1@demo.com', password, name: 'Marco Rossi', role: 'BARBER' } })
  const shop1 = await prisma.barberShop.create({
    data: {
      ownerId: owner1.id, name: "Marco's Classic Cuts",
      address: '123 Main St, Downtown',
      description: 'Classic gentleman\'s barbershop with old-school style and modern technique. Hot towel shaves a specialty.',
      phone: '+1 555 0200', openingTime: '09:00', closingTime: '19:00',
      latitude: 40.7128, longitude: -74.0060,
    },
  })
  const s1Services = await Promise.all([
    prisma.service.create({ data: { shopId: shop1.id, name: 'Classic Haircut', description: 'Traditional scissor cut with styling', price: 30, duration: 30 } }),
    prisma.service.create({ data: { shopId: shop1.id, name: 'Beard Trim', description: 'Shape and trim with hot towel finish', price: 18, duration: 20 } }),
    prisma.service.create({ data: { shopId: shop1.id, name: 'Hot Towel Shave', description: 'Full straight-razor shave with hot towels', price: 35, duration: 45 } }),
    prisma.service.create({ data: { shopId: shop1.id, name: 'Haircut + Beard', description: 'The complete grooming package', price: 45, duration: 50 } }),
  ])
  await prisma.offer.create({ data: { shopId: shop1.id, title: 'Tuesday Special', description: '20% off all services every Tuesday', discountPercent: 20 } })

  const marco = await prisma.staff.create({ data: { shopId: shop1.id, userId: owner1.id, name: 'Marco Rossi', bio: 'Owner & master barber. 20+ years of experience in classic cuts and hot towel shaves. Trained in Italy.', specialties: 'Classic cuts,Hot shaves,Beard sculpting' } })
  const tonyUser = await prisma.user.create({ data: { email: 'tony@demo.com', password, name: 'Tony Caruso', role: 'STAFF' } })
  const tony = await prisma.staff.create({ data: { shopId: shop1.id, userId: tonyUser.id, name: 'Tony Caruso', bio: 'Specialty: razor work and traditional pompadours. Known for being meticulous with the details.', specialties: 'Razor work,Pompadours,Side parts' } })
  const enzoUser = await prisma.user.create({ data: { email: 'enzo@demo.com', password, name: 'Enzo Bianchi', role: 'STAFF' } })
  const enzo = await prisma.staff.create({ data: { shopId: shop1.id, userId: enzoUser.id, name: 'Enzo Bianchi', bio: 'Junior barber, fast and friendly. Great with kids and quick lunch-break trims.', specialties: 'Kids cuts,Quick trims,Buzz cuts' } })

  // Shop 2: The Modern Chair
  const owner2 = await prisma.user.create({ data: { email: 'barber2@demo.com', password, name: 'Jasmine Lee', role: 'BARBER' } })
  const shop2 = await prisma.barberShop.create({
    data: {
      ownerId: owner2.id, name: 'The Modern Chair',
      address: '456 Park Ave, Midtown',
      description: 'Contemporary studio offering precision cuts, fades, and creative styling.',
      phone: '+1 555 0300', openingTime: '10:00', closingTime: '20:00',
      latitude: 40.7549, longitude: -73.9840,
    },
  })
  const s2Services = await Promise.all([
    prisma.service.create({ data: { shopId: shop2.id, name: 'Skin Fade', description: 'Sharp, precise fade with detailed line-up', price: 40, duration: 40 } }),
    prisma.service.create({ data: { shopId: shop2.id, name: 'Designer Cut', description: 'Custom styling consultation included', price: 55, duration: 60 } }),
    prisma.service.create({ data: { shopId: shop2.id, name: 'Kids Cut (under 12)', description: 'Quick, fun cut for kids', price: 22, duration: 25 } }),
  ])
  const jasmine = await prisma.staff.create({ data: { shopId: shop2.id, userId: owner2.id, name: 'Jasmine Lee', bio: 'Owner. Specialist in skin fades and creative styling. Featured in Modern Barber Magazine.', specialties: 'Skin fades,Creative styling,Color' } })
  const devonUser = await prisma.user.create({ data: { email: 'devon@demo.com', password, name: 'Devon Park', role: 'STAFF' } })
  const devon = await prisma.staff.create({ data: { shopId: shop2.id, userId: devonUser.id, name: 'Devon Park', bio: 'Designer cuts and trendy styles. Known for being in tune with the latest looks.', specialties: 'Designer cuts,Trends,Texture' } })

  // Shop 3: Fade Factory
  const owner3 = await prisma.user.create({ data: { email: 'barber3@demo.com', password, name: 'Carlos Mendez', role: 'BARBER' } })
  const shop3 = await prisma.barberShop.create({
    data: {
      ownerId: owner3.id, name: 'Fade Factory',
      address: '789 Oak Blvd, Westside',
      description: 'Specializing in fades, tapers, and trendy modern styles. Walk-ins welcome.',
      phone: '+1 555 0400', openingTime: '08:00', closingTime: '18:00',
      latitude: 40.7831, longitude: -73.9712,
    },
  })
  const s3Services = await Promise.all([
    prisma.service.create({ data: { shopId: shop3.id, name: 'Buzz Cut', description: 'Fast and clean', price: 20, duration: 15 } }),
    prisma.service.create({ data: { shopId: shop3.id, name: 'Mid Fade', description: 'Classic mid fade with scissor work on top', price: 35, duration: 35 } }),
    prisma.service.create({ data: { shopId: shop3.id, name: 'Beard Sculpt', description: 'Detailed beard shaping and line-up', price: 25, duration: 25 } }),
  ])
  const carlos = await prisma.staff.create({ data: { shopId: shop3.id, userId: owner3.id, name: 'Carlos Mendez', bio: 'Owner. Fast and precise. Walk-ins welcome. 10+ years specializing in fades.', specialties: 'Mid fades,Tapers,Walk-ins' } })
  const rickyUser = await prisma.user.create({ data: { email: 'ricky@demo.com', password, name: 'Ricky Hernandez', role: 'STAFF' } })
  const ricky = await prisma.staff.create({ data: { shopId: shop3.id, userId: rickyUser.id, name: 'Ricky Hernandez', bio: 'Beard work and line-ups. Patient with first-timers.', specialties: 'Beard sculpting,Line-ups,Buzz cuts' } })

  // Completed appointments + reviews
  const seedData: Array<{ cust: string; shop: string; svc: any; staff: any; days: number; time: string; rating: number; comment: string }> = [
    { cust: c2.id, shop: shop1.id, svc: s1Services[0], staff: marco, days: 14, time: '10:30', rating: 5, comment: 'Marco is a true master. The attention to detail is unreal.' },
    { cust: c3.id, shop: shop1.id, svc: s1Services[2], staff: marco, days: 7,  time: '14:00', rating: 5, comment: 'Best straight razor shave of my life. Patient and skilled.' },
    { cust: c4.id, shop: shop1.id, svc: s1Services[1], staff: tony,  days: 21, time: '11:15', rating: 4, comment: 'Tony is great — really focused on the details.' },
    { cust: c1.id, shop: shop1.id, svc: s1Services[3], staff: tony,  days: 12, time: '15:00', rating: 5, comment: 'Tony nailed the pompadour exactly how I described it.' },
    { cust: c2.id, shop: shop1.id, svc: s1Services[1], staff: enzo,  days: 4,  time: '12:30', rating: 4, comment: 'Quick and friendly. Got me in and out on my lunch break.' },
    { cust: c1.id, shop: shop2.id, svc: s2Services[0], staff: jasmine, days: 10, time: '13:00', rating: 5, comment: 'Jasmine is a magician with the clippers. Cleanest fade I\'ve ever had.' },
    { cust: c2.id, shop: shop2.id, svc: s2Services[1], staff: devon,   days: 5,  time: '16:30', rating: 5, comment: 'Devon really listened and gave me a cut I never thought of.' },
    { cust: c3.id, shop: shop2.id, svc: s2Services[0], staff: jasmine, days: 30, time: '11:00', rating: 4, comment: 'Great cut. Jasmine is friendly and professional.' },
    { cust: c4.id, shop: shop3.id, svc: s3Services[1], staff: carlos,  days: 3,  time: '09:30', rating: 5, comment: 'Carlos is the fade king. Quick, clean, no-nonsense.' },
    { cust: c1.id, shop: shop3.id, svc: s3Services[0], staff: carlos,  days: 18, time: '15:45', rating: 4, comment: 'Solid buzz cut. Carlos is fast and gets it right.' },
    { cust: c3.id, shop: shop3.id, svc: s3Services[2], staff: ricky,   days: 9,  time: '13:15', rating: 5, comment: 'Ricky did an amazing beard sculpt. Very patient.' },
  ]
  for (const s of seedData) {
    await prisma.appointment.create({
      data: { customerId: s.cust, shopId: s.shop, serviceId: s.svc.id, staffId: s.staff.id, date: pastDate(s.days), time: s.time, status: 'COMPLETED' },
    })
    await prisma.staffReview.create({ data: { customerId: s.cust, staffId: s.staff.id, rating: s.rating, comment: s.comment } })
  }

  // Recompute staff ratings
  for (const staff of [marco, tony, enzo, jasmine, devon, carlos, ricky]) {
    const reviews = await prisma.staffReview.findMany({ where: { staffId: staff.id } })
    if (reviews.length === 0) continue
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    await prisma.staff.update({ where: { id: staff.id }, data: { rating: Math.round(avg * 10) / 10, reviewCount: reviews.length } })
  }

  // Add a few shop-level reviews too
  const shopReviewSeed = [
    { cust: c2.id, shop: shop1.id, rating: 5, comment: 'Best old-school barbershop in the area.' },
    { cust: c3.id, shop: shop1.id, rating: 5, comment: 'Place feels timeless. Highly recommend.' },
    { cust: c1.id, shop: shop2.id, rating: 5, comment: 'Modern, clean, and the cuts are sharp.' },
    { cust: c4.id, shop: shop3.id, rating: 5, comment: 'Walk-in friendly and consistently good.' },
  ]
  for (const r of shopReviewSeed) {
    await prisma.review.create({ data: { customerId: r.cust, shopId: r.shop, rating: r.rating, comment: r.comment } })
  }
  for (const shop of [shop1, shop2, shop3]) {
    const reviews = await prisma.review.findMany({ where: { shopId: shop.id } })
    if (reviews.length === 0) continue
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    await prisma.barberShop.update({ where: { id: shop.id }, data: { rating: Math.round(avg * 10) / 10, reviewCount: reviews.length } })
  }

  console.log('✅ Seed complete')
}

main().catch((e) => { console.error('Seed failed:', e); process.exit(1) }).finally(() => prisma.$disconnect())
