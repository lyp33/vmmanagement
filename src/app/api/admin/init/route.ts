import { NextRequest, NextResponse } from 'next/server';
import { kvStorage } from '@/lib/kv-storage';
import bcrypt from 'bcryptjs';

/**
 * Initialize default admin account
 * POST /api/admin/init
 * 
 * This endpoint creates a default admin account if no admin exists
 * For security, it should only be called once during initial setup
 */
export async function POST(request: NextRequest) {
  try {
    // Check if any admin already exists
    const allUsers = await kvStorage.findAllUsers();
    const existingAdmin = allUsers.find(user => user.role === 'ADMIN');

    if (existingAdmin) {
      return NextResponse.json(
        { 
          error: 'Admin account already exists',
          message: 'An administrator account has already been created. For security reasons, you cannot create another admin through this endpoint.'
        },
        { status: 400 }
      );
    }

    // Create default admin account
    const hashedPassword = await bcrypt.hash('Admin@123456', 10);
    
    const admin = await kvStorage.createUser({
      email: 'admin@vmmanagement.com',
      name: 'System Administrator',
      password: hashedPassword,
      role: 'ADMIN'
    });

    return NextResponse.json({
      success: true,
      message: 'Default admin account created successfully',
      admin: {
        email: admin.email,
        name: admin.name,
        role: admin.role
      },
      credentials: {
        email: 'admin@vmmanagement.com',
        password: 'Admin@123456',
        note: 'Please change this password immediately after first login'
      }
    });

  } catch (error) {
    console.error('Admin initialization error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to initialize admin account',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * Check if admin account exists
 * GET /api/admin/init
 */
export async function GET(request: NextRequest) {
  try {
    const allUsers = await kvStorage.findAllUsers();
    const adminExists = allUsers.some(user => user.role === 'ADMIN');

    return NextResponse.json({
      adminExists,
      totalUsers: allUsers.length,
      message: adminExists 
        ? 'Admin account exists' 
        : 'No admin account found. Call POST /api/admin/init to create one.'
    });

  } catch (error) {
    console.error('Admin check error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check admin status',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
