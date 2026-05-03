import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  await prisma.barberShop.updateMany({ where: { name: "Marco's Classic Cuts" }, data: { latitude: 40.7128, longitude: -74.0060 } })
  await prisma.barberShop.updateMany({ where: { name: 'The Modern Chair' }, data: { latitude: 40.7549, longitude: -73.9840 } })
  await prisma.barberShop.updateMany({ where: { name: 'Fade Factory' }, data: { latitude: 40.7831, longitude: -73.9712 } })
  const shops = await prisma.barberShop.findMany({ select: { name: true, latitude: true, longitude: true } })
  console.log('Updated shops:', JSON.stringify(shops, null, 2))
  await prisma.$disconnect()
}
main().catch(console.error)
