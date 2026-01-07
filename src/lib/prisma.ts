// Note: We use KV storage instead of Prisma
// This file exports a mock prisma object to avoid breaking existing imports
// All actual database operations should use the storage layer from @/lib/storage

// Create a mock prisma object that throws helpful errors if used
export const prisma = new Proxy({} as any, {
  get(target, prop) {
    throw new Error(
      `Prisma is not configured. This application uses KV storage instead. ` +
      `Please use the storage layer from '@/lib/storage' for database operations. ` +
      `Attempted to access: prisma.${String(prop)}`
    )
  }
})