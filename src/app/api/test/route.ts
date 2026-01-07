import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({ 
      message: 'API is working!',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'API test failed' },
      { status: 500 }
    )
  }
}