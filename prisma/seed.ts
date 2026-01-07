import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@vmmanagement.com' },
    update: {},
    create: {
      email: 'admin@vmmanagement.com',
      name: 'System Administrator',
      role: UserRole.ADMIN,
    },
  })

  console.log('✅ Created admin user:', adminUser.email)

  // Create regular user
  const regularPassword = await bcrypt.hash('user123', 12)
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@vmmanagement.com' },
    update: {},
    create: {
      email: 'user@vmmanagement.com',
      name: 'Regular User',
      role: UserRole.USER,
    },
  })

  console.log('✅ Created regular user:', regularUser.email)

  // Create sample projects
  const project1 = await prisma.project.upsert({
    where: { name: 'Web Development Project' },
    update: {},
    create: {
      name: 'Web Development Project',
      description: 'Frontend and backend development for client applications',
    },
  })

  const project2 = await prisma.project.upsert({
    where: { name: 'Data Analytics Project' },
    update: {},
    create: {
      name: 'Data Analytics Project',
      description: 'Big data processing and analytics infrastructure',
    },
  })

  const project3 = await prisma.project.upsert({
    where: { name: 'Mobile App Development' },
    update: {},
    create: {
      name: 'Mobile App Development',
      description: 'iOS and Android application development',
    },
  })

  console.log('✅ Created sample projects:', [project1.name, project2.name, project3.name])

  // Assign regular user to projects
  await prisma.projectAssignment.upsert({
    where: {
      userId_projectId: {
        userId: regularUser.id,
        projectId: project1.id,
      },
    },
    update: {},
    create: {
      userId: regularUser.id,
      projectId: project1.id,
    },
  })

  await prisma.projectAssignment.upsert({
    where: {
      userId_projectId: {
        userId: regularUser.id,
        projectId: project2.id,
      },
    },
    update: {},
    create: {
      userId: regularUser.id,
      projectId: project2.id,
    },
  })

  console.log('✅ Assigned regular user to projects')

  // Create sample VM records
  const currentDate = new Date()
  const futureDate = new Date()
  futureDate.setDate(currentDate.getDate() + 30) // 30 days from now

  const expiringDate = new Date()
  expiringDate.setDate(currentDate.getDate() + 7) // 7 days from now (for testing notifications)

  const vm1 = await prisma.vMRecord.create({
    data: {
      email: 'partner1@example.com',
      vmAccount: 'vm-web-001',
      vmInternalIP: '192.168.1.10',
      vmDomain: 'web-dev-001.internal',
      currentExpiryDate: futureDate,
      projectId: project1.id,
      createdBy: adminUser.id,
    },
  })

  const vm2 = await prisma.vMRecord.create({
    data: {
      email: 'partner2@example.com',
      vmAccount: 'vm-analytics-001',
      vmInternalIP: '192.168.1.20',
      vmDomain: 'analytics-001.internal',
      currentExpiryDate: expiringDate, // This will trigger notification
      projectId: project2.id,
      createdBy: adminUser.id,
    },
  })

  const vm3 = await prisma.vMRecord.create({
    data: {
      email: 'partner3@example.com',
      vmAccount: 'vm-mobile-001',
      vmInternalIP: '192.168.1.30',
      vmDomain: 'mobile-dev-001.internal',
      currentExpiryDate: futureDate,
      projectId: project3.id,
      createdBy: adminUser.id,
    },
  })

  console.log('✅ Created sample VM records:', [vm1.vmAccount, vm2.vmAccount, vm3.vmAccount])

  // Create sample audit log entries
  await prisma.auditLog.create({
    data: {
      operation: 'CREATE',
      entityType: 'VMRecord',
      entityId: vm1.id,
      userId: adminUser.id,
      userEmail: adminUser.email,
      changes: JSON.stringify({
        action: 'VM record created',
        vmAccount: vm1.vmAccount,
        project: project1.name,
      }),
    },
  })

  await prisma.auditLog.create({
    data: {
      operation: 'CREATE',
      entityType: 'VMRecord',
      entityId: vm2.id,
      userId: adminUser.id,
      userEmail: adminUser.email,
      changes: JSON.stringify({
        action: 'VM record created',
        vmAccount: vm2.vmAccount,
        project: project2.name,
      }),
    },
  })

  console.log('✅ Created sample audit log entries')

  console.log('🎉 Database seed completed successfully!')
  console.log('\n📋 Seed Summary:')
  console.log('- Admin user: admin@vmmanagement.com (password: admin123)')
  console.log('- Regular user: user@vmmanagement.com (password: user123)')
  console.log('- 3 sample projects created')
  console.log('- 3 sample VM records created')
  console.log('- Regular user assigned to 2 projects')
  console.log('- Sample audit log entries created')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })