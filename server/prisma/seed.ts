import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const password = await bcrypt.hash('password123', 10)

  // Demo customer
  const customer = await prisma.user.upsert({
    where: { email: 'customer@demo.com' },
    update: {},
    create: {
      email: 'customer@demo.com',
      password,
      name: 'Alex Customer',
      phone: '+1 555 0100',
      role: 'CUSTOMER',
    },
  })
  console.log('Customer:', customer.email, '/ password123')

  // Shop 1
  const barber1 = await prisma.user.upsert({
    where: { email: 'barber1@demo.com' },
    update: {},
    create: {
      email: 'barber1@demo.com',
      password,
      name: 'Marco Rossi',
      phone: '+1 555 0200',
      role: 'BARBER',
    },
  })

  const shop1 = await prisma.barberShop.upsert({
    where: { ownerId: barber1.id },
    update: {},
    create: {
      ownerId: barber1.id,
      name: "Marco's Classic Cuts",
      address: '123 Main St, Downtown',
      description: 'Classic gentleman\'s barbershop with old-school style and modern technique. Hot towel shaves a specialty.',
      phone: '+1 555 0200',
      openingTime: '09:00',
      closingTime: '19:00',
      rating: 4.7,
      reviewCount: 42,
      latitude: 40.7128,   // Lower Manhattan
      longitude: -74.0060,
    },
  })

  await prisma.service.deleteMany({ where: { shopId: shop1.id } })
  await prisma.service.createMany({
    data: [
      { shopId: shop1.id, name: 'Classic Haircut', description: 'Traditional scissor cut with styling', price: 30, duration: 30 },
      { shopId: shop1.id, name: 'Beard Trim', description: 'Shape and trim with hot towel finish', price: 18, duration: 20 },
      { shopId: shop1.id, name: 'Hot Towel Shave', description: 'Full straight-razor shave with hot towels', price: 35, duration: 45 },
      { shopId: shop1.id, name: 'Haircut + Beard', description: 'The complete grooming package', price: 45, duration: 50 },
    ],
  })

  await prisma.offer.deleteMany({ where: { shopId: shop1.id } })
  await prisma.offer.create({
    data: {
      shopId: shop1.id,
      title: 'Tuesday Special',
      description: '20% off all services every Tuesday',
      discountPercent: 20,
    },
  })

  console.log('Shop 1:', shop1.name, '- barber1@demo.com / password123')

  // Shop 2
  const barber2 = await prisma.user.upsert({
    where: { email: 'barber2@demo.com' },
    update: {},
    create: {
      email: 'barber2@demo.com',
      password,
      name: 'Jasmine Lee',
      phone: '+1 555 0300',
      role: 'BARBER',
    },
  })

  const shop2 = await prisma.barberShop.upsert({
    where: { ownerId: barber2.id },
    update: {},
    create: {
      ownerId: barber2.id,
      name: 'The Modern Chair',
      address: '456 Park Ave, Midtown',
      description: 'Contemporary studio offering precision cuts, fades, and creative styling.',
      phone: '+1 555 0300',
      openingTime: '10:00',
      closingTime: '20:00',
      rating: 4.9,
      reviewCount: 87,
      latitude: 40.7549,   // Midtown Manhattan
      longitude: -73.9840,
    },
  })

  await prisma.service.deleteMany({ where: { shopId: shop2.id } })
  await prisma.service.createMany({
    data: [
      { shopId: shop2.id, name: 'Skin Fade', description: 'Sharp, precise fade with detailed line-up', price: 40, duration: 40 },
      { shopId: shop2.id, name: 'Designer Cut', description: 'Custom styling consultation included', price: 55, duration: 60 },
      { shopId: shop2.id, name: 'Kids Cut (under 12)', description: 'Quick, fun cut for kids', price: 22, duration: 25 },
    ],
  })

  console.log('Shop 2:', shop2.name, '- barber2@demo.com / password123')

  // Shop 3
  const barber3 = await prisma.user.upsert({
    where: { email: 'barber3@demo.com' },
    update: {},
    create: {
      email: 'barber3@demo.com',
      password,
      name: 'Carlos Mendez',
      phone: '+1 555 0400',
      role: 'BARBER',
    },
  })

  const shop3 = await prisma.barberShop.upsert({
    where: { ownerId: barber3.id },
    update: {},
    create: {
      ownerId: barber3.id,
      name: 'Fade Factory',
      address: '789 Oak Blvd, Westside',
      description: 'Specializing in fades, tapers, and trendy modern styles. Walk-ins welcome.',
      phone: '+1 555 0400',
      openingTime: '08:00',
      closingTime: '18:00',
      rating: 4.5,
      reviewCount: 31,
      latitude: 40.7831,   // Upper West Side
      longitude: -73.9712,
    },
  })

  await prisma.service.deleteMany({ where: { shopId: shop3.id } })
  await prisma.service.createMany({
    data: [
      { shopId: shop3.id, name: 'Buzz Cut', description: 'Fast and clean', price: 20, duration: 15 },
      { shopId: shop3.id, name: 'Mid Fade', description: 'Classic mid fade with scissor work on top', price: 35, duration: 35 },
      { shopId: shop3.id, name: 'Beard Sculpt', description: 'Detailed beard shaping and line-up', price: 25, duration: 25 },
    ],
  })

  console.log('Shop 3:', shop3.name, '- barber3@demo.com / password123')
  console.log('\nSeeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
