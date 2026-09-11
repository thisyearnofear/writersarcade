import { prisma } from '../lib/database'

async function main() {
  try {
    const raw = await prisma.$queryRaw`SELECT 1 as ok`
    console.log('queryRaw OK:', JSON.stringify(raw))
  } catch (e) {
    console.log('queryRaw FAILED:', (e as Error).message.split('\n').slice(0, 3).join(' | '))
  }
  try {
    const n = await prisma.game.count()
    console.log('model count OK:', n)
  } catch (e) {
    console.log('model count FAILED:', (e as Error).message.split('\n')[0])
  }
}
main().then(() => process.exit(0))
