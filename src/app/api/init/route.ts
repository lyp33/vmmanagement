import { NextResponse } from 'next/server'
import { storage, getStorageType } from '@/lib/storage'

export async function POST() {
  try {
    await storage.initializeDefaultData()
    
    const storageType = getStorageType()
    
    return NextResponse.json({ 
      message: 'Database initialized successfully',
      storageType: storageType,
      defaultAdmin: {
        email: 'admin@123.com',
        password: '123456789'
      }
    })
  } catch (error) {
    console.error('Initialization error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    )
  }
}