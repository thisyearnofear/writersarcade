import { PrismaClient } from '@prisma/client'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

// Neon serverless driver adapter: the PrismaClient runs queries through the
// Neon JS driver. On Prisma 6.x + queryCompiler this is fully Rust-free —
// no native query-engine binary is loaded or needed in function bundles.
// `driverAdapters` + `queryCompiler` preview features are enabled in
// prisma/schema.prisma.
neonConfig.webSocketConstructor = ws

function createClient(): PrismaClient {
  // engineType "client" requires a driver adapter always — there is no
  // engine fallback. Without DATABASE_URL (build-time/test envs) use a
  // placeholder: the Neon Pool is lazy and only connects on first query.
  const connectionString =
    process.env.DATABASE_URL ?? 'postgresql://localhost:5432/writersarcade'
  // adapter-neon 6.x: PrismaNeon is a factory taking PoolConfig — it
  // creates the Pool internally on connect(). Do NOT pass a Pool instance.
  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
    log: ['query', 'error', 'warn'],
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Database connection helper
export async function connectDatabase() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

// Database disconnection helper
export async function disconnectDatabase() {
  try {
    await prisma.$disconnect()
    console.log('✅ Database disconnected')
  } catch (error) {
    console.error('❌ Database disconnection failed:', error)
  }
}

// Health check
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { healthy: true, message: 'Database is healthy' }
  } catch (error) {
    return { healthy: false, message: `Database error: ${error}` }
  }
}
